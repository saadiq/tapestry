# Auto-Update Testing Guide

## Local Testing (Development)

### 1. Prepare Test Versions

```bash
# Start with version 0.0.1
# Edit package.json to ensure version is 0.0.1

# Build the first version
bun run make

# Save this build
cp -r out/make/zip/darwin/arm64/*.zip ~/Desktop/test-v0.0.1.zip
```

### 2. Create a New Version

```bash
# Bump version
bun version patch  # Changes to 0.0.2

# Make a visible change (e.g., add text to main window)
# Build the new version
bun run make
```

### 3. Simulate Update Server

For local testing, you can:
1. Create a local release server using `http-server`
2. Modify the update URL temporarily
3. Test the update flow

## Production Testing

### 1. Pre-Release Checklist

- [ ] Version number updated in package.json
- [ ] All changes committed
- [ ] Tests passing
- [ ] App builds successfully locally

### 2. Create Release

```bash
# Ensure you're on main branch
git checkout main
git pull

# Bump version
bun version patch  # or minor/major

# This creates a commit and tag
git push origin main
git push origin --tags
```

### 3. Monitor GitHub Actions

1. Go to Actions tab in GitHub
2. Watch the "Build and Release" workflow
3. Ensure it completes successfully

### 4. Verify Release

1. Go to Releases page
2. Confirm .zip file is attached
3. Download and test manually

### 5. Test Auto-Update

1. Install the previous version
2. Open the app
3. Wait for update notification (or use Check for Updates)
4. Verify download progress
5. Test "Install Later" and "Install Now" options

## Troubleshooting

### Update Not Detected
- Check app version matches tag version
- Ensure repository is public
- Check GitHub Release is not marked as pre-release
- Look at DevTools console for errors

### Download Fails
- Check network connectivity
- Verify .zip file is properly attached to release
- Check file permissions

### Installation Fails
- Ensure app is not running from read-only location
- Check system permissions
- Try running with admin privileges

## Rollback Procedure

If an update causes issues:

1. Delete the problematic release from GitHub
2. Create a new release with previous version + 1
3. Users will auto-update to the "newer" old version

Example:
- Bad release: v0.0.5
- Delete v0.0.5
- Re-release v0.0.4 as v0.0.6
