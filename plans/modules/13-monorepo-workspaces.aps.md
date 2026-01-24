<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Monorepo Workspaces Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| SCALE | — | high | Draft |

## Purpose

Enable workspace-aware configuration for monorepos where different packages need different external dependencies. Support config inheritance, workspace-wide operations, and integration with popular monorepo tools (Nx, Turborepo, pnpm workspaces).

## In Scope

- Workspace detection (package.json workspaces, pnpm-workspace.yaml, nx.json)
- Config inheritance (root + package-level configs)
- Workspace-wide commands (`--workspace` or `-w` flag)
- Per-package manifest files
- Selective package operations (`--filter <package>`)
- Nx/Turborepo executor integration

## Out of Scope

- Workspace creation/scaffolding
- Package manager operations
- Dependency resolution between packages
- Publishing workspace packages

## Interfaces

**Depends on:**

- Workspace config files — `package.json`, `pnpm-workspace.yaml`, `nx.json`
- Per-package configs — `packages/*/git-file-fetch.json`
- Root config — `.git-file-fetch.json` (inherited)

**Exposes:**

- `git-file-fetch -w` — run across all workspace packages
- `git-file-fetch --filter <pkg>` — run for specific package(s)
- Config inheritance — package configs extend root config
- Per-package manifests — `packages/pkg-a/.git-remote-files.json`

## Boundary Rules

- WORKSPACE must not modify package manager configs
- WORKSPACE must respect .gitignore and workspace exclusions
- WORKSPACE operations must be parallelizable per-package

## Acceptance Criteria

- [ ] Auto-detects workspace root from any subdirectory
- [ ] `-w` flag runs operation across all packages
- [ ] Package configs inherit from root config
- [ ] `--filter` accepts package names or glob patterns
- [ ] Each package gets its own manifest file
- [ ] Works with npm, pnpm, yarn, and Nx workspaces
- [ ] `--json` output groups results by package
- [ ] Exit code reflects worst per-package result

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Many packages = slow operations | Leverage concurrent-fetch, parallel per-package |
| Config conflicts between root and package | Clear precedence: package overrides root |
| Large workspace discovery slow | Cache workspace structure, watch for changes |
| Different tools have different conventions | Abstract workspace detection, support major tools |

## Work Items

### MONO-001: Implement workspace detection

- **Intent:** Find workspace root and enumerate packages
- **Expected Outcome:** `detectWorkspace()` returns root path and package list
- **Scope:** Parse package.json workspaces, pnpm-workspace.yaml, nx.json
- **Non-scope:** Lerna, Rush (future)
- **Files:** `src/index.ts` or new `src/workspace.ts`
- **Dependencies:** None
- **Validation:** Detects packages in sample monorepo
- **Confidence:** high
- **Risks:** Edge cases in glob patterns

### MONO-002: Implement config inheritance

- **Intent:** Package configs extend root config
- **Expected Outcome:** Merged config with package values taking precedence
- **Scope:** Config loading, merging logic
- **Non-scope:** Complex merge strategies (arrays, deep merge)
- **Files:** `src/index.ts`
- **Dependencies:** MONO-001
- **Validation:** Package config overrides root value
- **Confidence:** high
- **Risks:** None

### MONO-003: Add `-w` workspace flag

- **Intent:** Run operations across all workspace packages
- **Expected Outcome:** Command executes for each package sequentially
- **Scope:** CLI flag, iteration over packages
- **Non-scope:** Parallel execution (use with concurrent-fetch)
- **Files:** `src/index.ts`
- **Dependencies:** MONO-001
- **Validation:** `git-file-fetch update -w` updates all packages
- **Confidence:** high
- **Risks:** None

### MONO-004: Add `--filter` package selector

- **Intent:** Run operations for specific packages only
- **Expected Outcome:** Only matching packages processed
- **Scope:** Filter parsing, package name matching, glob support
- **Non-scope:** Complex query syntax
- **Files:** `src/index.ts`
- **Dependencies:** MONO-003
- **Validation:** `--filter pkg-a` only processes pkg-a
- **Confidence:** high
- **Risks:** None

### MONO-005: Implement per-package manifests

- **Intent:** Each package tracks its own external files
- **Expected Outcome:** Manifest in each package directory
- **Scope:** Manifest path resolution per package
- **Non-scope:** Shared/global manifest option
- **Files:** `src/index.ts`
- **Dependencies:** MONO-003
- **Validation:** Fetch in pkg-a creates pkg-a/.git-remote-files.json
- **Confidence:** high
- **Risks:** None

### MONO-006: Add workspace-aware JSON output

- **Intent:** Group results by package in JSON mode
- **Expected Outcome:** `{ "packages": { "pkg-a": {...}, "pkg-b": {...} } }`
- **Scope:** Output structure for workspace operations
- **Non-scope:** Custom formatters
- **Files:** `src/index.ts`
- **Dependencies:** MONO-003
- **Validation:** `-w --json` shows per-package results
- **Confidence:** high
- **Risks:** None

### MONO-007: Nx executor workspace support

- **Intent:** Nx executor respects workspace context
- **Expected Outcome:** Executor runs in correct package context
- **Scope:** Update executor to pass workspace flags
- **Non-scope:** Nx generator
- **Files:** `plugin/executors/fetch/executor.ts`
- **Dependencies:** MONO-003
- **Validation:** `nx run pkg-a:fetch` uses pkg-a config
- **Confidence:** medium
- **Risks:** Nx context API changes

## Configuration Examples

### Root Config (`.git-file-fetch.json`)
```json
{
  "defaults": {
    "timeout": 30000,
    "retries": 3
  },
  "refs": [
    "https://github.com/shared/utils.git@main:LICENSE"
  ]
}
```

### Package Config (`packages/pkg-a/.git-file-fetch.json`)
```json
{
  "extends": "../../.git-file-fetch.json",
  "refs": [
    "https://github.com/specific/lib.git@v2.0:src/helper.ts"
  ]
}
```

### Resulting Merged Config for pkg-a
```json
{
  "defaults": {
    "timeout": 30000,
    "retries": 3
  },
  "refs": [
    "https://github.com/shared/utils.git@main:LICENSE",
    "https://github.com/specific/lib.git@v2.0:src/helper.ts"
  ]
}
```

## Decisions

- **D-001:** Package configs override root — explicit wins over inherited
- **D-002:** Per-package manifests by default — isolation over sharing
- **D-003:** Support major tools only — npm/pnpm/yarn workspaces + Nx

## Notes

- Consider `--hoist` flag to put all manifests in root (optional)
- Turborepo integration via turbo.json tasks
- Future: `git-file-fetch workspace init` to scaffold configs
