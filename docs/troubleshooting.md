# Troubleshooting

## Authentication to private repos

- Ensure `git` can authenticate in your environment:
  - GitHub Actions: set `GITHUB_TOKEN` or configure a PAT via `actions/checkout`.
  - Local: use `gh auth login`, credential helper, or SSH agent.
- Avoid embedding tokens in URLs. The CLI redacts URL userinfo in logs, but never print secrets.

## INVALID_REF_FORMAT

- Ensure the input matches `<repo.git>@<ref>:<path>`
- Examples:
  - `https://github.com/user/repo.git@main:src/file.ts`
  - `git@github.com:user/repo.git@v1.2.3:LICENSE`

## INVALID_PATH

- Absolute paths and parent traversal are rejected. Paths must be relative and stay under the output directory.
- Examples of invalid: `/etc/passwd`, `../../secret`, `~/file`

## SOURCE_FILE_NOT_FOUND

- Verify the file exists at the specified ref. Try cloning locally and checking the path.
- Watch for case sensitivity differences.

## FILE_TOO_LARGE

- The default limit is ~10 MB. Increase via `--max-bytes <n>` or env `FETCH_GIT_FILE_MAX_BYTES`.

## DEST_OUT_OF_BOUNDS

- The destination path must resolve under `--out` (or CWD). Remove `..` segments and do not use absolute paths.

## Windows path quirks

- Provide paths using forward slashes in the ref. The CLI will normalize to your OS.
  - Example: `...@main:path/to/file.txt`

## Config file issues

- `CONFIG_NOT_FOUND` / `CONFIG_PARSE_ERROR` / `CONFIG_INVALID` indicate problems reading `--config`.
- The config must be a JSON array of strings or objects `{ repo, ref?, path, dest? }`.

## Manifest policy

- `.git-remote-files.json` is written in the working directory (or `--manifest`). Decide whether to commit it or ignore it via `.gitignore`.

## Verbose logging

- Add `--verbose` to print additional details such as clone path. Add `--quiet` to suppress normal logs.