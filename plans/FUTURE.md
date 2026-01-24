# Future Killer Features (v1.2+)

This document outlines the next wave of high-impact features beyond the v1.1 release.

## Wave 2: Automation & Integration (v1.2)

### Watch Mode with Auto-Update

**Problem:** Developers want external dependencies to stay current automatically during development without manual intervention.

**Solution:** Add `git-file-fetch watch` that monitors source repos and auto-updates files when changes are detected.

```bash
git-file-fetch watch --interval 60s
```

**Key Features:**
- Configurable poll interval
- Webhook support for instant updates (GitHub webhooks)
- Desktop notifications on updates
- Integration with file watchers (nodemon, watchman)

**Impact:** High — Eliminates manual update cycles during active development.

---

### GitHub Actions Native Integration

**Problem:** CI/CD setup requires multiple steps and shell scripting.

**Solution:** Provide a first-party GitHub Action for seamless integration.

```yaml
- uses: joshuaboys/git-file-fetch-action@v1
  with:
    config: deps.json
    verify: true
```

**Key Features:**
- Native action (no npx overhead)
- Built-in caching of fetched files
- PR comments on dependency updates
- Dependency graph integration

**Impact:** High — Reduces CI setup to single step.

---

### VS Code Extension

**Problem:** Developers must switch to terminal to manage external files.

**Solution:** VS Code extension with visual file management.

**Key Features:**
- Sidebar showing tracked external files
- One-click update/verify
- Inline diff viewing
- CodeLens showing external file status
- Command palette integration

**Impact:** Medium-High — Brings functionality to where developers work.

---

## Wave 3: Scale & Enterprise (v1.3)

### Monorepo Workspace Support

**Problem:** Large monorepos need per-package external dependencies with shared config.

**Solution:** Workspace-aware configuration with inheritance.

```
project/
├── .git-file-fetch.json      # Root config (shared deps)
├── packages/
│   ├── pkg-a/
│   │   └── .git-file-fetch.json  # Package-specific deps
│   └── pkg-b/
│       └── .git-file-fetch.json
```

**Key Features:**
- Config inheritance (root + local)
- Workspace-wide update/verify
- Nx/Turborepo integration
- Selective package operations

**Impact:** High — Enables enterprise-scale usage.

---

### Private Registry Support

**Problem:** Enterprises need to proxy external fetches through internal systems.

**Solution:** Support private git proxies and registries.

**Key Features:**
- Mirror configuration
- Registry authentication
- Audit logging
- Access control integration

**Impact:** Medium — Unlocks enterprise adoption.

---

### Lock File with Deterministic Builds

**Problem:** Manifest stores refs but not exact content, making builds potentially non-deterministic.

**Solution:** Add `.git-file-fetch.lock` with exact content hashes and sources.

```json
{
  "lockfileVersion": 1,
  "entries": {
    "src/utils/logger.ts": {
      "source": "https://github.com/user/repo.git",
      "ref": "main",
      "commit": "abc123...",
      "contentSha256": "def456...",
      "fetchedAt": "2025-01-24T10:00:00Z"
    }
  }
}
```

**Key Features:**
- Separate lock file from manifest
- `--frozen` flag for CI (fail if lock mismatch)
- Lock file auto-update on fetch
- `install` command to restore from lock

**Impact:** High — Guarantees reproducible builds.

---

## Wave 4: Ecosystem (v2.0)

### Plugin System

**Problem:** Different teams need custom behaviors (special auth, transforms, etc.).

**Solution:** Plugin architecture for extensibility.

```javascript
// git-file-fetch.config.js
module.exports = {
  plugins: [
    '@company/git-file-fetch-plugin-auth',
    ['./local-plugin.js', { option: true }]
  ]
}
```

**Key Features:**
- Lifecycle hooks (pre-fetch, post-fetch, transform)
- Custom resolvers (private registries, S3, etc.)
- Auth providers
- Content transforms (minify, compile, etc.)

**Impact:** Medium — Enables ecosystem growth.

---

### Template/Scaffold Mode

**Problem:** Users want to scaffold new projects from remote templates.

**Solution:** Add `git-file-fetch scaffold` for project templating.

```bash
git-file-fetch scaffold https://github.com/user/template.git@main \
  --dest ./new-project \
  --vars name=myapp,author=me
```

**Key Features:**
- Variable substitution in files
- Interactive prompts for variables
- Post-scaffold hooks
- Template registries

**Impact:** Medium — Expands use case beyond dependency management.

---

### Archive/Bundle Mode

**Problem:** Some use cases need a single-file bundle of all external deps.

**Solution:** Add `git-file-fetch bundle` to create distributable archives.

```bash
git-file-fetch bundle --config deps.json --out deps.tar.gz
```

**Key Features:**
- Offline distribution
- Signature/verification
- Selective bundling
- Bundle installation

**Impact:** Low-Medium — Niche but valuable for air-gapped environments.

---

## Prioritization Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Watch Mode | High | Medium | P1 |
| GitHub Action | High | Low | P1 |
| Lock File | High | Medium | P1 |
| Monorepo Support | High | High | P2 |
| VS Code Extension | Medium-High | High | P2 |
| Plugin System | Medium | High | P3 |
| Private Registry | Medium | Medium | P3 |
| Template/Scaffold | Medium | Medium | P3 |
| Archive/Bundle | Low-Medium | Low | P4 |

---

## Feedback Requested

We'd love community input on these features:

1. Which features would you use immediately?
2. What's missing from this list?
3. What integrations matter most to you?

Open an issue or discussion at: https://github.com/joshuaboys/git-file-fetch/discussions
