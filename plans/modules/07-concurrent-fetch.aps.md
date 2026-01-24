<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Concurrent Fetch Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| PERF | — | high | Draft |

## Purpose

Enable parallel file fetching to dramatically reduce total time when processing multiple files. A config with 20 files should complete in ~4x time of one file, not 20x.

## In Scope

- Parallel git operations with configurable concurrency
- Progress tracking across concurrent operations
- Error handling without failing entire batch
- `--concurrency N` flag

## Out of Scope

- Connection pooling
- Rate limiting per host
- Streaming/partial downloads

## Interfaces

**Depends on:**

- Existing fetch logic — `fetchFileMinimal()`
- Promise-based execution

**Exposes:**

- `--concurrency N` — limit parallel operations (default: 4)
- Parallel execution of fetch/update/verify

## Acceptance Criteria

- [ ] Multiple files fetch in parallel
- [ ] Default concurrency is 4
- [ ] `--concurrency 1` forces sequential execution
- [ ] Errors in one file don't block others
- [ ] All results collected and reported together
- [ ] Total time significantly less than sequential

## Work Items

### CONCURRENT-001: Refactor fetch to async/Promise-based

- **Intent:** Enable concurrent execution of fetch operations
- **Expected Outcome:** Fetch returns Promise, can run in parallel
- **Scope:** Convert sync operations to async
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** Single fetch still works correctly
- **Confidence:** medium
- **Risks:** Breaking sync-dependent code

### CONCURRENT-002: Implement concurrent execution pool

- **Intent:** Run multiple fetches with concurrency limit
- **Expected Outcome:** N operations run simultaneously
- **Scope:** Promise pool implementation
- **Files:** `src/index.ts`
- **Dependencies:** CONCURRENT-001
- **Validation:** 4 files with concurrency 2 shows 2 at a time
- **Confidence:** medium
- **Risks:** Resource exhaustion if limit too high

### CONCURRENT-003: Add `--concurrency` flag

- **Intent:** User-configurable parallelism
- **Expected Outcome:** Flag controls concurrent operation count
- **Scope:** CLI parsing, pool configuration
- **Files:** `src/index.ts`
- **Dependencies:** CONCURRENT-002
- **Validation:** `--concurrency 8` runs 8 parallel
- **Confidence:** high
- **Risks:** None

### CONCURRENT-004: Aggregate results and errors

- **Intent:** Collect all results regardless of individual failures
- **Expected Outcome:** Complete report even if some files fail
- **Scope:** Result aggregation, partial success handling
- **Files:** `src/index.ts`
- **Dependencies:** CONCURRENT-002
- **Validation:** 1 of 4 fails, other 3 succeed and report
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Default concurrency 4 — balances speed vs resource usage
- **D-002:** Fail-open model — failures don't stop other fetches

## Notes

- Consider `FETCH_GIT_FILE_CONCURRENCY` env var
- Progress module should show concurrent operation status
