#!/usr/bin/env node
// git-file-fetch
// Fetch specific file(s) from remote Git repos and drop them into your project.
// Tracks origin in .git-remote-files.json for reproducibility.
const VERSION = '0.2.0';
const SUBCOMMANDS = ['update', 'verify', 'list'];
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, dirname, resolve, sep, posix as pathPosix } from 'path';
import { tmpdir } from 'os';
const defaultManifestFile = '.git-remote-files.json';
const defaultMaxBytes = 10_000_000; // ~10 MB
class CliError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'CliError';
    }
}
function redactSecrets(input) {
    // Redact userinfo credentials in URLs like https://user:token@host/
    return input.replace(/:\/\/[^@\s]+@/g, '://***@');
}
function createLogger(quiet, verbose) {
    return {
        log: (message) => {
            if (!quiet)
                console.log(redactSecrets(message));
        },
        warn: (message) => {
            if (!quiet)
                console.warn(redactSecrets(message));
        },
        error: (message) => {
            console.error(redactSecrets(message));
        },
        verbose: (message) => {
            if (!quiet && verbose)
                console.log(redactSecrets(message));
        },
    };
}
function printHelp(command) {
    if (command === 'update') {
        const usage = `
git-file-fetch update v${VERSION}

Re-fetch all files tracked in the manifest, updating them to the latest commit on their recorded refs.

Usage:
  git-file-fetch update [--dry-run] [--filter <pattern>] [--manifest <path>] [--json] [--quiet] [--verbose]

Options:
  --dry-run           Show what would be updated without making changes
  --filter <pattern>  Only update entries matching pattern (repo URL or file path)
  --manifest <p>      Path to manifest file (defaults to ./${defaultManifestFile})
  --json              Machine-readable JSON output
  --quiet             Suppress normal logs (errors still printed)
  --verbose           Print verbose logs for debugging
  -h, --help          Show this help and exit

Examples:
  git-file-fetch update                          # Update all manifest entries
  git-file-fetch update --dry-run                # Preview updates
  git-file-fetch update --filter github.com/user # Update only matching repos

Exit codes:
  0  All updates succeeded (or no changes needed)
  1  One or more updates failed
`;
        console.log(usage.trim());
        return;
    }
    if (command === 'verify') {
        const usage = `
git-file-fetch verify v${VERSION}

Compare local files against their recorded sources in the manifest. Useful for CI to detect drift.

Usage:
  git-file-fetch verify [--changed-only] [--manifest <path>] [--json] [--quiet] [--verbose]

Options:
  --changed-only      Only show files that differ (suppress matches)
  --manifest <p>      Path to manifest file (defaults to ./${defaultManifestFile})
  --json              Machine-readable JSON output
  --quiet             Suppress normal logs (errors still printed)
  --verbose           Print verbose logs for debugging
  -h, --help          Show this help and exit

Examples:
  git-file-fetch verify                # Check all manifest entries
  git-file-fetch verify --changed-only # Show only mismatches
  git-file-fetch verify --json         # JSON output for CI

Exit codes:
  0  All files match their recorded sources
  1  One or more files differ or are missing
`;
        console.log(usage.trim());
        return;
    }
    if (command === 'list') {
        const usage = `
git-file-fetch list v${VERSION}

List all files tracked in the manifest.

Usage:
  git-file-fetch list [--manifest <path>] [--json] [--quiet]

Options:
  --manifest <p>      Path to manifest file (defaults to ./${defaultManifestFile})
  --json              Machine-readable JSON output
  --quiet             Only output file paths (one per line)
  -h, --help          Show this help and exit

Examples:
  git-file-fetch list              # List all tracked files
  git-file-fetch list --json       # JSON output
  git-file-fetch list --quiet      # Just file paths

Exit codes:
  0  Success
  1  Manifest not found or invalid
`;
        console.log(usage.trim());
        return;
    }
    const usage = `
git-file-fetch v${VERSION}

Fetch individual files from remote Git repositories and track them locally.

Usage:
  git-file-fetch '<repo.git>@<ref>:<path>' [more...] [options]
  git-file-fetch <command> [options]

Commands:
  update              Re-fetch all manifest entries to latest commits
  verify              Check if local files match their remote sources
  list                List all files tracked in manifest

Fetch Options:
  --dry-run           Simulate only; do not write files or update the manifest
  --force             Overwrite existing local files when present
  --out <dir>         Output directory for fetched files (defaults to cwd)
  --cwd <dir>         Change working directory before running
  --manifest <p>      Path to manifest file (defaults to ./${defaultManifestFile})
  --max-bytes <n>     Maximum allowed file size in bytes. Default: ${defaultMaxBytes}
  --config <file>     JSON file with an array of refs to fetch
  --timeout-ms <n>    Timeout for git operations in ms. Default: 60000
  --retries <n>       Number of retries for transient failures. Default: 2
  --eject             Do not update the manifest; write files only
  --json              Machine-readable JSON output
  --quiet             Suppress normal logs (errors still printed)
  --verbose           Print verbose logs for debugging
  -v, --version       Show version number and exit
  -h, --help          Show this help and exit

Examples:
  git-file-fetch "https://github.com/user/repo.git@main:src/utils.ts"
  git-file-fetch "https://github.com/user/repo.git@v1.2.3:LICENSE" --force
  git-file-fetch update --dry-run
  git-file-fetch verify --changed-only
  git-file-fetch list --json

Exit codes:
  0  Success
  1  One or more operations failed
  2  Invalid usage
`;
    console.log(usage.trim());
}
function normalizeAndValidateRelativePath(inputPath) {
    // Convert backslashes to POSIX forward slashes for consistency
    const forward = inputPath.replace(/\\/g, '/');
    const normalized = pathPosix.normalize(forward);
    if (normalized.startsWith('..') || normalized.includes('/../') || normalized === '..') {
        throw new CliError('INVALID_PATH', `Invalid path '${inputPath}': parent directory traversal is not allowed.`);
    }
    if (normalized.startsWith('/') || normalized.startsWith('~')) {
        throw new CliError('INVALID_PATH', `Invalid path '${inputPath}': absolute paths are not allowed.`);
    }
    if (normalized.includes('\0')) {
        throw new CliError('INVALID_PATH', `Invalid path '${inputPath}': null byte is not allowed.`);
    }
    return normalized;
}
function parseRef(input) {
    // Format: https://github.com/user/repo.git@branch:path/to/file
    const idx = input.lastIndexOf(':');
    if (idx === -1) {
        throw new CliError('INVALID_REF_FORMAT', `Invalid ref '${input}'. Expected '<repo.git>@<ref>:<path>'`);
    }
    const repoRef = input.slice(0, idx);
    const filePathRaw = input.slice(idx + 1);
    const at = repoRef.lastIndexOf('@');
    const repo = at === -1 ? repoRef : repoRef.slice(0, at);
    const ref = at === -1 ? 'main' : repoRef.slice(at + 1);
    const safeRelPath = normalizeAndValidateRelativePath(filePathRaw);
    // Convert POSIX path to platform-specific by splitting
    const destPath = safeRelPath.split('/').join(sep);
    return { repo, ref, filePath: safeRelPath, destPath };
}
function ensureDirFor(filePath) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}
function runGitWithRetry(args, opts) {
    const { cwd, timeoutMs, retries, backoffMs, logger } = opts;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return execFileSync('git', args, { stdio: 'pipe', cwd, timeout: timeoutMs });
        }
        catch (e) {
            lastError = e;
            if (attempt < retries) {
                const delay = backoffMs * Math.pow(2, attempt);
                logger.warn(`git ${args.join(' ')} failed (attempt ${attempt + 1} of ${retries + 1}). Retrying in ${delay}ms...`);
                // Use blocking approach with busy wait for synchronous compatibility
                const start = Date.now();
                while (Date.now() - start < delay) {
                    // Busy wait - not ideal but maintains sync interface
                }
                continue;
            }
            break;
        }
    }
    throw lastError instanceof Error
        ? new CliError('GIT_COMMAND_FAILED', lastError.message)
        : new CliError('GIT_COMMAND_FAILED', String(lastError));
}
function readManifest(manifestPath) {
    if (!existsSync(manifestPath))
        return [];
    const text = readFileSync(manifestPath, 'utf-8');
    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function updateManifest(manifestPath, remote) {
    const existing = readManifest(manifestPath);
    existing.push(remote);
    ensureDirFor(manifestPath);
    writeFileSync(manifestPath, JSON.stringify(existing, null, 2));
}
function fsTempDir() {
    const dir = join(tmpdir(), `git-file-fetch-${Date.now()}`);
    mkdirSync(dir);
    return dir;
}
function getFlagValue(args, name) {
    const long = `--${name}`;
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === long) {
            const next = args[i + 1];
            if (next && !next.startsWith('--'))
                return next;
            return '';
        }
        if (a.startsWith(`${long}=`)) {
            return a.slice(long.length + 1);
        }
    }
    return undefined;
}
function loadConfigFile(configPath) {
    const absolute = resolve(configPath);
    if (!existsSync(absolute)) {
        throw new CliError('CONFIG_NOT_FOUND', `Config file not found: ${configPath}`);
    }
    const text = readFileSync(absolute, 'utf-8');
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new CliError('CONFIG_PARSE_ERROR', `Failed to parse JSON config at ${configPath}: ${msg}`);
    }
    if (!Array.isArray(parsed)) {
        throw new CliError('CONFIG_INVALID', 'Config must be a JSON array of strings or objects');
    }
    const out = [];
    for (const item of parsed) {
        if (typeof item === 'string') {
            out.push(item);
        }
        else if (item && typeof item === 'object') {
            const anyItem = item;
            const repoVal = anyItem.repo;
            const refVal = anyItem.ref ?? 'main';
            const pathVal = anyItem.path ?? anyItem.filePath;
            const destVal = anyItem.dest ?? anyItem.destPath;
            if (typeof repoVal !== 'string' || typeof pathVal !== 'string') {
                throw new CliError('CONFIG_INVALID', 'Object entries must include string fields { repo, path }');
            }
            const repo = repoVal;
            const ref = typeof refVal === 'string' ? refVal : 'main';
            const path = pathVal;
            const spec = `${repo}@${ref}:${path}`;
            out.push(spec);
            void destVal;
        }
        else {
            throw new CliError('CONFIG_INVALID', 'Unsupported config item type');
        }
    }
    return out;
}
function collectPositionalArgs(argv) {
    const flagsWithValues = [
        'out',
        'cwd',
        'manifest',
        'max-bytes',
        'config',
        'timeout-ms',
        'retries',
        'retry-backoff-ms',
        'filter',
    ];
    const skip = new Set();
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--'))
            continue;
        let name = '';
        const eqIdx = a.indexOf('=');
        if (eqIdx >= 0) {
            name = a.slice(2, eqIdx);
        }
        else {
            name = a.slice(2);
        }
        if (flagsWithValues.includes(name)) {
            // Always skip the flag token
            skip.add(i);
            // If it is not an equals form, skip the next value token if present
            if (eqIdx === -1 && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
                skip.add(i + 1);
            }
        }
        else {
            // Flag without value
            skip.add(i);
        }
    }
    const positionals = [];
    for (let i = 0; i < argv.length; i++) {
        if (!skip.has(i)) {
            positionals.push(argv[i]);
        }
    }
    return positionals;
}
function writeDestFile(contents, remote, destRootDir, dryRun, force, maxBytes, logger) {
    const destFile = resolve(destRootDir, remote.destPath);
    const resolvedBase = resolve(destRootDir);
    const resolvedDest = resolve(destFile);
    if (!resolvedDest.startsWith(resolvedBase + sep) && resolvedDest !== resolvedBase) {
        throw new CliError('DEST_OUT_OF_BOUNDS', `Destination escapes output directory: '${remote.destPath}'`);
    }
    if (contents.length > maxBytes) {
        throw new CliError('FILE_TOO_LARGE', `Source file '${remote.filePath}' is too large (${contents.length} bytes). Limit is ${maxBytes} bytes. Use --max-bytes to adjust.`);
    }
    if (existsSync(destFile) && !force) {
        logger.warn(`Skipping existing '${destFile}'. Use --force to overwrite.`);
        return { destFile, wrote: false };
    }
    if (!dryRun) {
        ensureDirFor(destFile);
        writeFileSync(destFile, contents);
    }
    logger.log(`Fetched ${remote.filePath} from ${remote.repo}@${remote.ref} -> ${destFile}`);
    return { destFile, wrote: !dryRun };
}
function fetchFileMinimal(remote, tempDir, timeoutMs, retries, backoffMs, logger) {
    const repoDir = join(tempDir, 'repo');
    mkdirSync(repoDir, { recursive: true });
    logger.verbose(`Shallow fetch of ${remote.repo}@${remote.ref} without checkout (git fetch + git show)`);
    // Initialize repo
    runGitWithRetry(['init', '-q'], {
        cwd: repoDir,
        timeoutMs,
        retries,
        backoffMs,
        logger,
    });
    runGitWithRetry(['remote', 'add', 'origin', remote.repo], {
        cwd: repoDir,
        timeoutMs,
        retries,
        backoffMs,
        logger,
    });
    // Fetch only the ref with depth 1
    runGitWithRetry(['fetch', '--depth', '1', 'origin', remote.ref], {
        cwd: repoDir,
        timeoutMs,
        retries,
        backoffMs,
        logger,
    });
    const sha = runGitWithRetry(['rev-parse', 'FETCH_HEAD'], {
        cwd: repoDir,
        timeoutMs,
        retries,
        backoffMs,
        logger,
    })
        .toString()
        .trim();
    // Show the file contents at that commit
    let contents;
    try {
        contents = runGitWithRetry(['show', `${sha}:${remote.filePath}`], {
            cwd: repoDir,
            timeoutMs,
            retries,
            backoffMs,
            logger,
        });
    }
    catch (e) {
        // If path missing, throw a clearer error
        const msg = e instanceof Error ? e.message : String(e);
        throw new CliError('SOURCE_FILE_NOT_FOUND', `Source file '${remote.filePath}' not found in ${redactSecrets(`${remote.repo}@${remote.ref}`)} (${msg})`);
    }
    return { contents, commitSha: sha };
}
function fetchFileAtSha(remote, sha, tempDir, timeoutMs, retries, backoffMs, logger) {
    const repoDir = join(tempDir, 'repo');
    mkdirSync(repoDir, { recursive: true });
    logger.verbose(`Fetching ${remote.filePath} at SHA ${sha.slice(0, 8)}`);
    runGitWithRetry(['init', '-q'], { cwd: repoDir, timeoutMs, retries, backoffMs, logger });
    runGitWithRetry(['remote', 'add', 'origin', remote.repo], {
        cwd: repoDir,
        timeoutMs,
        retries,
        backoffMs,
        logger,
    });
    // Fetch the specific SHA
    runGitWithRetry(['fetch', '--depth', '1', 'origin', sha], {
        cwd: repoDir,
        timeoutMs,
        retries,
        backoffMs,
        logger,
    });
    return runGitWithRetry(['show', `${sha}:${remote.filePath}`], {
        cwd: repoDir,
        timeoutMs,
        retries,
        backoffMs,
        logger,
    });
}
function writeManifest(manifestPath, entries) {
    ensureDirFor(manifestPath);
    writeFileSync(manifestPath, JSON.stringify(entries, null, 2));
}
function runUpdate(manifestPath, filter, dryRun, timeoutMs, retries, backoffMs, logger) {
    const manifest = readManifest(manifestPath);
    if (manifest.length === 0) {
        logger.warn(`No entries in manifest: ${manifestPath}`);
        return [];
    }
    const filtered = filter
        ? manifest.filter((e) => e.repo.includes(filter) || e.destPath.includes(filter))
        : manifest;
    if (filtered.length === 0) {
        logger.warn(`No entries match filter: ${filter}`);
        return [];
    }
    const results = [];
    const updatedManifest = [...manifest];
    for (const entry of filtered) {
        const tempDir = fsTempDir();
        try {
            const { contents, commitSha } = fetchFileMinimal(entry, tempDir, timeoutMs, retries, backoffMs, logger);
            const oldSha = entry.commitSha;
            const isChanged = oldSha !== commitSha;
            if (isChanged) {
                if (!dryRun) {
                    const destFile = resolve(process.cwd(), entry.destPath);
                    ensureDirFor(destFile);
                    writeFileSync(destFile, contents);
                    // Update manifest entry
                    const idx = updatedManifest.findIndex((e) => e.repo === entry.repo && e.destPath === entry.destPath);
                    if (idx !== -1) {
                        updatedManifest[idx] = { ...entry, commitSha };
                    }
                }
                logger.log(`${dryRun ? '[dry-run] ' : ''}Updated ${entry.destPath} (${oldSha?.slice(0, 8) ?? 'unknown'} -> ${commitSha.slice(0, 8)})`);
                results.push({
                    destPath: entry.destPath,
                    success: true,
                    status: 'updated',
                    oldCommitSha: oldSha,
                    newCommitSha: commitSha,
                });
            }
            else {
                logger.verbose(`Unchanged ${entry.destPath} (${commitSha.slice(0, 8)})`);
                results.push({
                    destPath: entry.destPath,
                    success: true,
                    status: 'unchanged',
                    oldCommitSha: oldSha,
                    newCommitSha: commitSha,
                });
            }
        }
        catch (e) {
            const code = e instanceof CliError ? e.code : 'UNKNOWN_ERROR';
            const message = e instanceof Error ? e.message : String(e);
            logger.error(`Error updating ${entry.destPath}: ${code}: ${message}`);
            results.push({
                destPath: entry.destPath,
                success: false,
                status: 'error',
                errorCode: code,
                errorMessage: message,
            });
        }
        finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
    // Write updated manifest
    if (!dryRun && results.some((r) => r.status === 'updated')) {
        writeManifest(manifestPath, updatedManifest);
    }
    return results;
}
function runVerify(manifestPath, changedOnly, timeoutMs, retries, backoffMs, logger) {
    const manifest = readManifest(manifestPath);
    if (manifest.length === 0) {
        logger.warn(`No entries in manifest: ${manifestPath}`);
        return [];
    }
    const results = [];
    for (const entry of manifest) {
        const localPath = resolve(process.cwd(), entry.destPath);
        // Check if local file exists
        if (!existsSync(localPath)) {
            logger.log(`MISSING  ${entry.destPath} (local file not found)`);
            results.push({ destPath: entry.destPath, status: 'missing-local' });
            continue;
        }
        // Check if we have a recorded SHA
        if (!entry.commitSha) {
            logger.warn(`No recorded SHA for ${entry.destPath}, skipping verify`);
            results.push({
                destPath: entry.destPath,
                status: 'error',
                errorCode: 'NO_SHA',
                errorMessage: 'No commit SHA recorded in manifest',
            });
            continue;
        }
        const tempDir = fsTempDir();
        try {
            const remoteContents = fetchFileAtSha(entry, entry.commitSha, tempDir, timeoutMs, retries, backoffMs, logger);
            const localContents = readFileSync(localPath);
            if (Buffer.compare(localContents, remoteContents) === 0) {
                if (!changedOnly) {
                    logger.log(`MATCH    ${entry.destPath}`);
                }
                results.push({ destPath: entry.destPath, status: 'match' });
            }
            else {
                logger.log(`MISMATCH ${entry.destPath}`);
                results.push({ destPath: entry.destPath, status: 'mismatch' });
            }
        }
        catch (e) {
            const code = e instanceof CliError ? e.code : 'UNKNOWN_ERROR';
            const message = e instanceof Error ? e.message : String(e);
            if (code === 'GIT_COMMAND_FAILED' && message.includes('not a tree object')) {
                logger.log(`MISSING  ${entry.destPath} (remote SHA not found - repo may have force-pushed)`);
                results.push({ destPath: entry.destPath, status: 'missing-remote' });
            }
            else {
                logger.error(`Error verifying ${entry.destPath}: ${code}: ${message}`);
                results.push({
                    destPath: entry.destPath,
                    status: 'error',
                    errorCode: code,
                    errorMessage: message,
                });
            }
        }
        finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
    return results;
}
function runList(manifestPath, jsonOutput, quiet, logger) {
    const manifest = readManifest(manifestPath);
    if (manifest.length === 0) {
        if (!jsonOutput && !quiet) {
            logger.warn(`No entries in manifest: ${manifestPath}`);
        }
        return manifest;
    }
    if (!jsonOutput) {
        if (quiet) {
            for (const entry of manifest) {
                console.log(entry.destPath);
            }
        }
        else {
            for (const entry of manifest) {
                const sha = entry.commitSha ? entry.commitSha.slice(0, 8) : 'unknown';
                logger.log(`${entry.destPath}  ${entry.repo}@${entry.ref} (${sha})`);
            }
        }
    }
    return manifest;
}
function main() {
    const argv = process.argv.slice(2);
    const showVersion = argv.includes('-v') || argv.includes('--version');
    const jsonOutput = argv.includes('--json');
    const quietFlag = argv.includes('--quiet');
    const verboseFlag = argv.includes('--verbose');
    const quiet = jsonOutput ? true : quietFlag;
    const logger = createLogger(quiet, verboseFlag);
    if (showVersion) {
        console.log(VERSION);
        process.exit(0);
    }
    // Detect subcommand
    const positionalArgs = collectPositionalArgs(argv);
    const firstArg = positionalArgs[0];
    const command = SUBCOMMANDS.includes(firstArg)
        ? firstArg
        : 'fetch';
    const showHelp = argv.includes('-h') || argv.includes('--help');
    if (showHelp) {
        printHelp(command === 'fetch' ? undefined : command);
        process.exit(0);
    }
    // Handle cwd flag early
    const cwdFlag = getFlagValue(argv, 'cwd');
    if (cwdFlag && cwdFlag.length > 0) {
        process.chdir(cwdFlag);
    }
    const outDirFlag = getFlagValue(argv, 'out');
    const destRootDir = outDirFlag && outDirFlag.length > 0 ? resolve(outDirFlag) : process.cwd();
    const manifestFlag = getFlagValue(argv, 'manifest');
    const manifestPath = manifestFlag && manifestFlag.length > 0
        ? resolve(manifestFlag)
        : resolve(destRootDir, defaultManifestFile);
    // Timing options
    const timeoutMsFlag = getFlagValue(argv, 'timeout-ms');
    const envTimeout = process.env.FETCH_GIT_FILE_TIMEOUT_MS
        ? parseInt(process.env.FETCH_GIT_FILE_TIMEOUT_MS, 10)
        : undefined;
    const timeoutMs = timeoutMsFlag && timeoutMsFlag.length > 0 && !Number.isNaN(Number(timeoutMsFlag))
        ? parseInt(timeoutMsFlag, 10)
        : (envTimeout ?? 60_000);
    const retriesFlag = getFlagValue(argv, 'retries');
    const envRetries = process.env.FETCH_GIT_FILE_RETRIES
        ? parseInt(process.env.FETCH_GIT_FILE_RETRIES, 10)
        : undefined;
    const retries = retriesFlag && retriesFlag.length > 0 && !Number.isNaN(Number(retriesFlag))
        ? parseInt(retriesFlag, 10)
        : typeof envRetries === 'number' && Number.isFinite(envRetries)
            ? envRetries
            : 2;
    const backoffFlag = getFlagValue(argv, 'retry-backoff-ms');
    const envBackoff = process.env.FETCH_GIT_FILE_RETRY_BACKOFF_MS
        ? parseInt(process.env.FETCH_GIT_FILE_RETRY_BACKOFF_MS, 10)
        : undefined;
    const backoffMs = backoffFlag && backoffFlag.length > 0 && !Number.isNaN(Number(backoffFlag))
        ? parseInt(backoffFlag, 10)
        : (envBackoff ?? 500);
    // Handle subcommands
    if (command === 'update') {
        const dryRun = argv.includes('--dry-run');
        const filter = getFlagValue(argv, 'filter');
        const results = runUpdate(manifestPath, filter, dryRun, timeoutMs, retries, backoffMs, logger);
        if (jsonOutput) {
            console.log(JSON.stringify({ command: 'update', results }, null, 2));
        }
        const hasErrors = results.some((r) => r.status === 'error');
        if (hasErrors) {
            process.exitCode = 1;
        }
        return;
    }
    if (command === 'verify') {
        const changedOnly = argv.includes('--changed-only');
        const results = runVerify(manifestPath, changedOnly, timeoutMs, retries, backoffMs, logger);
        if (jsonOutput) {
            console.log(JSON.stringify({ command: 'verify', results }, null, 2));
        }
        const hasIssues = results.some((r) => r.status === 'mismatch' || r.status === 'missing-local' || r.status === 'error');
        if (hasIssues) {
            process.exitCode = 1;
        }
        return;
    }
    if (command === 'list') {
        const entries = runList(manifestPath, jsonOutput, quietFlag, logger);
        if (jsonOutput) {
            console.log(JSON.stringify({ command: 'list', entries }, null, 2));
        }
        return;
    }
    // Default: fetch command
    const dryRun = argv.includes('--dry-run');
    const force = argv.includes('--force');
    const eject = argv.includes('--eject') || argv.includes('--no-manifest');
    const maxBytesFlag = getFlagValue(argv, 'max-bytes');
    const envMax = process.env.FETCH_GIT_FILE_MAX_BYTES
        ? parseInt(process.env.FETCH_GIT_FILE_MAX_BYTES, 10)
        : undefined;
    const hasMaxFlag = typeof maxBytesFlag === 'string' &&
        maxBytesFlag.length > 0 &&
        !Number.isNaN(Number(maxBytesFlag));
    const maxBytes = hasMaxFlag ? parseInt(maxBytesFlag, 10) : (envMax ?? defaultMaxBytes);
    const configFlag = getFlagValue(argv, 'config');
    let entries = [...positionalArgs];
    if (configFlag && configFlag.length > 0) {
        try {
            const configEntries = loadConfigFile(configFlag);
            entries = entries.concat(configEntries);
        }
        catch (e) {
            const errMessage = e instanceof Error ? e.message : String(e);
            const code = e instanceof CliError ? e.code : 'CONFIG_ERROR';
            logger.error(`Error: ${code}: ${errMessage}`);
            process.exit(1);
        }
    }
    if (entries.length === 0) {
        printHelp();
        process.exit(2);
    }
    const results = [];
    for (const arg of entries) {
        const tempDir = fsTempDir();
        try {
            const remote = parseRef(arg);
            const { contents, commitSha } = fetchFileMinimal(remote, tempDir, timeoutMs, retries, backoffMs, logger);
            remote.commitSha = commitSha;
            const result = writeDestFile(contents, remote, destRootDir, dryRun, force, maxBytes, logger);
            if (!dryRun && result.wrote && !eject) {
                updateManifest(manifestPath, remote);
            }
            results.push({ input: arg, success: true, destFile: result.destFile, remote });
        }
        catch (e) {
            const code = e instanceof CliError ? e.code : 'UNKNOWN_ERROR';
            const message = e instanceof Error ? e.message : String(e);
            logger.error(`Error: ${code}: ${message}`);
            results.push({ input: arg, success: false, errorCode: String(code), errorMessage: message });
            process.exitCode = 1;
        }
        finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
    if (jsonOutput) {
        console.log(JSON.stringify({ command: 'fetch', results }, null, 2));
    }
}
main();
