# Project Roadmap

## Overview

`fetch-git-file` is a lightweight CLI tool designed to fetch individual files from remote Git repositories and track them locally for reproducibility. This roadmap outlines our development phases, from initial release to future enhancements.

## Current Status: Pre-Release 🚧

We're currently in the final stages of preparation before our first npm release. The core functionality is complete and tested across multiple platforms.

### ✅ Completed (Pre-Release)

- [x] **Repository Setup**: Renamed to `fetch-git-file` with aligned npm package name
- [x] **License**: MIT license added
- [x] **Package Metadata**: Complete with all required fields
- [x] **Documentation**: Comprehensive README with install, quickstart, CLI synopsis, examples
- [x] **CLI Help**: Clear flags, examples, and exit codes
- [x] **Manifest Policy**: Documented both commit and .gitignore patterns
- [x] **Security Basics**: Token redaction, path traversal prevention, input validation, file size limits
- [x] **CI/CD**: Matrix builds on Ubuntu, macOS, Windows across Node 18/20/22
- [x] **Release Workflow**: Automated npm publish with provenance
- [x] **Smoke Tests**: Validated against public repos on all platforms
- [x] **Error Handling**: Documented non-zero exit codes with stable error identifiers
- [x] **Telemetry**: None by default (documented)
- [x] **Final Dry-run**: npm pack tested in fresh project

### 🚧 In Progress

- [ ] **NPM Token Setup**: Set `NPM_TOKEN` in GitHub → Settings → Secrets → Actions

## Phase 1: v1.0 - Foundation Release 🎯

**Timeline**: Immediate post-release  
**Focus**: Stability and essential features

### TODO Checklist
- [x] **Config File Support**: Add `--config <file>` to read multiple refs from JSON
- [x] **Error Handling**: Better error codes/messages for CI (non-zero on any failure); `--json` structured output
- [x] **Cross-Platform**: Windows path normalization (`\` and `//`); ensure safe relative writes
- [x] **Core Flags**: `--dry-run`, `--out <dir>`, `--cwd <dir>`, `--manifest <path>`
- [x] **Performance**: Shallow operations with minimal `git fetch` + `git show`; ready for `git archive`
- [x] **Network Resilience**: Timeouts and retries with backoff for network/git operations
- [x] **Logging**: Configurable verbosity levels (`--quiet`, `--verbose`)
- [x] **Testing**: Basic e2e test - fetch file from GitHub public repo; verify content and path

### Success Criteria
- All v1.0 TODO items completed
- CI green across all platforms
- npm package published and accessible
- Smoke tests pass on all supported OS

## Phase 2: v1.1 - Workflow Enhancement 🚀

**Timeline**: Q2 2024  
**Focus**: Advanced workflows and provider support

### TODO Checklist
- [ ] **Update Command**: Implement `update` command to re-fetch items from manifest
- [ ] **Verify Command**: Add `verify` command to diff local vs remote @ recorded ref (CI-friendly); `--changed-only` flag
- [ ] **Concurrency**: Add concurrency flag for multiple fetches (Promise-based); sensible default, limit via `--concurrency`
- [ ] **Provider Abstraction**: Create provider support abstraction - GitHub first; prepare interfaces for GitLab/Bitbucket
- [ ] **Enhanced Auth**: Support auth modes - `GITHUB_TOKEN`, PAT envs, SSH (optional), HTTPS with basic token; document precedence
- [ ] **Network Features**: Add proxy support via envs; custom user-agent; rate-limit handling

### Technical Improvements
- Promise-based concurrency with configurable limits
- Provider interface abstraction for future extensibility
- Enhanced authentication flow documentation

## Phase 3: v1.2 - Polish & Performance ✨

**Timeline**: Q3 2024  
**Focus**: User experience and performance optimization

### TODO Checklist
- [ ] **Branded Config**: Optional `.fetch-git-file.json` branded config (keep `.git-remote-files.json` compatibility)
- [ ] **Archive Mode**: Add `--archive` mode to avoid full clone when possible
- [ ] **Unit Testing**: Create basic unit tests - dry-run path, parser, manifest writing; coverage target ≥85%
- [ ] **CLI UX**: Better `--help` with subcommands; examples; shell completion stubs (bash/zsh)
- [ ] **Performance**: Implement cache for temp clones/archives per URL@ref within run; parallel fetch chunking
- [ ] **Integrity**: Add content integrity with checksum recording in manifest; `verify` validates checksum optionally

### Quality Goals
- Comprehensive test coverage
- Performance benchmarks established
- Enhanced user experience documentation

## Phase 4: v2.0 - Nx Plugin Ecosystem 🔌

**Timeline**: Q4 2024  
**Focus**: Nx workspace integration

### TODO Checklist
- [ ] **Executor Package**: Spin out `@arkahna/nx-fetch-git-file` executor + `nx add` generator
- [ ] **Example Workspace**: Create E2E example workspace + docs (include CI usage)
- [ ] **Caching Config**: Add caching config for outputs if you add `update`/`verify` targets
- [ ] **Release Automation**: Version alignment and release automation between core and plugin

### Integration Features
- Version alignment between core and plugin
- Automated release coordination
- Comprehensive Nx workspace examples

## Documentation & Developer Experience 📚

### TODO Checklist
- [ ] **Documentation Site**: Create docs site or README sections - configuration schema, examples, CI snippets (GitHub Actions, GitLab CI)
- [ ] **Troubleshooting Guide**: Document auth failures, SSH vs HTTPS, path issues, Windows notes
- [ ] **Contribution Guide**: Add `CONTRIBUTING.md`, code of conduct, issue/PR templates
- [ ] **Release Documentation**: Changelog automation and release notes style
- [ ] **Examples**: Create example manifests and before/after diffs

## Security & Compliance 🔒

### TODO Checklist
- [ ] **Secret Handling**: Ensure secret redaction in logs; zero token echo
- [ ] **Path Security**: Path sanitization; block absolute and parent (`..`) escapes
- [ ] **Network Security**: Limit network sources to declared providers; validate URLs
- [ ] **Dependency Security**: Dependency audit in CI (`npm audit` or OSS review); lockfile committed
- [ ] **Supply Chain**: Add provenance on publish; SLSA generator if feasible

## Release Operations 🚀

### TODO Checklist
- [ ] **Versioning Policy**: Document SemVer policy
- [ ] **Pre-release Channel**: Setup channel for canaries (e.g., `@next`)
- [ ] **Post-publish Validation**: Smoke test on all OS with released version
- [ ] **Rollback Process**: Document rollback procedures

## Long-term Vision 🌟

### Provider Expansion
- [ ] **GitLab Integration**: Additional providers - GitLab with per-provider auth helpers
- [ ] **Bitbucket Support**: Bitbucket Cloud and Server compatibility
- [ ] **Custom Providers**: Plugin system for custom resolvers

### Advanced Features
- [ ] **SSH-Only Environments**: Enhanced SSH support; private submodules handling
- [ ] **HTTP Caching**: ETag/If-None-Match for hosted APIs
- [ ] **Partial Fetch**: Range-based downloads for large files (where API supports)
- [ ] **VS Code Integration**: Task templates and snippet examples
- [ ] **Telemetry**: Opt-in telemetry with privacy policy

### Developer Experience
- **Plugin Architecture**: Extensible resolver system
- **Usage Analytics**: Optional telemetry with privacy controls
- **Documentation**: Comprehensive guides and troubleshooting

## Quality Assurance Matrix

### TODO Checklist
- [ ] **Platform Testing**:
  - [ ] OS: Linux, macOS, Windows
  - [ ] Node: 18, 20, 22
  - [ ] Providers: GitHub public, GitHub private (token), rate-limited scenario
- [ ] **Feature Testing**:
  - [ ] Single file fetch
  - [ ] Multiple files via `--config`
  - [ ] `update` command functionality
  - [ ] `verify` command functionality
  - [ ] `--archive` mode
  - [ ] Windows path handling
- [ ] **Edge Case Testing**:
  - [ ] Large file fetch tests
  - [ ] Binary file fetch tests
  - [ ] Path traversal attempts blocked
- [ ] **CI/CD Pipeline**:
  - [ ] Cross-platform matrix builds
  - [ ] Security scanning and dependency audits
  - [ ] Release automation with provenance

## Release Strategy

### Versioning Policy
- **Semantic Versioning**: Following SemVer 2.0 specification
- **Patch releases**: Bug fixes and minor improvements (1.0.x)
- **Minor releases**: New features, backward compatible (1.x.0)
- **Major releases**: Breaking changes (x.0.0)
- **Pre-release Channels**: Canary builds via `@next` tag
- **LTS Support**: Extended support for stable releases

### Release Process
1. **Automated Testing**: Full matrix validation
2. **Security Review**: Dependency and code security audit
3. **Documentation**: Updated guides and changelog
4. **Publishing**: npm release with provenance
5. **Post-release Validation**: Smoke tests on all platforms

## Contributing to the Roadmap

We welcome community input on our roadmap priorities. Please:

1. **Review Issues**: Check existing issues for feature requests
2. **Discuss Proposals**: Open discussions for major features
3. **Submit PRs**: Contribute to active development phases
4. **Report Bugs**: Help maintain quality across platforms

## Success Metrics & Definitions of Done

### Phase Completion Criteria
- **Pre-publish**: All must-do items checked, CI green on matrix, npm package published, smoke tests pass
- **v1.0**: Flags and error model stable, docs updated, unit + e2e green
- **v1.1**: `update`/`verify` implemented with concurrency, provider abstraction in place
- **v1.2**: Config polish, archive mode, coverage target met, performance and integrity improvements
- **v2.0**: Full Nx integration with example workspace

### Quality Targets
- **Test Coverage**: ≥85% for v1.2+
- **Performance**: <2s for single file fetch
- **Reliability**: 99.9% success rate on supported platforms
- **Documentation**: Comprehensive guides for all features

## Issue Labels

Recommended labels for tracking work:
- `type:feat`, `type:fix`, `type:docs`, `type:ci`, `type:security`
- `platform:win`, `provider:github`, `area:cli`, `area:manifest`
- `good first issue`

---

*This roadmap is a living document and will be updated as we progress through development phases. For the latest status, check our [GitHub Issues](https://github.com/arkahna/fetch-git-file/issues) and [Releases](https://github.com/arkahna/fetch-git-file/releases).*
