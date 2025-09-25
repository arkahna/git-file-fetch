# git-file-fetch

[![CI](https://github.com/arkahna/git-file-fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/arkahna/git-file-fetch/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@arkahna-npm/git-file-fetch)](https://www.npmjs.com/package/@arkahna-npm/git-file-fetch)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![node >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](#requirements)

A lightweight CLI to fetch individual files from remote Git repositories and track them locally for reproducibility.

## Quick Start

### 🚀 **Just want to use it?**
```bash
npx @arkahna-npm/git-file-fetch "https://github.com/user/repo.git@main:path/to/file.ts"
```

### 📦 **Want to install it?**
```bash
npm install -D @arkahna-npm/git-file-fetch
npx @arkahna-npm/git-file-fetch "https://github.com/user/repo.git@main:path/to/file.ts"
```

### 🔧 **Want to test/develop it?**
```bash
git clone https://github.com/arkahna/git-file-fetch.git
cd git-file-fetch
pnpm install
pnpm build
node dist/index.js "https://github.com/octokit/core.js.git@main:LICENSE" --dry-run
```

**Available development commands:**
- `pnpm build` - Build the project
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint:check` - Run ESLint checks
- `pnpm lint` - Run ESLint with auto-fix
- `pnpm test:smoke` - Run smoke test

## What it does

- **Shallow Fetch**: Performs a shallow fetch of the target ref without a full clone
- **File Extraction**: Reads the file at that specific commit using `git show`
- **Local Copy**: Copies the requested file(s) into your current working directory
- **Manifest Update**: Writes an entry for each fetched file to a manifest for tracking provenance

## Documentation

- 🚀 [Getting Started](docs/getting-started.md) - Complete setup guide
- 📖 [Usage Guide](docs/usage.md) - CLI options and examples
- ⚙️ [Configuration](docs/configuration.md) - Advanced setup
- 🔧 [Troubleshooting](docs/troubleshooting.md) - Common issues
- 🚀 [CI Integration](docs/ci-integration.md) - CI/CD workflows and automation
- 🛣️ [Roadmap](docs/roadmap.md) - Development plans
- 🤝 [Contributing](docs/contributing.md) - How to contribute
- 🔒 [Security](docs/security.md) - Security policies
- 📋 [Code of Conduct](docs/code-of-conduct.md) - Community guidelines

## Requirements

- **Git** available on your PATH
- **Node.js** >= 22 (supports 22, 23, 24)

## License

MIT © Arkahna

## Originally contributed by [Aneki](https://github.com/joshuaboys)

```text
                  _    _
  __ _ _ __   ___| | _(_)
 / _` | '_ \ / _ \ |/ / |
| (_| | | | |  __/   <| |
 \__,_|_| |_|\___|_|\_\_|

  === ᚢ · ᚦ · ᚲ ===
```
