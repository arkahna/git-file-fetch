<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Shell Completion Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| UX | — | medium | Draft |

## Purpose

Provide shell completion scripts for bash, zsh, and fish. Tab completion dramatically improves CLI discoverability and reduces typing errors.

## In Scope

- Bash completion script
- Zsh completion script
- Fish completion script
- `git-file-fetch completion <shell>` command to output script
- Installation instructions in docs

## Out of Scope

- Automatic installation
- PowerShell completion
- Dynamic completions (e.g., completing repo URLs)

## Interfaces

**Exposes:**

- `git-file-fetch completion bash` — outputs bash completion
- `git-file-fetch completion zsh` — outputs zsh completion
- `git-file-fetch completion fish` — outputs fish completion

## Acceptance Criteria

- [ ] `completion bash` outputs valid bash completion script
- [ ] `completion zsh` outputs valid zsh completion script
- [ ] `completion fish` outputs valid fish completion script
- [ ] Tab completes all flags (--dry-run, --force, etc.)
- [ ] Tab completes commands (update, verify, list, init)
- [ ] Instructions work on fresh shell setup

## Work Items

### SHELL-001: Add `completion` subcommand

- **Intent:** Output shell completion scripts
- **Expected Outcome:** `completion bash` prints script
- **Scope:** Subcommand routing, script output
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** `completion bash > /dev/null` exits 0
- **Confidence:** high
- **Risks:** None

### SHELL-002: Implement bash completion

- **Intent:** Tab completion in bash
- **Expected Outcome:** Complete script for bash
- **Scope:** Bash completion syntax
- **Files:** `src/index.ts` (embedded script)
- **Dependencies:** SHELL-001
- **Validation:** Source script, tab completes --dry-run
- **Confidence:** high
- **Risks:** None

### SHELL-003: Implement zsh completion

- **Intent:** Tab completion in zsh
- **Expected Outcome:** Complete script for zsh
- **Scope:** Zsh completion syntax
- **Files:** `src/index.ts` (embedded script)
- **Dependencies:** SHELL-001
- **Validation:** Source script, tab completes in zsh
- **Confidence:** medium
- **Risks:** Zsh completion syntax complexity

### SHELL-004: Implement fish completion

- **Intent:** Tab completion in fish
- **Expected Outcome:** Complete script for fish
- **Scope:** Fish completion syntax
- **Files:** `src/index.ts` (embedded script)
- **Dependencies:** SHELL-001
- **Validation:** Source script, tab completes in fish
- **Confidence:** medium
- **Risks:** Fish syntax differs significantly

## Decisions

- **D-001:** Embed scripts in source — no separate files to ship
- **D-002:** Static completions only — no dynamic repo/file completion (complex)

## Notes

- Update docs/getting-started.md with completion setup instructions
