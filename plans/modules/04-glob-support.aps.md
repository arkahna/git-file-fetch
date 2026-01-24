<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Glob Pattern Support Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| FETCH | — | high | Draft |

## Purpose

Enable fetching multiple files using glob patterns like `src/**/*.ts`. Dramatically reduces configuration overhead when importing multiple files from external repos.

## In Scope

- Parse glob patterns in file path position
- Expand patterns to file list using `git ls-tree`
- Fetch all matched files
- Add all matches to manifest individually
- Support common patterns: `*`, `**`, `?`, `[abc]`

## Out of Scope

- Negative patterns (exclusions)
- Pattern matching across multiple repos
- Recursive directory fetch without pattern

## Interfaces

**Depends on:**

- Git ls-tree — enumerate files at ref
- Existing fetch logic — fetch individual files
- Manifest — store individual file entries

**Exposes:**

- Glob pattern in path position: `repo.git@ref:src/**/*.ts`
- `--dry-run` shows expanded file list

## Boundary Rules

- GLOB must expand patterns before fetching
- GLOB must create individual manifest entries (not pattern)
- GLOB must validate expanded paths don't escape boundaries

## Acceptance Criteria

- [ ] `repo@ref:src/*.ts` fetches all .ts files in src/
- [ ] `repo@ref:src/**/*.ts` fetches .ts files recursively
- [ ] `--dry-run` shows list of files that would be fetched
- [ ] Each matched file gets individual manifest entry
- [ ] Invalid patterns produce clear error messages
- [ ] Path traversal attempts in patterns are rejected

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Pattern matches thousands of files | Add `--limit N` flag, warn above threshold |
| Security: pattern escapes directory | Validate all expanded paths, reject `..` |
| Performance: ls-tree on huge repos | Use sparse checkout patterns if available |

## Work Items

### GLOB-001: Detect glob patterns in path

- **Intent:** Recognize when path contains glob characters
- **Expected Outcome:** `hasGlobPattern()` returns true for `*.ts`
- **Scope:** Pattern detection logic
- **Non-scope:** Pattern expansion
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** `hasGlobPattern('src/*.ts')` returns true
- **Confidence:** high
- **Risks:** None

### GLOB-002: Implement git ls-tree file enumeration

- **Intent:** List files matching pattern at specific ref
- **Expected Outcome:** Array of file paths matching pattern
- **Scope:** Git ls-tree execution and parsing
- **Non-scope:** Pattern matching (use git's pathspec)
- **Files:** `src/index.ts`
- **Dependencies:** GLOB-001
- **Validation:** ls-tree with `*.md` returns markdown files
- **Confidence:** medium
- **Risks:** Git pathspec syntax differs from shell glob

### GLOB-003: Expand patterns and fetch files

- **Intent:** Convert pattern to file list and fetch each
- **Expected Outcome:** All matched files fetched and in manifest
- **Scope:** Integration of ls-tree with fetch loop
- **Non-scope:** Concurrency (see concurrent-fetch)
- **Files:** `src/index.ts`
- **Dependencies:** GLOB-002
- **Validation:** `repo@ref:docs/*.md --dry-run` lists all docs
- **Confidence:** high
- **Risks:** Large expansion could be slow

### GLOB-004: Add safety limits and warnings

- **Intent:** Prevent accidental huge fetches
- **Expected Outcome:** Warning when pattern matches >100 files, limit flag
- **Scope:** Threshold check and `--limit` flag
- **Non-scope:** Interactive confirmation
- **Files:** `src/index.ts`
- **Dependencies:** GLOB-003
- **Validation:** Pattern matching 1000 files warns user
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Use git pathspec for matching — consistent with git behavior
- **D-002:** Store expanded files individually — enables per-file update/verify
- **D-003:** Default limit 100 files — require `--limit` or `--no-limit` for more

## Notes

- Consider supporting `.gitignore`-style patterns in future
- Pattern expansion should respect `--out` directory structure
