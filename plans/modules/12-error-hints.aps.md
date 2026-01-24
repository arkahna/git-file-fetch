<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Error Hints Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| UX | — | medium | Draft |

## Purpose

Enhance error messages with contextual hints and suggested fixes. Transform cryptic errors into actionable guidance.

## In Scope

- "Did you mean...?" suggestions for typos
- Authentication hints for 401/403 errors
- Network troubleshooting hints
- Common mistake detection and correction

## Out of Scope

- Auto-correction (just suggest)
- Interactive prompts
- Telemetry on errors

## Interfaces

**Exposes:**

- Enhanced error messages with hints
- Hint suppression with `--no-hints`

## Acceptance Criteria

- [ ] Auth errors suggest setting GITHUB_TOKEN
- [ ] 404 errors suggest checking repo URL and ref
- [ ] Network errors suggest checking connectivity
- [ ] Typos in flags show "did you mean"
- [ ] `--no-hints` shows raw errors only
- [ ] Hints don't clutter `--json` output

## Work Items

### HINTS-001: Add hint infrastructure

- **Intent:** Framework for attaching hints to errors
- **Expected Outcome:** Errors can include optional hints
- **Scope:** Error class enhancement
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** Error with hint shows hint in output
- **Confidence:** high
- **Risks:** None

### HINTS-002: Add authentication hints

- **Intent:** Guide users on auth setup
- **Expected Outcome:** 401/403 includes token setup hint
- **Scope:** HTTP status detection, auth hints
- **Files:** `src/index.ts`
- **Dependencies:** HINTS-001
- **Validation:** Private repo error shows GITHUB_TOKEN hint
- **Confidence:** high
- **Risks:** None

### HINTS-003: Add network troubleshooting hints

- **Intent:** Help debug connectivity issues
- **Expected Outcome:** Network errors include connectivity hints
- **Scope:** Error type detection, network hints
- **Files:** `src/index.ts`
- **Dependencies:** HINTS-001
- **Validation:** Timeout error shows network hint
- **Confidence:** high
- **Risks:** None

### HINTS-004: Add "did you mean" for flags

- **Intent:** Catch typos in command line flags
- **Expected Outcome:** `--dryrun` suggests `--dry-run`
- **Scope:** Levenshtein distance, flag matching
- **Files:** `src/index.ts`
- **Dependencies:** HINTS-001
- **Validation:** Typo'd flag shows suggestion
- **Confidence:** medium
- **Risks:** False positives

## Decisions

- **D-001:** Hints to stderr, not stdout — don't pollute machine output
- **D-002:** Keep hints concise — one actionable sentence

## Notes

- Could add `--verbose` hints with more detail
