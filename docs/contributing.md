# Contributing to `fetch-git-file`

Thanks for taking the time to contribute! This project is a small, focused CLI (with a thin Nx executor) that fetches specific files from remote Git repositories and records provenance.

- **Binary**: `fetch-git-file`
- **Node**: >= 18
- **Packages**: TypeScript, ESLint, Prettier

## Getting started

- Fork and clone the repo
- Ensure you have Node 18/20/22 available and `pnpm` installed
- Install deps:

```bash
pnpm install --frozen-lockfile
```

- Useful commands:

```bash
pnpm start        # run via ts-node (dev)
pnpm typecheck    # TS type checking (no emit)
pnpm lint         # ESLint with --fix
pnpm lint:check   # ESLint without --fix
pnpm build        # compile to dist/
pnpm test:smoke   # quick dry-run smoke test
```

## Development workflow

1. Create a feature branch from `main`.
2. Make changes in `src/` (CLI) and/or `plugin/` (Nx executor).
3. Keep changes minimal and focused; add tests where relevant (e2e smoke exists in CI).
4. Run locally:
   - `pnpm lint:check && pnpm typecheck && pnpm build`
   - Optionally exercise the CLI: `node dist/index.js "https://github.com/octokit/core.js.git@main:LICENSE" --dry-run --json`
5. Open a PR.

## Project structure

- `src/` – CLI source (TypeScript). Entrypoint: `src/index.ts`.
- `dist/` – build output (generated).
- `plugin/` – Nx executor (`plugin/executors/fetch`). Schema: `schema.json`.
- `.github/workflows/` – CI (verify, publish).

## Coding standards

- TypeScript strict mode is enabled. Prefer explicit types on public functions and exported APIs.
- Use meaningful names; avoid abbreviations.
- Keep control-flow simple; use early returns and handle error cases first.
- Formatting/linting is enforced by ESLint + Prettier. Run `pnpm lint`.

## Commit conventions

- Use clear, concise messages. Example prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`.
- Reference issues when applicable (e.g., `Fixes #123`).

## Pull request checklist

- [ ] Lint passes (`pnpm lint:check`)
- [ ] Types compile (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] README/docs updated as needed
- [ ] CI is green

## Releasing

Releases are tagged `vX.Y.Z`. Pushing a tag triggers the `publish` workflow which builds and publishes to npm with provenance. Maintainers must set `NPM_TOKEN` in GitHub Actions secrets.

## Security

Do not include secrets in test cases, examples, or URLs. The CLI redacts URL userinfo, but never rely on logs to hide accidental secrets. See [Security](security.md) for reporting.

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](code-of-conduct.md).
