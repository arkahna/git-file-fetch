# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog (https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

## [0.1.0] - 2025-01-13

### Added
- Initial release of `@arkahna/fetch-git-file` CLI
- Support for fetching single/multiple files from remote Git repositories
- Shallow Git operations without full repository cloning
- Manifest tracking via `.git-remote-files.json`
- Cross-platform support (Windows, macOS, Linux)
- Node.js 18+ support
- Command line flags:
  - `--dry-run` - Simulate without writing files
  - `--force` - Overwrite existing files
  - `--out` - Specify output directory
  - `--cwd` - Change working directory
  - `--manifest` - Custom manifest path
  - `--max-bytes` - File size limits
  - `--config` - JSON configuration file support
  - `--timeout-ms` - Git operation timeouts
  - `--retries` - Retry configuration
  - `--retry-backoff-ms` - Exponential backoff
  - `--eject` - Skip manifest updates
  - `--json` - Machine-readable output
  - `--quiet` - Suppress logs
  - `--verbose` - Debug logging
- Nx executor for monorepo integration
- CI/CD workflows with GitHub Actions
- Comprehensive error handling with stable exit codes

### Security
- Automatic redaction of credentials in URLs
- Path traversal prevention
- Input validation for all file operations
- File size limits to prevent resource exhaustion