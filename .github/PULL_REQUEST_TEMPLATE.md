# Pull Request

## Name of PR

### Summary

Describe the change and motivation.

### Changes

- [ ] Feature
- [ ] Bug fix
- [ ] Docs
- [ ] CI/Chore

### Checklist

- [ ] Lint passes (`pnpm lint`)
- [ ] Markdown lint passes (`pnpm lint:md`)
- [ ] Types compile (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Tests pass (if added)
- [ ] Docs/README updated

### Testing notes

Steps or commands to verify:

```bash
node dist/index.js "https://github.com/octokit/core.js.git@main:LICENSE" --dry-run --json
```

### Related issues

Link issues (e.g., Fixes #123).
