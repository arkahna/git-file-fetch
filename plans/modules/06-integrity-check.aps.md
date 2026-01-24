<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Content Integrity Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| SECURITY | — | high | Draft |

## Purpose

Add SHA-256 content checksums to manifest entries for tamper detection. Enables offline verification without network access and provides defense against supply chain attacks.

## In Scope

- Calculate SHA-256 hash of fetched file content
- Store hash in manifest alongside other metadata
- Verify local file matches recorded hash
- Support `verify --offline` using only checksums

## Out of Scope

- Signing manifests (GPG, etc.)
- Hash algorithm selection (always SHA-256)
- Verifying remote content hash

## Interfaces

**Depends on:**

- Node.js crypto — SHA-256 hashing
- Manifest format — new `contentSha256` field

**Exposes:**

- `contentSha256` field in manifest entries
- `verify --offline` — verify using checksums only

## Acceptance Criteria

- [ ] New fetches include `contentSha256` in manifest
- [ ] Existing manifests work without hash (backward compatible)
- [ ] `verify` checks hash when present
- [ ] `verify --offline` works without network
- [ ] Hash mismatch produces clear error with expected vs actual
- [ ] `--json` output includes hash verification status

## Work Items

### INTEGRITY-001: Add hash calculation on fetch

- **Intent:** Calculate SHA-256 of content during fetch
- **Expected Outcome:** Hash computed for every fetched file
- **Scope:** Crypto hash computation
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** Hash matches `sha256sum` of fetched file
- **Confidence:** high
- **Risks:** None

### INTEGRITY-002: Store hash in manifest

- **Intent:** Persist hash in manifest entry
- **Expected Outcome:** `contentSha256` field in manifest JSON
- **Scope:** Manifest schema update
- **Files:** `src/index.ts`
- **Dependencies:** INTEGRITY-001
- **Validation:** Manifest contains 64-char hex hash
- **Confidence:** high
- **Risks:** None

### INTEGRITY-003: Verify hash on verify command

- **Intent:** Check local file against recorded hash
- **Expected Outcome:** Hash verification in verify output
- **Scope:** Hash comparison in verify flow
- **Files:** `src/index.ts`
- **Dependencies:** INTEGRITY-002, VERIFY-003
- **Validation:** Modified file fails hash check
- **Confidence:** high
- **Risks:** None

### INTEGRITY-004: Add `--offline` flag to verify

- **Intent:** Enable verification without network
- **Expected Outcome:** `verify --offline` uses only local hash
- **Scope:** Skip remote fetch when offline flag set
- **Files:** `src/index.ts`
- **Dependencies:** INTEGRITY-003
- **Validation:** `--offline` works with network disabled
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Use SHA-256 — widely supported, secure, matches git internals
- **D-002:** Hash is optional in manifest — backward compatible with existing

## Notes

- Consider adding `--verify-integrity` flag for fetch to re-verify after write
