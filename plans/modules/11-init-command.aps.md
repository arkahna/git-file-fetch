<!-- APS: Anvil Plan Specification -->
<!-- Executable only if work items exist and status is Ready. -->

# Init Command Module

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| UX | — | medium | Draft |

## Purpose

Add an `init` command that creates a sample configuration file. Helps users get started quickly with correct syntax and examples.

## In Scope

- Create `.git-file-fetch.json` or `refs.json`
- Include commented examples
- Detect if config already exists (don't overwrite)
- Support `--force` to overwrite

## Out of Scope

- Interactive wizard
- Fetching files during init
- Detecting existing manifest

## Interfaces

**Exposes:**

- `git-file-fetch init` — create sample config
- `git-file-fetch init --force` — overwrite existing

## Acceptance Criteria

- [ ] `init` creates config file with examples
- [ ] Refuses to overwrite existing file
- [ ] `--force` overwrites existing file
- [ ] Created config is valid JSON
- [ ] Examples use realistic repo URLs
- [ ] Comments explain config format

## Work Items

### INIT-001: Parse `init` subcommand

- **Intent:** Recognize init command
- **Expected Outcome:** `git-file-fetch init` invokes handler
- **Scope:** CLI routing
- **Files:** `src/index.ts`
- **Dependencies:** None
- **Validation:** `init --help` shows init help
- **Confidence:** high
- **Risks:** None

### INIT-002: Implement config file creation

- **Intent:** Write sample config file
- **Expected Outcome:** Valid config file created
- **Scope:** File writing with template
- **Files:** `src/index.ts`
- **Dependencies:** INIT-001
- **Validation:** Created file parseable by `--config`
- **Confidence:** high
- **Risks:** None

### INIT-003: Add existence check and `--force`

- **Intent:** Safe default, explicit override
- **Expected Outcome:** Refuses overwrite without --force
- **Scope:** File existence check, force flag
- **Files:** `src/index.ts`
- **Dependencies:** INIT-002
- **Validation:** Second `init` fails, `init --force` succeeds
- **Confidence:** high
- **Risks:** None

## Decisions

- **D-001:** Use `.git-file-fetch.json` as default name — branded, discoverable

## Notes

- Template should show both string and object config formats
