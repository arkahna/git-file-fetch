# Getting Started

## Overview

`fetch-git-file` is a lightweight CLI tool designed to fetch individual files from remote Git repositories and track them locally for reproducibility. It's perfect for:

- **CI/CD pipelines** that need specific files from external repos
- **Development workflows** that require external dependencies
- **Documentation projects** that reference files from other repositories
- **Build systems** that need to fetch configuration or template files

## Quick Start

### Option 1: Run without installing (recommended for one-time use)

You can run it directly with npx without installing anything:

```bash
npx @arkahna/fetch-git-file "https://github.com/user/repo.git@main:path/to/file.ts"
```

### Option 2: Install as a dependency (recommended for projects)

Add it to your project for consistent versioning:

```bash
# Using npm
npm install -D @arkahna/fetch-git-file

# Using pnpm
pnpm add -D @arkahna/fetch-git-file

# Using yarn
yarn add -D @arkahna/fetch-git-file
```

Then run:

```bash
npx @arkahna/fetch-git-file "https://github.com/user/repo.git@main:path/to/file.ts"
```

### Option 3: Test the project locally

*This is the only option currently available for testing the project before it's published to npm.*

If you're developing or want to test the project:

```bash
# Clone and setup
git clone https://github.com/arkahna/fetch-git-file.git
cd fetch-git-file
pnpm install

# Build the project
pnpm build

# Test with a simple example
node dist/index.js "https://github.com/octokit/core.js.git@main:LICENSE" --dry-run

# Or run the smoke test
pnpm run test:smoke
```

## Requirements

- **Git** available on your PATH
- **Node.js** >= 18

## Basic Usage

The basic command format is:

```bash
fetch-git-file '<repo.git>@<ref>:<path>'
```

Where:

- **repo.git**: Full git URL (https, ssh also works if your environment supports it)
- **ref**: Branch, tag, or commit-ish (defaults to `main` if omitted)
- **path**: Path to the file within the repo at the given ref

## Examples

```bash
# Fetch a single file
npx fetch-git-file "https://github.com/user/repo.git@main:src/utils/logger.ts"

# Fetch with specific tag
npx fetch-git-file "https://github.com/user/repo.git@v1.2.3:LICENSE"

# Dry run (simulate without writing files)
npx fetch-git-file "https://github.com/user/repo.git@main:src/file.ts" --dry-run

# Specify output directory
npx fetch-git-file "https://github.com/user/repo.git@main:tools/script.sh" --out third_party
```

## What Happens

1. **Shallow Fetch**: The tool performs a shallow fetch of the target ref without a full clone
2. **File Extraction**: Reads the file at that specific commit using `git show`
3. **Local Copy**: Copies the requested file(s) into your current working directory (or `--out`)
4. **Manifest Update**: Writes an entry for each fetched file to a manifest for tracking provenance

## CI Usage Example

```yaml
name: verify
on: [push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx fetch-git-file "https://github.com/octokit/core.js.git@main:LICENSE" --dry-run --json
```

## Nx Integration

This package includes a thin Nx executor for Nx workspaces:

```json
{
  "targets": {
    "fetch": {
      "executor": "@arkahna/fetch-git-file:fetch",
      "options": {
        "args": "https://github.com/user/repo.git@main:src/utils/logger.ts"
      }
    }
  }
}
```

Then run: `nx run my-project:fetch`

## Development

- Build: `pnpm build`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Dev: `pnpm start`
