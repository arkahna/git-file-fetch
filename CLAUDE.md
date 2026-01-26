# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`git-file-fetch` is a TypeScript CLI tool that fetches individual files from remote Git repositories without cloning. It uses shallow Git operations and maintains a manifest file (`.git-remote-files.json`) to track fetched files.

## Requirements

- Node.js >= 22
- pnpm v10.18.1+ (specified in packageManager field)

## Essential Commands

### Development

```bash
pnpm install              # Install dependencies
pnpm start               # Run TypeScript directly with ts-node
pnpm build               # Build both main CLI and Nx plugin
pnpm typecheck           # Run TypeScript type checking
pnpm lint                # Run ESLint (no auto-fix by default)
pnpm lint:fix            # Run ESLint with auto-fix
pnpm lint:md             # Run markdownlint on docs
pnpm test:smoke          # Run smoke test against real GitHub repo (requires build first)
```

### Testing Individual Features

```bash
# Test CLI directly during development
pnpm start "https://github.com/user/repo.git@main:file.txt"

# Test with dry-run
pnpm start "https://github.com/user/repo.git@main:file.txt" --dry-run

# Test JSON output
pnpm start "https://github.com/user/repo.git@main:file.txt" --json
```

## Architecture & Code Structure

### Core Implementation

The entire CLI logic is in `src/index.ts`. Key components:

1. **URL Parsing**: Custom parser for `<repo.git>@<ref>:<path>` format
2. **Git Operations**: Uses `child_process.execFileSync` for git commands
3. **Manifest Management**: Reads/writes `.git-remote-files.json`
4. **Error Handling**: Typed errors with stable exit codes

### Nx Plugin

Located in `plugin/executors/fetch/`. Provides Nx workspace integration:

- Schema: `plugin/executors/fetch/schema.json`
- Implementation: `plugin/executors/fetch/executor.ts`
- Build output: Compiled in-place alongside source files

### Key Design Patterns

1. **Single Responsibility**: All CLI logic in one file for simplicity
2. **Functional Style**: Heavy use of pure functions and immutability
3. **Type Safety**: Strict TypeScript with comprehensive type definitions
4. **Error as Values**: Custom error types for different failure modes

### Important Implementation Details

1. **Shallow Fetch Strategy**: Creates temp repo, runs `git init` + `git fetch --depth 1` + `git show` to extract files without full clone
2. **Path Validation**: Prevents path traversal attacks (blocks `..`, absolute paths, null bytes)
3. **Credential Redaction**: Automatically redacts credentials from URLs in output via regex
4. **File Size Limits**: Default 10MB limit, configurable via `--max-bytes` flag
5. **Retry Logic**: Exponential backoff for transient git failures (default: 2 retries, 500ms initial backoff)

### Environment Variables

The CLI respects these environment variables (flags take precedence):

- `FETCH_GIT_FILE_MAX_BYTES` - Maximum file size in bytes
- `FETCH_GIT_FILE_TIMEOUT_MS` - Git operation timeout (default: 60000)
- `FETCH_GIT_FILE_RETRIES` - Number of retry attempts (default: 2)
- `FETCH_GIT_FILE_RETRY_BACKOFF_MS` - Initial backoff between retries (default: 500)

### Error Codes

The CLI uses typed `CliError` exceptions with stable codes:

- `INVALID_PATH` - Path traversal or invalid path format
- `INVALID_REF_FORMAT` - Malformed `<repo>@<ref>:<path>` string
- `CONFIG_NOT_FOUND` / `CONFIG_PARSE_ERROR` / `CONFIG_INVALID` - Config file issues
- `GIT_COMMAND_FAILED` - Git operation failure
- `SOURCE_FILE_NOT_FOUND` - Requested file doesn't exist in repo
- `FILE_TOO_LARGE` - File exceeds max bytes limit
- `DEST_OUT_OF_BOUNDS` - Destination path escapes output directory

## Development Guidelines

### When Adding Features

1. Check docs/roadmap.md for planned features and version roadmap
2. Update both TypeScript types and runtime validation
3. Add appropriate error handling with meaningful exit codes
4. Update usage examples in the help text

### When Modifying Git Operations

1. Test on Windows, macOS, and Linux (CI covers this)
2. Ensure compatibility with Git 2.25+
3. Handle both HTTPS and SSH URLs
4. Test with various ref types (branches, tags, commits)

### TypeScript Configuration

- Two separate configs: `tsconfig.json` (main) and `tsconfig.plugin.json` (Nx plugin)
- Target ES2022, output ES modules
- Strict mode is enabled - maintain type safety

### Before Committing

Always run these commands to ensure code quality:

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test:smoke
```
