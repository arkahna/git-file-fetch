<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Verify Command Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| WORKFLOW | — | high | Draft |

## Purpose

Add a `verify` command that compares local files against their recorded sources in the manifest. Essential for CI pipelines to detect drift without modifying files.

## In Scope

- Compare local file content against remote at recorded commit SHA
- Report matches, mismatches, and missing files
- Support `--changed-only` to show only differences
- Exit with non-zero code if any mismatches (CI-friendly)
- JSON output for automation

## Out of Scope

- Showing actual diffs (see diff-preview module)
- Auto-fixing mismatches
- Verifying against latest commit (that's update --dry-run)

## Interfaces

**Depends on:**

- Manifest file — `.git-remote-files.json`
- Local file system — fetched files
- Git operations — fetch remote content at specific SHA

**Exposes:**

- `git-file-fetch verify` — check all manifest entries
- `git-file-fetch verify --changed-only` — show only mismatches

## Boundary Rules

- VERIFY must not write any files
- VERIFY must not modify manifest
- VERIFY must use recorded commit SHA, not latest

## Acceptance Criteria

- [ ] `git-file-fetch verify` compares all manifest entries
- [ ] Exit code 0 if all match, 1 if any mismatch
- [ ] Output clearly shows: match, mismatch, missing local, missing remote
- [ ] `--changed-only` suppresses matching files from output
- [ ] `--json` returns structured verification results
- [ ] Works in CI without interactive prompts

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Fetching remote content slow | Cache fetched content within single run |
| Binary files comparison | Use byte-level comparison, not text |
| Large files memory pressure | Stream comparison, don't load entire file |

## Work Items

### VERIFY-001: Parse `verify` subcommand

- **Intent:** Recognize `verify` command and route to handler
- **Expected Outcome:** `git-file-fetch verify` invokes verify logic
- **Scope:** CLI argument parsing
- **Non-scope:** Verification implementation
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** `node dist/index.js verify --help` shows verify help
- **Confidence:** high
- **Risks:** None

### VERIFY-002: Implement remote content fetch at SHA

- **Intent:** Fetch file content at specific commit SHA (not ref)
- **Expected Outcome:** Can retrieve exact content as recorded in manifest
- **Scope:** Git show with full SHA
- **Non-scope:** Caching (future optimization)
- **Files:** `src/index.ts`
- **Dependencies:** VERIFY-001
- **Validation:** Fetch file at old SHA returns old content
- **Confidence:** high
- **Risks:** SHA may no longer exist (repo force-pushed)

### VERIFY-003: Implement comparison and reporting

- **Intent:** Compare local vs remote, report status
- **Expected Outcome:** Clear output showing verification results
- **Scope:** Byte comparison, status reporting
- **Non-scope:** Diff generation
- **Files:** `src/index.ts`
- **Dependencies:** VERIFY-002
- **Validation:** Modify local file, verify reports mismatch
- **Confidence:** high
- **Risks:** None

### VERIFY-004: Add `--changed-only` flag

- **Intent:** Filter output to show only mismatches
- **Expected Outcome:** Matching files suppressed from output
- **Scope:** Output filtering
- **Non-scope:** None
- **Files:** `src/index.ts`
- **Dependencies:** VERIFY-003
- **Validation:** With all files matching, `--changed-only` produces empty output
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Verify uses recorded SHA, not latest — ensures reproducibility
- **D-002:** Non-zero exit on mismatch — enables `verify && deploy` patterns

## Notes

- Natural companion to `update` command
- Integrity module will add checksum verification on top of this
