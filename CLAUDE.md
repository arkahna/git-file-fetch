# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@arkahna/fetch-git-file` is a TypeScript CLI tool that fetches individual files from remote Git repositories without cloning. It uses shallow Git operations and maintains a manifest file (`.git-remote-files.json`) to track fetched files.

## Essential Commands

### Development
```bash
pnpm install              # Install dependencies (uses pnpm v10.14.0)
pnpm start               # Run TypeScript directly with ts-node
pnpm build               # Build both main CLI and Nx plugin
pnpm typecheck           # Run TypeScript type checking
pnpm lint                # Run ESLint with auto-fix
pnpm test:smoke          # Run smoke test against real GitHub repo
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
The entire CLI logic is in `src/index.ts` (551 lines). Key components:

1. **URL Parsing**: Custom parser for `<repo.git>@<ref>:<path>` format
2. **Git Operations**: Uses `child_process.spawn` for git commands
3. **Manifest Management**: Reads/writes `.git-remote-files.json`
4. **Error Handling**: Typed errors with stable exit codes

### Nx Plugin
Located in `plugin/executors/fetch/`. Provides Nx workspace integration:
- Schema: `plugin/executors/fetch/schema.json`
- Implementation: `plugin/executors/fetch/executor.ts`
- Build output: `dist/plugin/`

### Key Design Patterns

1. **Single Responsibility**: All CLI logic in one file for simplicity
2. **Functional Style**: Heavy use of pure functions and immutability
3. **Type Safety**: Strict TypeScript with comprehensive type definitions
4. **Error as Values**: Custom error types for different failure modes

### Important Implementation Details

1. **Git Remote Naming**: Uses SHA-256 hash of repo URL for remote names
2. **Path Validation**: Prevents path traversal attacks
3. **Credential Redaction**: Automatically redacts credentials from URLs in output
4. **File Size Limits**: Default 10MB limit, configurable via --max-file-size

## Development Guidelines

### When Adding Features
1. Check PROJECT_TODO.md for planned features and version roadmap
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
pnpm typecheck
pnpm lint
pnpm test:smoke
```