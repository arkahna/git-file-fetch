# Code Review: git-file-fetch

Reviewed at commit `9a2b4c8` (v0.2.1).

## Critical Issues

### 1. Command injection in Nx executor

**File:** `plugin/executors/fetch/executor.ts:19`

```ts
const command = `npx git-file-fetch ${options.args}`;
execSync(command, { stdio: 'inherit' });
```

`options.args` is a user-provided string passed directly into `execSync`, which
spawns a shell. This is a command injection vulnerability. An `args` value like
`"; rm -rf /"` would execute arbitrary commands. Should use
`execFileSync('npx', ['git-file-fetch', ...parsedArgs])` with properly split
arguments, or validate/sanitize the input.

### 2. `tsconfig.plugin.json` outDir points to wrong directory

**File:** `tsconfig.plugin.json:13`

```json
"rootDir": "./plugin",
"outDir": "./src"
```

This compiles `plugin/**/*.ts` into `./src/`, polluting the source directory.
The CLAUDE.md states plugin output should be "compiled in-place alongside source
files", so `outDir` should be `"./plugin"`, not `"./src"`.

### 3. `build:plugin-assets` script is a no-op

**File:** `package.json:16`

```js
copyFileSync('plugin/executors.json', 'plugin/executors.json')
```

This copies each file to itself. It was likely intended to copy assets to a
build output directory, but as written this step does nothing.

---

## Security Concerns

### 4. Busy-wait blocks CPU during retry backoff

**File:** `src/index.ts:294-297`

```ts
const start = Date.now();
while (Date.now() - start < delay) {
  // Busy wait
}
```

This pins the CPU at 100% for the wait duration. `Atomics.wait` on a shared
buffer or `child_process.spawnSync('sleep', ...)` would preserve the sync
interface without wasting cycles.

### 5. Temp directory naming may collide

**File:** `src/index.ts:327-329`

```ts
const dir = join(tmpdir(), `git-file-fetch-${Date.now()}`);
mkdirSync(dir);
```

Two rapid invocations in the same millisecond would collide. Use
`fs.mkdtempSync(join(tmpdir(), 'git-file-fetch-'))` instead — it is both
race-free and unique.

---

## Bugs

### 6. Manifest appends duplicates on re-fetch

**File:** `src/index.ts:319-324`

`updateManifest` always pushes a new entry without checking for duplicates.
Fetching the same file twice with `--force` produces duplicate manifest entries.
Should deduplicate by `(repo, filePath, destPath)` tuple, replacing the
existing entry.

### 7. `readManifest` silently swallows JSON parse errors

**File:** `src/index.ts:313-316`

```ts
catch {
  return [];
}
```

A corrupted manifest is silently treated as empty. Should at minimum log a
warning, or throw `CONFIG_PARSE_ERROR`.

### 8. Config `dest`/`destPath` is parsed but unused

**File:** `src/index.ts:376-388`

```ts
const destVal = anyItem.dest ?? anyItem.destPath;
// ...
void destVal;
```

The config loader reads a `dest` field but explicitly discards it. Either
implement custom destination support or remove the dead code.

---

## Design & Architecture

### 9. No unit tests

The only test is `test:smoke`, which hits a live GitHub repo. Pure functions
like `parseRef`, `normalizeAndValidateRelativePath`, `collectPositionalArgs`,
`readManifest`, and `redactSecrets` are trivial to unit test. Path validation
and URL parsing are security-critical and deserve thorough coverage.

### 10. Hardcoded `VERSION` constant is duplicated

**File:** `src/index.ts:7`

```ts
const VERSION = '0.2.1';
```

Must be manually kept in sync with `package.json`. Consider reading from
`package.json` at build time, or adding a CI check that they match.

### 11. Custom argument parser is fragile

**File:** `src/index.ts:332-438`

Rolling a custom CLI parser introduces subtle edge cases:

- `--out --verbose` silently sets `out` to `''` instead of erroring
- No support for `--` separator to end flag parsing
- `--retries abc` silently falls through `parseInt` → `NaN` → default value

`node:util`'s `parseArgs` (available since Node 18.3) is a zero-dependency
alternative already available in the required Node >= 22 runtime.

### 12. Inconsistent process exit patterns

**File:** `src/index.ts:943` vs `src/index.ts:977`

Config errors use `process.exit(1)` (hard exit) while fetch errors use
`process.exitCode = 1` (graceful). The hard exit skips remaining entries in
multi-fetch mode and prevents JSON output from being written. Should
consistently use `process.exitCode`.

### 13. No runtime validation on manifest entries

**File:** `src/index.ts:313`

```ts
return Array.isArray(parsed) ? (parsed as RemoteFile[]) : [];
```

The cast performs no runtime validation. A manifest with `[{"foo": 1}]` would
silently produce `undefined` for `repo`, `ref`, etc. Should validate required
fields when reading.

---

## CI / Build

### 14. Smoke test depends on external service

**File:** `package.json:22`

CI depends on `github.com` being reachable and `octokit/core.js` existing.
Consider adding a local/mocked test suite for reliable CI.

### 15. Mixed package managers in publish workflow

**File:** `.github/workflows/publish.yml:55-56`

The project uses pnpm but the publish workflow uses `npm pack` and
`npm publish`. `pnpm pack` and `pnpm publish` would be more consistent.

### 16. GitHub Actions not pinned to SHAs

**Files:** `.github/workflows/*.yml`

Actions use mutable tags (`@v4`). For a security-sensitive tool, pinning to
commit SHAs prevents supply chain attacks via tag mutation.

---

## Minor / Code Quality

- **`package-lock.json` coexists with `pnpm-lock.yaml`** — since pnpm is the
  declared package manager, `package-lock.json` is unnecessary.
- **ESLint config indentation** (`eslint.config.js:47-75`) — the plugin config
  block uses 8-space indentation vs 2-space elsewhere.
- **`verify` command lacks `--filter` support** — `update` has it, `verify`
  does not. Inconsistent UX.

---

## What's Done Well

- **Path traversal prevention** is solid — null bytes, `..`, absolute paths,
  and tilde expansion are all caught.
- **Credential redaction** is applied consistently through the logger.
- **Typed error codes** (`CliError`) provide stable, machine-readable exit
  reasons.
- **File size limits** with configurable thresholds prevent unexpected large
  downloads.
- **Cross-platform CI matrix** (3 OS × 3 Node versions) is thorough.
- **Shallow fetch strategy** (`git fetch --depth 1`) avoids full clones.
- **Version verification in publish** workflow prevents tag/package.json drift.
- **Environment variable fallbacks** for all operational flags is good for CI.
- **Destination bounds checking** (`DEST_OUT_OF_BOUNDS`) prevents writes
  outside the output directory.
