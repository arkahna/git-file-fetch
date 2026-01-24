<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Progress Indicators Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| UX | — | medium | Draft |

## Purpose

Add visual progress indicators for network operations. Users should see activity during long-running operations, not a blank terminal.

## In Scope

- Spinner during git operations
- Progress bar for multiple file operations
- File count progress (3/10 files)
- Disable in non-TTY or with `--quiet`

## Out of Scope

- Download speed/ETA estimation
- Detailed transfer progress
- GUI progress bars

## Interfaces

**Depends on:**

- TTY detection — `process.stdout.isTTY`
- Operation lifecycle hooks

**Exposes:**

- Visual spinner during single operations
- Progress bar during multi-file operations
- `--no-progress` flag to disable

## Acceptance Criteria

- [ ] Spinner shows during git fetch
- [ ] Progress shows "Fetching file 3/10..."
- [ ] No progress output with `--quiet` or `--json`
- [ ] No progress output when piped (non-TTY)
- [ ] Progress clears cleanly on completion
- [ ] Works on Windows, macOS, Linux terminals

## Work Items

### PROGRESS-001: Implement TTY-aware spinner

- **Intent:** Show activity during single long operations
- **Expected Outcome:** Animated spinner in TTY, nothing in pipe
- **Scope:** Spinner animation, TTY detection
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** Spinner visible in terminal, absent in `| cat`
- **Confidence:** high
- **Risks:** Windows terminal compatibility

### PROGRESS-002: Implement file count progress

- **Intent:** Show "3/10 files" during batch operations
- **Expected Outcome:** Counter updates as files complete
- **Scope:** Counter display, line clearing
- **Files:** `src/index.ts`
- **Dependencies:** PROGRESS-001
- **Validation:** Multi-file fetch shows incrementing counter
- **Confidence:** high
- **Risks:** None

### PROGRESS-003: Integrate with concurrent fetch

- **Intent:** Progress works correctly with parallel operations
- **Expected Outcome:** Counter reflects completed (not started) files
- **Scope:** Thread-safe counter updates
- **Files:** `src/index.ts`
- **Dependencies:** PROGRESS-002, CONCURRENT-002
- **Validation:** Concurrent fetch shows accurate progress
- **Confidence:** medium
- **Risks:** Race conditions in counter updates

## Decisions

- **D-001:** Use Unicode spinner chars — wide terminal support
- **D-002:** Progress to stderr — stdout reserved for output

## Notes

- Keep implementation simple, no external dependencies
