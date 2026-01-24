<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Diff Preview Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| UX | — | high | Draft |

## Purpose

Add `--preview` flag that shows a diff of what would change before overwriting files. Enables informed decisions before modifying local files.

## In Scope

- Generate unified diff between local and remote content
- Show diff in terminal with color highlighting
- Support `--preview` on fetch and update commands
- Configurable context lines

## Out of Scope

- Interactive patching (accept/reject hunks)
- Side-by-side diff view
- Diff for binary files (show "binary differs")

## Interfaces

**Depends on:**

- Local file content
- Remote file content (fetched but not written)

**Exposes:**

- `git-file-fetch --preview` — show diff before writing
- `git-file-fetch update --preview` — show all update diffs

## Acceptance Criteria

- [ ] `--preview` shows unified diff for changed files
- [ ] Diff uses color when terminal supports it
- [ ] New files show entire content as additions
- [ ] Deleted content shows as removals
- [ ] `--preview` prevents file writes (implicit dry-run)
- [ ] Binary files show "Binary files differ" message

## Work Items

### DIFF-001: Implement unified diff generation

- **Intent:** Generate diff between two strings
- **Expected Outcome:** Unified diff format output
- **Scope:** Diff algorithm (use simple line-based)
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** Diff of "a\nb" vs "a\nc" shows -b +c
- **Confidence:** medium
- **Risks:** Edge cases in diff algorithm

### DIFF-002: Add terminal color support

- **Intent:** Colorize diff output (red/green)
- **Expected Outcome:** Additions green, deletions red
- **Scope:** ANSI color codes, TTY detection
- **Files:** `src/index.ts`
- **Dependencies:** DIFF-001
- **Validation:** Diff shows colors in terminal
- **Confidence:** high
- **Risks:** Windows terminal compatibility

### DIFF-003: Integrate `--preview` flag

- **Intent:** Add flag to show diff before write
- **Expected Outcome:** `--preview` shows diff, skips write
- **Scope:** CLI flag, integration with fetch flow
- **Files:** `src/index.ts`
- **Dependencies:** DIFF-002
- **Validation:** `--preview` shows diff, file unchanged
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Use simple line-based diff — no external dependencies
- **D-002:** `--preview` implies `--dry-run` — never write with preview

## Notes

- Could add `--preview=full` vs `--preview=stat` modes later
