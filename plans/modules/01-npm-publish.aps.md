<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# npm Publishing Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| RELEASE | — | critical | Ready |

## Purpose

Publish git-file-fetch to the npm registry with provenance, making it installable via `npm install git-file-fetch` and runnable via `npx git-file-fetch`.

## In Scope

- Verify package.json metadata is complete
- Set up NPM_TOKEN in GitHub Secrets
- Tag release and trigger publish workflow
- Verify package is accessible post-publish
- Update README badges and documentation

## Out of Scope

- Scoped package publishing (@org/package)
- Publishing to private registries
- Automated changelog generation

## Interfaces

**Depends on:**

- GitHub Actions secrets — `NPM_TOKEN`
- npm registry — public access

**Exposes:**

- `npx git-file-fetch` — global CLI access
- `npm install git-file-fetch` — local installation

## Boundary Rules

- RELEASE must not modify source code functionality
- RELEASE must not change existing CLI behavior

## Acceptance Criteria

- [ ] `npm view git-file-fetch` returns package metadata
- [ ] `npx git-file-fetch --version` prints version number
- [ ] `npx git-file-fetch --help` shows usage
- [ ] Package has provenance attestation on npmjs.com
- [ ] README badges show correct npm version

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Package name already taken | Verify availability: `npm view git-file-fetch` returns 404 |
| Token permissions insufficient | Use `id-token: write` for provenance |
| Publish workflow fails | Test with `npm pack` and local install first |

## Work Items

### NPM-001: Verify npm package name availability

- **Intent:** Confirm `git-file-fetch` is available on npm registry
- **Expected Outcome:** `npm view git-file-fetch` returns E404
- **Scope:** Registry check only
- **Non-scope:** Alternative name selection
- **Files:** None
- **Dependencies:** None
- **Validation:** `npm view git-file-fetch 2>&1 | grep -q "E404"`
- **Confidence:** high
- **Risks:** Name could be claimed between check and publish

### NPM-002: Configure NPM_TOKEN in GitHub Secrets

- **Intent:** Enable automated npm publishing from GitHub Actions
- **Expected Outcome:** Secret `NPM_TOKEN` available to publish workflow
- **Scope:** GitHub repository settings
- **Non-scope:** Token generation (done manually on npmjs.com)
- **Files:** None (manual configuration)
- **Dependencies:** NPM-001
- **Validation:** Push tag and verify workflow accesses secret
- **Confidence:** high
- **Risks:** Token scope must include publish

### NPM-003: Create and push release tag

- **Intent:** Trigger the publish workflow via git tag
- **Expected Outcome:** Tag `v0.1.0` pushed, workflow runs successfully
- **Scope:** Git tag creation and push
- **Non-scope:** Version bump (already at 0.1.0)
- **Files:** None
- **Dependencies:** NPM-002
- **Validation:** `git tag -l v0.1.0` shows tag, GitHub Actions shows green
- **Confidence:** high
- **Risks:** Workflow may fail on first attempt

### NPM-004: Verify published package

- **Intent:** Confirm package is accessible and functional
- **Expected Outcome:** Package installable and runnable
- **Scope:** Post-publish verification
- **Non-scope:** Performance testing
- **Files:** None
- **Dependencies:** NPM-003
- **Validation:** `npx git-file-fetch@0.1.0 --version` prints `0.1.0`
- **Confidence:** high
- **Risks:** npm propagation delay (usually <5 min)

## Decisions

- **D-001:** Publish as unscoped package — simpler, more discoverable
- **D-002:** Use GitHub Actions OIDC for provenance — no long-lived tokens

## Notes

- Existing `.github/workflows/publish.yml` handles the publish process
- Package already configured with `"access": "public"` and `"provenance": true`
