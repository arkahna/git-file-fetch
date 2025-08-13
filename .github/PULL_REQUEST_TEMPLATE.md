### Summary
Describe the change and motivation.

### Changes
- [ ] Feature
- [ ] Bug fix
- [ ] Docs
- [ ] CI/Chore

### Checklist
- [ ] Lint passes (`pnpm lint:check`)
- [ ] Types compile (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Tests pass (if added)
- [ ] Docs/README updated

### Testing notes
Steps or commands to verify:
```
node dist/index.js "https://github.com/octokit/core.js.git@main:LICENSE" --dry-run --json
```

### Related issues
Link issues (e.g., Fixes #123).