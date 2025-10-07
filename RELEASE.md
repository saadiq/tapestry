# Release Process

This document describes how to create a new release of Tapestry.

## Automated Release (Recommended)

Tapestry uses GitHub Actions to automatically build and publish releases when a version tag is pushed.

### Steps

1. **Bump version and create tag**:
   ```bash
   bun pm version patch  # For patch releases (0.0.1 → 0.0.2)
   bun pm version minor  # For minor releases (0.0.1 → 0.1.0)
   bun pm version major  # For major releases (0.0.1 → 1.0.0)
   ```

   This command will:
   - Update `package.json` with the new version
   - Create a git commit with the version bump
   - Create a git tag (e.g., `v0.0.2`)

2. **Push the commit and tag**:
   ```bash
   git push --follow-tags
   ```

3. **Wait for GitHub Actions**:
   - GitHub Actions will automatically:
     - Build the app for macOS (arm64)
     - Create a GitHub Release
     - Upload the distributable ZIP file
   - Monitor progress at: https://github.com/saadiq/tapestry/actions

4. **Edit the release notes** (optional):
   - Go to https://github.com/saadiq/tapestry/releases
   - Edit the auto-generated release notes to add:
     - Feature highlights
     - Bug fixes
     - Breaking changes
     - Known issues

### Release Note Template

```markdown
## vX.Y.Z

### ✨ Features
- Feature 1
- Feature 2

### 🐛 Bug Fixes
- Fix 1
- Fix 2

### 🔧 Technical Improvements
- Improvement 1
- Improvement 2

### 📝 Platform Support
- macOS (Apple Silicon) - `.zip` distributable
```

## Manual Release (Fallback)

If GitHub Actions fails or you need to build locally:

1. **Update version** in `package.json` manually

2. **Commit and tag**:
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```

3. **Build locally**:
   ```bash
   bun run package && bun run make
   ```

4. **Create release manually**:
   - Go to https://github.com/saadiq/tapestry/releases/new
   - Select the tag you created
   - Add release notes
   - Upload the ZIP from `out/make/zip/darwin/arm64/`
   - Publish

## Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.0.X): Bug fixes, small improvements, no breaking changes
- **Minor** (0.X.0): New features, backward-compatible changes
- **Major** (X.0.0): Breaking changes, major rewrites

## Pre-release Checklist

Before creating a release:

- [ ] All tests pass: `bun test`
- [ ] No linting errors: `bun run lint`
- [ ] Test the built app locally: `bun start`
- [ ] Update `CLAUDE.md` if architecture changed
- [ ] Update `README.md` if user-facing features changed
- [ ] Review recent commits for anything that needs documentation

## Troubleshooting

### GitHub Actions fails with "Resource not accessible"
- Ensure the repository has the correct permissions in `.github/workflows/release.yml`
- The workflow needs `permissions: contents: write`

### Build fails with "Rollup failed to resolve import"
- Add the failing dependency to `external` array in `vite.main.config.mts`
- Common externals: `electron-updater`, `electron-log`

### No publishers configured
- This is expected when running `bun run publish` locally
- GitHub Actions handles publishing automatically
- For local builds, create the release manually on GitHub
