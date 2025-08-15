# CI Integration

This guide covers how to integrate `@arkahna/git-file-fetch` into your CI/CD pipelines for automated file fetching and verification.

## Overview

`@arkahna/git-file-fetch` is designed to work seamlessly in CI environments, providing:

- **Reproducible builds** through manifest tracking
- **Dry-run verification** without file modifications
- **JSON output** for machine-readable results
- **Stable error codes** for automation

## Basic CI Example

### GitHub Actions

```yaml
name: Verify Dependencies
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      
      - name: Verify external files
        run: |
          npx @arkahna/git-file-fetch \
            "https://github.com/octokit/core.js.git@main:LICENSE" \
            "https://github.com/microsoft/TypeScript.git@main:README.md" \
            --dry-run \
            --json \
            --quiet
```

### GitLab CI

```yaml
verify:
  image: node:20-alpine
  before_script:
    - apk add --no-cache git
  script:
    - npx @arkahna/git-file-fetch "https://github.com/user/repo.git@main:src/config.json" --dry-run
```

### Jenkins Pipeline

```groovy
pipeline {
    agent { label 'nodejs' }
    stages {
        stage('Verify Dependencies') {
            steps {
                sh '''
                    npx @arkahna/git-file-fetch \\
                        "https://github.com/user/repo.git@main:src/utils.ts" \\
                        --dry-run \\
                        --json
                '''
            }
        }
    }
}
```

## Advanced CI Patterns

### 1. Dependency Verification

Verify that external files haven't changed unexpectedly:

```yaml
- name: Verify external dependencies
  run: |
    # Fetch files and compare with manifest
    npx @arkahna/git-file-fetch --config deps.json --dry-run --json > verification.json
    
    # Check if any files have changed
    if jq -e '.results[] | select(.status != "unchanged")' verification.json; then
      echo "External dependencies have changed!"
      exit 1
    fi
```

### 2. Automated Updates

Update external files on a schedule:

```yaml
name: Update Dependencies
on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Update external files
        run: |
          npx @arkahna/git-file-fetch --config deps.json --out third_party
      
      - name: Commit changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add third_party/ .git-remote-files.json
          git commit -m "Update external dependencies" || exit 0
          git push
```

### 3. Multi-Environment Testing

Test against different environments:

```yaml
strategy:
  matrix:
    environment: [staging, production]
    node-version: [18, 20]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Test with ${{ matrix.environment }} config
        run: |
          npx @arkahna/fetch-git-file \
            --config configs/${{ matrix.environment }}.json \
            --dry-run \
            --json
```

## Configuration Files

### Basic Configuration

```json
[
  "https://github.com/user/repo.git@main:src/config.json",
  "https://github.com/another/repo.git@v1.0.0:LICENSE"
]
```

### Advanced Configuration

```json
[
  {
    "repo": "https://github.com/user/repo.git",
    "ref": "main",
    "path": "src/utils.ts",
    "dest": "vendor/utils.ts"
  },
  {
    "repo": "https://github.com/another/repo.git",
    "ref": "develop",
    "path": "templates/readme.md",
    "dest": "docs/external-readme.md"
  }
]
```

## Best Practices

### 1. Use Dry-Run for Verification

Always use `--dry-run` in CI to verify files without modifying your repository:

```bash
npx @arkahna/git-file-fetch --config deps.json --dry-run --json
```

### 2. Commit the Manifest

Include `.git-remote-files.json` in your repository for reproducible builds:

```bash
git add .git-remote-files.json
git commit -m "Update dependency manifest"
```

### 3. Set Appropriate Timeouts

Configure timeouts for network operations in CI:

```bash
export FETCH_GIT_FILE_TIMEOUT_MS=30000  # 30 seconds
export FETCH_GIT_FILE_RETRIES=3
npx @arkahna/git-file-fetch --config deps.json
```

### 4. Use JSON Output for Automation

Parse JSON output for programmatic handling:

```bash
npx @arkahna/git-file-fetch --config deps.json --json | jq '.results[] | select(.status == "error")'
```

### 5. Handle Authentication

For private repositories, use appropriate authentication:

```yaml
- name: Fetch private dependencies
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    npx @arkahna/git-file-fetch \
      "https://github.com/org/private-repo.git@main:src/config.json" \
      --dry-run
```

## Error Handling

### Exit Codes

- `0` - Success
- `1` - One or more fetches failed
- `2` - Invalid usage

### Common CI Issues

1. **Authentication failures** - Ensure proper tokens are configured
2. **Network timeouts** - Increase timeout values for slow networks
3. **File size limits** - Adjust `--max-bytes` for large files
4. **Git availability** - Ensure Git is available in CI environment

### Debugging

Enable verbose output for troubleshooting:

```bash
npx @arkahna/git-file-fetch --config deps.json --verbose --dry-run
```

## Security Considerations

- **Never commit secrets** - Use environment variables for tokens
- **Validate file sources** - Only fetch from trusted repositories
- **Set file size limits** - Prevent abuse through large file downloads
- **Use dry-run in CI** - Verify without making changes

## Examples Repository

See [examples/ci-workflows](https://github.com/arkahna/git-file-fetch/tree/main/examples/ci-workflows) for complete working examples of various CI integrations.
