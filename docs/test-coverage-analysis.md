# Test Coverage Analysis

## Current State

The project has **no unit or integration test framework** installed. The only
automated test is a single smoke test defined in `package.json`:

```bash
pnpm test:smoke  # node dist/index.js "<repo>@main:LICENSE" --dry-run --json
```

This runs against a live GitHub repository (`octokit/core.js`) and validates
that the built CLI can fetch a file in `--dry-run --json` mode. CI executes
this on a 3x3 matrix (Node 22/23/24, Ubuntu/macOS/Windows).

There are **zero unit tests**, **zero mocked integration tests**, and **no test
framework dependency** (no Vitest, Jest, or similar).

---

## Inventory of Testable Functions

All CLI logic lives in `src/index.ts` (988 lines). The functions below are
listed with their line numbers and current coverage status.

| Function | Lines | Pure/IO | Currently Tested |
|---|---|---|---|
| `redactSecrets()` | 64-67 | Pure | No |
| `createLogger()` | 69-84 | Pure | No |
| `normalizeAndValidateRelativePath()` | 222-242 | Pure | No |
| `parseRef()` | 244-262 | Pure | No |
| `getFlagValue()` | 332-346 | Pure | No |
| `collectPositionalArgs()` | 396-438 | Pure | No |
| `loadConfigFile()` | 348-394 | IO (fs read) | No |
| `readManifest()` | 308-317 | IO (fs read) | No |
| `updateManifest()` | 319-324 | IO (fs write) | No |
| `writeManifest()` | 582-585 | IO (fs write) | No |
| `writeDestFile()` | 440-477 | IO (fs write) | No |
| `runGitWithRetry()` | 271-306 | IO (child_process) | No |
| `fetchFileMinimal()` | 479-543 | IO (git) | Smoke only |
| `fetchFileAtSha()` | 545-580 | IO (git) | No |
| `runUpdate()` | 587-684 | IO (git + fs) | No |
| `runVerify()` | 686-769 | IO (git + fs) | No |
| `runList()` | 771-800 | IO (fs read) | No |
| `main()` | 802-988 | IO (orchestrator) | Smoke only |
| `printHelp()` | 86-220 | Pure (stdout) | No |
| Nx `runExecutor()` | plugin/executors/fetch/executor.ts | IO (child_process) | No |

---

## Recommended Test Improvements

### Priority 1 -- Pure Function Unit Tests (high value, zero mocking)

These six functions are pure (no I/O side effects) and contain critical
validation logic. They can be tested immediately with any test runner and no
mocking infrastructure.

#### 1. `parseRef()` (line 244)

This is the most important function to test. It parses the
`<repo.git>@<ref>:<path>` format that the entire CLI depends on.

Test cases to cover:

- Standard HTTPS URL: `https://github.com/user/repo.git@main:src/file.ts`
- SSH URL: `git@github.com:user/repo.git@v1.0:README.md`
- Missing ref defaults to `main`: `https://github.com/user/repo.git:file.txt`
- Deeply nested path: `repo.git@branch:a/b/c/d/e.txt`
- Ref with slashes: `repo.git@feature/branch-name:file.txt`
- Ref with tag format: `repo.git@v1.2.3:file.txt`
- Empty path after colon (should error)
- No colon at all (should throw `INVALID_REF_FORMAT`)
- Path traversal in file path (should throw `INVALID_PATH`)
- Absolute path in file path (should throw `INVALID_PATH`)
- URL with port number: `https://host:8443/repo.git@main:file` -- the last
  colon is used, so the port colon should be part of `repoRef`
- URL with credentials: `https://user:token@host/repo.git@main:file`

#### 2. `normalizeAndValidateRelativePath()` (line 222)

Security-critical path validation. Must reject traversal attacks.

Test cases to cover:

- Simple relative path: `src/file.ts` -> `src/file.ts`
- Backslash normalization: `src\file.ts` -> `src/file.ts`
- Parent traversal blocked: `../etc/passwd` -> throws `INVALID_PATH`
- Mid-path traversal blocked: `src/../../etc/passwd` -> throws `INVALID_PATH`
- Absolute path blocked: `/etc/passwd` -> throws `INVALID_PATH`
- Home directory blocked: `~/file` -> throws `INVALID_PATH`
- Null byte blocked: `file\0.txt` -> throws `INVALID_PATH`
- Dot-dot alone: `..` -> throws `INVALID_PATH`
- Redundant slashes: `src//file.ts` -> normalized
- Dot segments: `./src/./file.ts` -> `src/file.ts`
- Windows-style path: `src\\sub\\file.ts` -> `src/sub/file.ts`

#### 3. `redactSecrets()` (line 64)

Prevents credential leakage in logs/output.

Test cases to cover:

- HTTPS with token: `https://user:ghp_token@github.com/repo` -> `https://***@github.com/repo`
- HTTPS without credentials: `https://github.com/repo` -> unchanged
- SSH URL: `git@github.com:user/repo.git` -> unchanged (no `://`)
- Multiple URLs in one string
- Empty string
- URL with only username (no password): `https://user@host/repo`

#### 4. `getFlagValue()` (line 332)

CLI argument parsing.

Test cases to cover:

- `--out dir` (space-separated) returns `dir`
- `--out=dir` (equals form) returns `dir`
- Flag not present returns `undefined`
- Flag at end with no value returns `''`
- Flag followed by another flag returns `''`
- Multiple flags, correct one selected
- Flag appears twice, first value wins

#### 5. `collectPositionalArgs()` (line 396)

Separates refs from flags.

Test cases to cover:

- No flags: `['ref1', 'ref2']` -> `['ref1', 'ref2']`
- Mixed: `['ref1', '--force', 'ref2']` -> `['ref1', 'ref2']`
- Flag with value: `['ref1', '--out', 'dir', 'ref2']` -> `['ref1', 'ref2']`
- Flag with equals: `['ref1', '--out=dir', 'ref2']` -> `['ref1', 'ref2']`
- All flags, no positionals: `['--dry-run', '--force']` -> `[]`
- Empty input: `[]` -> `[]`
- Boolean flags: `['--dry-run', '--json', '--quiet']` -> `[]`

#### 6. `createLogger()` (line 69)

Verify quiet/verbose modes control output correctly.

Test cases to cover:

- `quiet=false, verbose=false`: `log` outputs, `verbose` does not
- `quiet=true`: `log` and `warn` suppressed, `error` still outputs
- `verbose=true`: `verbose()` outputs
- Credential redaction applied to all output methods

---

### Priority 2 -- I/O Unit Tests (requires fs mocking or temp dirs)

#### 7. `readManifest()` (line 308)

Test cases:

- File does not exist: returns `[]`
- File contains valid JSON array: returns parsed array
- File contains invalid JSON: returns `[]` (graceful fallback)
- File contains a JSON object (not array): returns `[]`

#### 8. `updateManifest()` / `writeManifest()` (lines 319, 582)

Test cases:

- Appends to existing manifest
- Creates manifest file if it doesn't exist
- Creates parent directories if needed
- Writes valid JSON with 2-space indent

#### 9. `writeDestFile()` (line 440)

Test cases:

- Writes file to correct destination
- Creates parent directories
- `dryRun=true`: does not write, returns `wrote: false`
- File exists without `--force`: skips, returns `wrote: false`
- File exists with `--force`: overwrites
- Contents exceed `maxBytes`: throws `FILE_TOO_LARGE`
- Destination escapes root dir: throws `DEST_OUT_OF_BOUNDS`

#### 10. `loadConfigFile()` (line 348)

Test cases:

- File not found: throws `CONFIG_NOT_FOUND`
- Invalid JSON: throws `CONFIG_PARSE_ERROR`
- Not an array: throws `CONFIG_INVALID`
- Array of strings: returns strings as-is
- Array of objects with `{ repo, path }`: builds ref strings
- Object missing required fields: throws `CONFIG_INVALID`
- Mixed array of strings and objects
- Object entries with optional `ref`, `dest`, `filePath`, `destPath` aliases

---

### Priority 3 -- Integration Tests (requires git or child_process mocking)

#### 11. `runGitWithRetry()` (line 271)

This is the retry engine for all git operations.

Test cases:

- Succeeds on first attempt: returns buffer
- Fails then succeeds: retries and returns buffer
- Fails all attempts: throws `GIT_COMMAND_FAILED`
- Backoff timing: delay doubles each attempt (500ms, 1000ms, 2000ms)
- Timeout respected
- Zero retries: fails immediately on error

#### 12. `main()` CLI integration (line 802)

End-to-end tests using the compiled CLI as a subprocess.

Test cases:

- `--version` prints version and exits 0
- `--help` prints help and exits 0
- `update --help` prints update help
- No arguments prints help and exits 2
- Invalid ref format exits 1 with `INVALID_REF_FORMAT`
- `--json` output is valid JSON with expected schema
- `--cwd` changes working directory
- `--out` writes to specified directory
- `--eject` skips manifest update
- `--config` loads refs from file
- Environment variables respected (`FETCH_GIT_FILE_MAX_BYTES`, etc.)

#### 13. Nx Plugin `runExecutor()` (plugin/executors/fetch/executor.ts)

Test cases:

- Passes `options.args` to `npx git-file-fetch`
- Returns `{ success: true }` on exit 0
- Returns `{ success: false }` on non-zero exit

---

### Priority 4 -- Edge Case and Security Tests

These don't require new functions but validate important behaviors.

#### Path Traversal Hardening

- `..%2F` URL-encoded traversal (currently not decoded, but worth asserting)
- Symlink following (if the OS resolves a symlink outside the root dir)
- Very long paths (OS limit testing)
- Unicode path components

#### Large File / Binary Handling

- File exactly at `maxBytes` boundary (should pass)
- File one byte over `maxBytes` (should fail)
- Binary file content (Buffer preserved correctly)
- Empty file (0 bytes)

#### Concurrent Manifest Writes

- Two fetches writing to the same manifest simultaneously (currently
  sequential, but worth documenting the behavior)

---

## Recommended Test Framework Setup

The project uses ESM (`"type": "module"`) and TypeScript. A suitable setup:

1. **Framework**: Vitest (native ESM support, TypeScript out-of-the-box, fast)
2. **No mocking library needed for Priority 1** -- pure functions only
3. **For Priority 2**: use `node:fs` with temp directories (`os.tmpdir()`)
4. **For Priority 3**: mock `child_process.execFileSync` or use a real git
   repo fixture

Suggested `package.json` additions:

```json
{
  "devDependencies": {
    "vitest": "^3.x"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Suggested File Structure

```
src/
  index.ts
  __tests__/
    parseRef.test.ts
    normalizeAndValidateRelativePath.test.ts
    redactSecrets.test.ts
    getFlagValue.test.ts
    collectPositionalArgs.test.ts
    createLogger.test.ts
    manifest.test.ts        # readManifest, updateManifest, writeManifest
    writeDestFile.test.ts
    loadConfigFile.test.ts
    runGitWithRetry.test.ts
    cli.integration.test.ts # main() subprocess tests
plugin/
  executors/fetch/
    executor.test.ts
```

## Prerequisite: Export Functions for Testing

Currently all functions in `src/index.ts` are module-scoped (not exported). To
unit-test them, either:

1. **Extract and export** the pure functions from a separate module
   (e.g. `src/lib.ts`) and import them in both `src/index.ts` and tests, or
2. **Use Vitest's `vi.importActual()`** or similar to test the module
   internals (less clean), or
3. **Test via the CLI subprocess** for integration-level coverage (no exports
   needed but slower and coarser).

Option 1 is recommended. The pure functions (`parseRef`,
`normalizeAndValidateRelativePath`, `redactSecrets`, `getFlagValue`,
`collectPositionalArgs`) can be moved to `src/lib.ts` with no behavior change.

---

## Impact Summary

| Priority | Tests | Functions Covered | Effort | Value |
|---|---|---|---|---|
| P1 - Pure unit tests | ~50 cases | 6 functions | Low | High |
| P2 - I/O unit tests | ~25 cases | 4 functions | Medium | High |
| P3 - Integration tests | ~20 cases | 3 functions | Medium | Medium |
| P4 - Edge/security tests | ~15 cases | Cross-cutting | Low-Medium | Medium |

Starting with P1 alone would cover the most critical parsing and validation
logic with minimal setup effort and no mocking.
