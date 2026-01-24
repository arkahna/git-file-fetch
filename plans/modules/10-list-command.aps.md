<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# List Command Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| WORKFLOW | — | medium | Draft |

## Purpose

Add a `list` command that displays manifest contents in a human-readable format. Quickly see what external files are tracked without reading JSON.

## In Scope

- Pretty-print manifest entries
- Show repo, ref, path, destination
- Show commit SHA (truncated)
- Support `--json` for machine output
- Support filtering by repo or path

## Out of Scope

- Interactive selection
- Manifest editing
- File status (modified, missing)

## Interfaces

**Depends on:**

- Manifest file — `.git-remote-files.json`

**Exposes:**

- `git-file-fetch list` — show all tracked files
- `git-file-fetch list --filter <pattern>` — filter entries

## Acceptance Criteria

- [ ] `list` shows all manifest entries in readable format
- [ ] Output includes repo, ref, path, short SHA
- [ ] `--json` outputs raw manifest JSON
- [ ] `--filter` narrows results by pattern
- [ ] Empty manifest shows helpful message
- [ ] Exit code 0 always (read-only operation)

## Work Items

### LIST-001: Parse `list` subcommand

- **Intent:** Recognize list command
- **Expected Outcome:** `git-file-fetch list` invokes handler
- **Scope:** CLI routing
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** `list --help` shows list-specific help
- **Confidence:** high
- **Risks:** None

### LIST-002: Implement formatted output

- **Intent:** Pretty-print manifest contents
- **Expected Outcome:** Clean table or list format
- **Scope:** Output formatting
- **Files:** `src/index.ts`
- **Dependencies:** LIST-001
- **Validation:** `list` shows readable output
- **Confidence:** high
- **Risks:** None

### LIST-003: Add `--filter` option

- **Intent:** Filter list by pattern
- **Expected Outcome:** Only matching entries shown
- **Scope:** Pattern matching, filtering
- **Files:** `src/index.ts`
- **Dependencies:** LIST-002
- **Validation:** `--filter github` shows only github repos
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Default to pretty format, `--json` for raw — optimized for humans

## Notes

- Consider `list --status` in future to show local file status
