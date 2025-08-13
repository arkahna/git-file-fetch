# Configuration

## Overview

`fetch-git-file` supports multiple configuration methods to make it easy to manage file dependencies across different projects and environments.

## Configuration Methods

### 1. Command Line Arguments

The simplest way to configure the tool is through command line arguments:

```bash
npx @arkahna/fetch-git-file "https://github.com/user/repo.git@main:src/file.ts"
```

### 2. Configuration Files

For multiple files or complex setups, use the `--config` option with a JSON file:

```bash
npx @arkahna/fetch-git-file --config refs.json --out vendor
```

### 3. Environment Variables

Configure behavior through environment variables:

```bash
export FETCH_GIT_FILE_MAX_BYTES=5000000  # 5MB limit
export FETCH_GIT_FILE_TIMEOUT_MS=30000   # 30 second timeout
npx @arkahna/fetch-git-file "https://github.com/user/repo.git@main:file.txt"
```

## Configuration File Format

### Basic Array Format

The simplest configuration is an array of strings:

```json
[
  "https://github.com/user/repo.git@main:src/utils/logger.ts",
  "https://github.com/user/repo.git@v1.2.3:LICENSE",
  "https://github.com/another/repo.git@develop:config/settings.json"
]
```

### Advanced Object Format

For more control, use objects with explicit properties:

```json
[
  {
    "repo": "https://github.com/user/repo.git",
    "ref": "main",
    "path": "src/utils/logger.ts"
  },
  {
    "repo": "https://github.com/user/repo.git",
    "ref": "v1.2.3",
    "path": "LICENSE",
    "dest": "third_party/LICENSE"
  },
  {
    "repo": "https://github.com/another/repo.git",
    "ref": "develop",
    "path": "config/settings.json",
    "dest": "config/external-settings.json"
  }
]
```

### Object Properties

- **repo** (required): The Git repository URL
- **ref** (optional): Branch, tag, or commit (defaults to `main`)
- **path** (required): Path to the file within the repository
- **dest** (optional): Custom destination path (defaults to the same path as source)

## Manifest Configuration

### Manifest File

The tool automatically creates and maintains a manifest file (`.git-remote-files.json` by default) that tracks all fetched files:

```json
[
  {
    "repo": "https://github.com/user/repo.git",
    "ref": "main",
    "filePath": "src/utils/logger.ts",
    "destPath": "src/utils/logger.ts",
    "commitSha": "abc123def4567890abcdef1234567890abcdef12"
  }
]
```

### Manifest Policy

You have two options for managing the manifest file:

#### Option 1: Commit to Repository (Recommended for CI)

```bash
# Add to version control
git add .git-remote-files.json
git commit -m "Add external file manifest"
```

This ensures reproducible builds in CI/CD environments.

#### Option 2: Ignore Locally

```bash
# Add to .gitignore
echo ".git-remote-files.json" >> .gitignore
```

This keeps the manifest local to your development environment.

### Custom Manifest Path

Override the default manifest location:

```bash
npx @arkahna/fetch-git-file \
  --manifest ./config/external-files.json \
  "https://github.com/user/repo.git@main:file.txt"
```

## Output Configuration

### Output Directory

Specify where fetched files should be placed:

```bash
npx @arkahna/fetch-git-file \
  --out ./third_party \
  "https://github.com/user/repo.git@main:src/file.ts"
```

### Working Directory

Change the working directory before running:

```bash
npx @arkahna/fetch-git-file \
  --cwd ./subproject \
  --out ./deps \
  "https://github.com/user/repo.git@main:file.txt"
```

## Network Configuration

### Timeouts and Retries

Configure network behavior:

```bash
npx @arkahna/fetch-git-file \
  --timeout-ms 30000 \
  --retries 3 \
  --retry-backoff-ms 1000 \
  "https://github.com/user/repo.git@main:file.txt"
```

### Environment Variables

Set defaults via environment variables:

```bash
# .env file or shell configuration
FETCH_GIT_FILE_TIMEOUT_MS=30000
FETCH_GIT_FILE_RETRIES=3
FETCH_GIT_FILE_RETRY_BACKOFF_MS=1000
FETCH_GIT_FILE_MAX_BYTES=5000000
```

## CI/CD Configuration

### GitHub Actions

```yaml
name: Fetch Dependencies
on: [push, pull_request]
jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: |
          npx @arkahna/fetch-git-file \
            --config deps.json \
            --out third_party \
            --json \
            --quiet
```

### GitLab CI

```yaml
fetch-deps:
  image: node:20
  script:
    - npx @arkahna/fetch-git-file --config deps.json --out third_party --json
  artifacts:
    paths:
      - third_party/
```

## Configuration Examples

### Development Dependencies

```json
[
  "https://github.com/prettier/prettier.git@main:package.json",
  "https://github.com/eslint/eslint.git@main:lib/rules/index.js"
]
```

### Documentation Templates

```json
[
  {
    "repo": "https://github.com/user/templates.git",
    "ref": "v2.0.0",
    "path": "README.md",
    "dest": "docs/README-template.md"
  }
]
```

### Build Scripts

```json
[
  {
    "repo": "https://github.com/user/build-tools.git",
    "ref": "main",
    "path": "scripts/build.sh",
    "dest": "tools/build.sh"
  }
]
```

## Private Repository Authentication

### GitHub

For private GitHub repositories, use one of these authentication methods:

```bash
# Option 1: Personal Access Token (PAT)
export GITHUB_TOKEN=ghp_your_token_here
npx fetch-git-file "https://github.com/org/private-repo.git@main:src/config.json"

# Option 2: SSH with SSH agent
npx fetch-git-file "git@github.com:org/private-repo.git@main:src/config.json"

# Option 3: GitHub CLI authentication
gh auth login
npx fetch-git-file "https://github.com/org/private-repo.git@main:src/config.json"
```

### GitLab

```bash
# Option 1: Personal Access Token
export GITLAB_TOKEN=glpat_your_token_here
npx fetch-git-file "https://gitlab.com/group/private-repo.git@main:src/config.json"

# Option 2: SSH
npx fetch-git-file "git@gitlab.com:group/private-repo.git@main:src/config.json"
```

### Azure DevOps

```bash
# Personal Access Token
export AZURE_DEVOPS_TOKEN=your_token_here
npx fetch-git-file "https://dev.azure.com/org/project/_git/repo@main:src/config.json"
```

### CI/CD Authentication

In CI environments, use appropriate secrets:

```yaml
# GitHub Actions
- name: Fetch private dependencies
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    npx fetch-git-file "https://github.com/org/private-repo.git@main:src/config.json"

# GitLab CI
fetch-private:
  variables:
    GITLAB_TOKEN: $GITLAB_TOKEN
  script:
    - npx fetch-git-file "https://gitlab.com/group/private-repo.git@main:src/config.json"
```

**Important**: Never commit authentication tokens to your repository. Use environment variables or CI secrets.

## Best Practices

1. **Use Configuration Files**: For multiple files or team projects
2. **Version Control Manifests**: Commit `.git-remote-files.json` for reproducibility
3. **Environment-Specific Configs**: Use different config files for dev/staging/prod
4. **Document Dependencies**: Keep configuration files well-documented
5. **Regular Updates**: Periodically review and update external dependencies
6. **Secure Authentication**: Use environment variables or CI secrets for private repos
7. **Validate Sources**: Only fetch from trusted repositories and branches
