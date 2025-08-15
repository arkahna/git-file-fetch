#!/usr/bin/env node

// @arkahna/git-file-fetch
// Fetch specific file(s) from remote Git repos and drop them into your project.
// Tracks origin in .git-remote-files.json for reproducibility.

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, dirname, resolve, sep, posix as pathPosix } from 'path';
import { tmpdir } from 'os';

const defaultManifestFile = '.git-remote-files.json';
const defaultMaxBytes = 10_000_000; // ~10 MB

interface RemoteFile {
  repo: string;
  ref: string;
  filePath: string;
  destPath: string;
  commitSha?: string;
  comment?: string;
}

interface FetchResult {
  input: string;
  success: boolean;
  destFile?: string;
  errorCode?: string;
  errorMessage?: string;
  remote?: RemoteFile;
}

class CliError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'CliError';
  }
}

function redactSecrets(input: string): string {
  // Redact userinfo credentials in URLs like https://user:token@host/
  return input.replace(/:\/\/[^@\s]+@/g, '://***@');
}

function createLogger(quiet: boolean, verbose: boolean) {
  return {
    log: (message: string) => {
      if (!quiet) console.log(redactSecrets(message));
    },
    warn: (message: string) => {
      if (!quiet) console.warn(redactSecrets(message));
    },
    error: (message: string) => {
      console.error(redactSecrets(message));
    },
    verbose: (message: string) => {
      if (!quiet && verbose) console.log(redactSecrets(message));
    },
  };
}

function printHelp() {
  const usage = `
@arkahna/git-file-fetch

Usage:
  @arkahna/git-file-fetch '<repo.git>@<ref>:<path>' [more...] [--dry-run] [--force] [--out <dir>] [--cwd <dir>] [--manifest <path>] [--max-bytes <n>] [--config <file>] [--timeout-ms <n>] [--retries <n>] [--retry-backoff-ms <n>] [--eject] [--json] [--quiet] [--verbose]

Options:
  --dry-run           Simulate only; do not write files or update the manifest
  --force             Overwrite existing local files when present
  --out <dir>         Output directory for fetched files (defaults to current working directory)
  --cwd <dir>         Change working directory before running (affects --out and --manifest default)
  --manifest <p>      Path to manifest file (defaults to ./${defaultManifestFile} under current working directory)
  --max-bytes <n>     Maximum allowed file size in bytes (env FETCH_GIT_FILE_MAX_BYTES). Default: ${defaultMaxBytes}
  --config <file>     JSON file with an array of refs (strings '<repo.git>@<ref>:<path>' or objects { repo, ref, path, dest? })
  --timeout-ms <n>    Timeout for git operations in milliseconds (env FETCH_GIT_FILE_TIMEOUT_MS). Default: 60000
  --retries <n>       Number of retries for transient git failures (env FETCH_GIT_FILE_RETRIES). Default: 2
  --retry-backoff-ms <n>  Initial backoff in ms between retries, exponential (env FETCH_GIT_FILE_RETRY_BACKOFF_MS). Default: 500
  --eject             Do not update the manifest; write files only
  --json              Machine-readable JSON output with per-item results
  --quiet             Suppress normal logs (errors still printed)
  --verbose           Print verbose logs for debugging
  -h, --help          Show this help and exit

Examples:
  npx @arkahna/git-file-fetch "https://github.com/user/repo.git@main:src/utils/logger.ts"
  npx @arkahna/git-file-fetch "https://github.com/user/repo.git@v1.2.3:LICENSE" --force
  npx @arkahna/git-file-fetch --out third_party "https://github.com/user/repo.git@main:tools/script.sh"
  npx @arkahna/git-file-fetch --config refs.json --out vendor --json

Exit codes:
  0  Success
  1  One or more fetches failed
  2  Invalid usage (no refs provided)
`;
  console.log(usage.trim());
}

function normalizeAndValidateRelativePath(inputPath: string): string {
  // Convert backslashes to POSIX forward slashes for consistency
  const forward = inputPath.replace(/\\/g, '/');
  const normalized = pathPosix.normalize(forward);
  if (normalized.startsWith('..') || normalized.includes('/../') || normalized === '..') {
    throw new CliError(
      'INVALID_PATH',
      `Invalid path '${inputPath}': parent directory traversal is not allowed.`,
    );
  }
  if (normalized.startsWith('/') || normalized.startsWith('~')) {
    throw new CliError(
      'INVALID_PATH',
      `Invalid path '${inputPath}': absolute paths are not allowed.`,
    );
  }
  if (normalized.includes('\0')) {
    throw new CliError('INVALID_PATH', `Invalid path '${inputPath}': null byte is not allowed.`);
  }
  return normalized;
}

function parseRef(input: string): RemoteFile {
  // Format: https://github.com/user/repo.git@branch:path/to/file
  const idx = input.lastIndexOf(':');
  if (idx === -1) {
    throw new CliError(
      'INVALID_REF_FORMAT',
      `Invalid ref '${input}'. Expected '<repo.git>@<ref>:<path>'`,
    );
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

function ensureDirFor(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function runGitWithRetry(
  args: string[],
  opts: {
    cwd?: string;
    timeoutMs: number;
    retries: number;
    backoffMs: number;
    logger: ReturnType<typeof createLogger>;
  },
): Buffer {
  const { cwd, timeoutMs, retries, backoffMs, logger } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return execFileSync('git', args, { stdio: 'pipe', cwd, timeout: timeoutMs });
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        logger.warn(
          `git ${args.join(' ')} failed (attempt ${attempt + 1} of ${retries + 1}). Retrying in ${delay}ms...`,
        );
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

function readManifest(manifestPath: string): RemoteFile[] {
  if (!existsSync(manifestPath)) return [];
  const text = readFileSync(manifestPath, 'utf-8');
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as RemoteFile[]) : [];
  } catch {
    return [];
  }
}

function updateManifest(manifestPath: string, remote: RemoteFile) {
  const existing = readManifest(manifestPath);
  existing.push(remote);
  ensureDirFor(manifestPath);
  writeFileSync(manifestPath, JSON.stringify(existing, null, 2));
}

function fsTempDir(): string {
  const dir = join(tmpdir(), `arkahna-git-file-fetch-${Date.now()}`);
  mkdirSync(dir);
  return dir;
}

function getFlagValue(args: string[], name: string): string | undefined {
  const long = `--${name}`;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === long) {
      const next = args[i + 1];
      if (next && !next.startsWith('--')) return next;
      return '';
    }
    if (a.startsWith(`${long}=`)) {
      return a.slice(long.length + 1);
    }
  }
  return undefined;
}

function loadConfigFile(configPath: string): string[] {
  const absolute = resolve(configPath);
  if (!existsSync(absolute)) {
    throw new CliError('CONFIG_NOT_FOUND', `Config file not found: ${configPath}`);
  }
  const text = readFileSync(absolute, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new CliError(
      'CONFIG_PARSE_ERROR',
      `Failed to parse JSON config at ${configPath}: ${msg}`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new CliError('CONFIG_INVALID', 'Config must be a JSON array of strings or objects');
  }
  const out: string[] = [];
  for (const item of parsed) {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item && typeof item === 'object') {
      const anyItem = item as Record<string, unknown>;
      const repoVal = anyItem.repo;
      const refVal = anyItem.ref ?? 'main';
      const pathVal = anyItem.path ?? anyItem.filePath;
      const destVal = anyItem.dest ?? anyItem.destPath;
      if (typeof repoVal !== 'string' || typeof pathVal !== 'string') {
        throw new CliError(
          'CONFIG_INVALID',
          'Object entries must include string fields { repo, path }',
        );
      }
      const repo = repoVal;
      const ref = typeof refVal === 'string' ? refVal : 'main';
      const path = pathVal;
      const spec = `${repo}@${ref}:${path}`;
      out.push(spec);
      void destVal;
    } else {
      throw new CliError('CONFIG_INVALID', 'Unsupported config item type');
    }
  }
  return out;
}

function collectPositionalArgs(argv: string[]): string[] {
  const flagsWithValues = [
    'out',
    'cwd',
    'manifest',
    'max-bytes',
    'config',
    'timeout-ms',
    'retries',
    'retry-backoff-ms',
  ];
  const skip = new Set<number>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    let name = '';
    const eqIdx = a.indexOf('=');
    if (eqIdx >= 0) {
      name = a.slice(2, eqIdx);
    } else {
      name = a.slice(2);
    }
    if (flagsWithValues.includes(name)) {
      // Always skip the flag token
      skip.add(i);
      // If it is not an equals form, skip the next value token if present
      if (eqIdx === -1 && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        skip.add(i + 1);
      }
    } else {
      // Flag without value
      skip.add(i);
    }
  }
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (!skip.has(i)) {
      positionals.push(argv[i]);
    }
  }
  return positionals;
}

function writeDestFile(
  contents: Buffer,
  remote: RemoteFile,
  destRootDir: string,
  dryRun: boolean,
  force: boolean,
  maxBytes: number,
  logger: ReturnType<typeof createLogger>,
) {
  const destFile = resolve(destRootDir, remote.destPath);
  const resolvedBase = resolve(destRootDir);
  const resolvedDest = resolve(destFile);
  if (!resolvedDest.startsWith(resolvedBase + sep) && resolvedDest !== resolvedBase) {
    throw new CliError(
      'DEST_OUT_OF_BOUNDS',
      `Destination escapes output directory: '${remote.destPath}'`,
    );
  }

  if (contents.length > maxBytes) {
    throw new CliError(
      'FILE_TOO_LARGE',
      `Source file '${remote.filePath}' is too large (${contents.length} bytes). Limit is ${maxBytes} bytes. Use --max-bytes to adjust.`,
    );
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

function fetchFileMinimal(
  remote: RemoteFile,
  tempDir: string,
  timeoutMs: number,
  retries: number,
  backoffMs: number,
  logger: ReturnType<typeof createLogger>,
): { contents: Buffer; commitSha: string } {
  const repoDir = join(tempDir, 'repo');
  mkdirSync(repoDir, { recursive: true });
  logger.verbose(
    `Shallow fetch of ${remote.repo}@${remote.ref} without checkout (git fetch + git show)`,
  );
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
  let contents: Buffer;
  try {
    contents = runGitWithRetry(['show', `${sha}:${remote.filePath}`], {
      cwd: repoDir,
      timeoutMs,
      retries,
      backoffMs,
      logger,
    });
  } catch (e) {
    // If path missing, throw a clearer error
    const msg = e instanceof Error ? e.message : String(e);
    throw new CliError(
      'SOURCE_FILE_NOT_FOUND',
      `Source file '${remote.filePath}' not found in ${redactSecrets(`${remote.repo}@${remote.ref}`)} (${msg})`,
    );
  }
  return { contents, commitSha: sha };
}

function main() {
  const argv = process.argv.slice(2);
  const showHelp = argv.includes('-h') || argv.includes('--help');
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  const jsonOutput = argv.includes('--json');
  const quietFlag = argv.includes('--quiet');
  const verboseFlag = argv.includes('--verbose');
  const eject = argv.includes('--eject') || argv.includes('--no-manifest');
  const quiet = jsonOutput ? true : quietFlag;
  const logger = createLogger(quiet, verboseFlag);
  const cwdFlag = getFlagValue(argv, 'cwd');
  if (cwdFlag && cwdFlag.length > 0) {
    process.chdir(cwdFlag);
  }

  const outDirFlag = getFlagValue(argv, 'out');
  const destRootDir = outDirFlag && outDirFlag.length > 0 ? resolve(outDirFlag) : process.cwd();

  const manifestFlag = getFlagValue(argv, 'manifest');
  const manifestPath =
    manifestFlag && manifestFlag.length > 0
      ? resolve(manifestFlag)
      : resolve(destRootDir, defaultManifestFile);

  const maxBytesFlag = getFlagValue(argv, 'max-bytes');
  const envMax = process.env.FETCH_GIT_FILE_MAX_BYTES
    ? parseInt(process.env.FETCH_GIT_FILE_MAX_BYTES, 10)
    : undefined;
  const hasMaxFlag =
    typeof maxBytesFlag === 'string' &&
    maxBytesFlag.length > 0 &&
    !Number.isNaN(Number(maxBytesFlag));
  const maxBytes = hasMaxFlag ? parseInt(maxBytesFlag, 10) : (envMax ?? defaultMaxBytes);

  const timeoutMsFlag = getFlagValue(argv, 'timeout-ms');
  const envTimeout = process.env.FETCH_GIT_FILE_TIMEOUT_MS
    ? parseInt(process.env.FETCH_GIT_FILE_TIMEOUT_MS, 10)
    : undefined;
  const timeoutMs =
    timeoutMsFlag && timeoutMsFlag.length > 0 && !Number.isNaN(Number(timeoutMsFlag))
      ? parseInt(timeoutMsFlag, 10)
      : (envTimeout ?? 60_000);

  const retriesFlag = getFlagValue(argv, 'retries');
  const envRetries = process.env.FETCH_GIT_FILE_RETRIES
    ? parseInt(process.env.FETCH_GIT_FILE_RETRIES, 10)
    : undefined;
  const retries =
    retriesFlag && retriesFlag.length > 0 && !Number.isNaN(Number(retriesFlag))
      ? parseInt(retriesFlag, 10)
      : typeof envRetries === 'number' && Number.isFinite(envRetries)
        ? envRetries
        : 2;

  const backoffFlag = getFlagValue(argv, 'retry-backoff-ms');
  const envBackoff = process.env.FETCH_GIT_FILE_RETRY_BACKOFF_MS
    ? parseInt(process.env.FETCH_GIT_FILE_RETRY_BACKOFF_MS, 10)
    : undefined;
  const backoffMs =
    backoffFlag && backoffFlag.length > 0 && !Number.isNaN(Number(backoffFlag))
      ? parseInt(backoffFlag, 10)
      : (envBackoff ?? 500);

  const configFlag = getFlagValue(argv, 'config');

  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  // Filter positional entries (non-flag args), excluding values of known flags
  const positionalEntries = collectPositionalArgs(argv);
  let entries: string[] = [...positionalEntries];
  if (configFlag && configFlag.length > 0) {
    try {
      const configEntries = loadConfigFile(configFlag);
      entries = entries.concat(configEntries);
    } catch (e: unknown) {
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

  const results: FetchResult[] = [];

  for (const arg of entries) {
    const tempDir = fsTempDir();
    try {
      const remote = parseRef(arg);
      // Prefer shallow minimal fetch without full checkout (faster and smaller than clone)
      const { contents, commitSha } = fetchFileMinimal(
        remote,
        tempDir,
        timeoutMs,
        retries,
        backoffMs,
        logger,
      );
      remote.commitSha = commitSha;
      const result = writeDestFile(contents, remote, destRootDir, dryRun, force, maxBytes, logger);
      if (!dryRun && result.wrote && !eject) {
        updateManifest(manifestPath, remote);
      }
      results.push({ input: arg, success: true, destFile: result.destFile, remote });
    } catch (e: unknown) {
      const code = e instanceof CliError ? e.code : 'UNKNOWN_ERROR';
      const message = e instanceof Error ? e.message : String(e);
      logger.error(`Error: ${code}: ${message}`);
      results.push({ input: arg, success: false, errorCode: String(code), errorMessage: message });
      process.exitCode = 1;
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  if (jsonOutput) {
    // Always print JSON as the final output line
    console.log(JSON.stringify({ results }, null, 2));
  }
}

main();
