<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Update Command Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| WORKFLOW | — | high | Draft |

## Purpose

Add an `update` command that re-fetches all files tracked in the manifest, updating them to the latest commit on their recorded refs. Essential for keeping external dependencies current.

## In Scope

- Read manifest entries and re-fetch each file
- Update manifest with new commit SHAs
- Support `--dry-run` to preview updates
- Support filtering by repo or path pattern
- Report which files changed vs unchanged

## Out of Scope

- Changing refs (e.g., updating from `v1.0` to `v2.0`)
- Interactive selection of files to update
- Automatic commit of changes

## Interfaces

**Depends on:**

- Manifest file — `.git-remote-files.json`
- Existing fetch logic — `fetchFileMinimal()`

**Exposes:**

- `git-file-fetch update` — re-fetch all manifest entries
- `git-file-fetch update --filter <pattern>` — selective update

## Boundary Rules

- UPDATE must reuse existing fetch/write logic
- UPDATE must not modify refs in manifest (only commit SHAs)

## Acceptance Criteria

- [ ] `git-file-fetch update` re-fetches all manifest entries
- [ ] `git-file-fetch update --dry-run` shows what would change
- [ ] Changed files are reported distinctly from unchanged
- [ ] Manifest commit SHAs are updated after successful fetch
- [ ] Exit code 0 if all updates succeed, 1 if any fail
- [ ] `--json` output includes update status per file

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large manifests slow to update | Add concurrency (see concurrent-fetch module) |
| Network failures mid-update | Atomic manifest write after all fetches complete |
| Ref no longer exists | Clear error message, skip entry, continue others |

## Work Items

### UPDATE-001: Parse `update` subcommand

- **Intent:** Recognize `update` as a command and route to handler
- **Expected Outcome:** `git-file-fetch update` invokes update logic
- **Scope:** CLI argument parsing in `main()`
- **Non-scope:** Update implementation
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** `node dist/index.js update --help` shows update-specific help
- **Confidence:** high
- **Risks:** None

### UPDATE-002: Implement manifest re-fetch logic

- **Intent:** Iterate manifest entries and re-fetch each file
- **Expected Outcome:** All manifest files updated to latest commits
- **Scope:** New `runUpdate()` function
- **Non-scope:** Concurrency, filtering
- **Files:** `src/index.ts`
- **Dependencies:** UPDATE-001
- **Validation:** `git-file-fetch update --dry-run` lists all manifest entries
- **Confidence:** high
- **Risks:** None

### UPDATE-003: Add change detection and reporting

- **Intent:** Report which files actually changed vs unchanged
- **Expected Outcome:** Output distinguishes changed/unchanged files
- **Scope:** Compare old vs new commit SHA, file content hash
- **Non-scope:** Diff display
- **Files:** `src/index.ts`
- **Dependencies:** UPDATE-002
- **Validation:** Re-run update twice, second run shows "unchanged"
- **Confidence:** medium
- **Risks:** Content comparison adds overhead

### UPDATE-004: Add `--filter` option

- **Intent:** Allow selective updates by repo URL or path pattern
- **Expected Outcome:** Only matching entries are updated
- **Scope:** Filter parsing and manifest filtering
- **Non-scope:** Complex glob patterns (simple substring match)
- **Files:** `src/index.ts`
- **Dependencies:** UPDATE-002
- **Validation:** `git-file-fetch update --filter github.com/user` updates only matching
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Update preserves original ref — only commit SHA changes
- **D-002:** Atomic manifest update — write only after all fetches succeed

## Notes

- Consider adding `--ref <newref>` in future to bulk-update refs
- Should integrate with concurrent-fetch module when available
