# GitHub Releases & Auto-Update Implementation Plan

## Overview

This document provides a complete implementation guide for adding GitHub Releases and auto-update functionality to the Tapestry Electron application. The system will allow you to release new versions through GitHub tags and enable users to automatically update their installed applications.

### Architecture Summary

1. **Release Process**: Push a version tag → GitHub Actions builds the app → Creates a GitHub Release
2. **Update Process**: App checks GitHub → Notifies user of updates → Downloads and installs update
3. **Technology Stack**:
   - electron-updater (for auto-updates)
   - GitHub Actions (for CI/CD)
   - GitHub Releases (for distribution)

### Key Design Decisions

- **Public Repository**: Updates work seamlessly without authentication
- **Mac-only initially**: Focus on .zip distribution for macOS (ARM/Apple Silicon only)
- **Non-intrusive updates**: Background checks with user-controlled installation
- **Semantic versioning**: Starting with v0.0.1 (early development phase)
- **No code signing initially**: Will add later when ready for broader distribution

## Prerequisites

### Required Accounts & Access
1. GitHub account with repository write access (username: saadiq)
2. Repository must be PUBLIC for auto-updates to work without authentication
3. ~Apple Developer account for code signing~ (skipping for now)

### Testing Approach
- We'll test directly on this repository (no test repo needed)
- This is safe since the app isn't in production yet
- First few releases will be test releases to verify the system works

### Development Environment
- Node.js and bun installed
- Git configured with push access to the repository
- Electron development environment already set up (which you have)

### Understanding the Toolchain

#### Electron Forge
Electron Forge is your build tool that packages the Electron app. Key concepts:
- **Makers**: Create distributable formats (.zip, .dmg, .exe, etc.)
- **Publishers**: Push builds to distribution platforms
- **Config**: Defined in `forge.config.ts`

#### electron-updater
A library that handles auto-updates for Electron apps. Key concepts:
- Checks a URL for update metadata
- Downloads updates in the background
- Replaces the app on restart
- Works with various providers (we'll use GitHub)

#### GitHub Actions
CI/CD platform that runs workflows on GitHub's servers. Key concepts:
- **Workflows**: YAML files defining automated processes
- **Triggers**: Events that start workflows (we'll use tag pushes)
- **Artifacts**: Files produced by workflows (our built app)

## Implementation Status

- ✅ **Phase 1**: Project Configuration - COMPLETED
- ✅ **Phase 2**: GitHub Actions Workflow - COMPLETED
- ⏳ **Phase 3**: Auto-Updater Implementation - PENDING
- ⏳ **Phase 4**: User Interface Components - PENDING
- ⏳ **Phase 5**: Testing & Release Process - PENDING
- ⏳ **Phase 6**: Final Configuration & Polish - PENDING

## Implementation Tasks

### Phase 1: Project Configuration ✅ COMPLETED

---

#### Task 1.1: Add electron-updater dependency ✅

**Status**: ✅ Completed - electron-updater@6.6.2 and electron-log@5.4.3 installed
**Commit**: 7720a53

**Description**: Install the electron-updater package which handles the auto-update functionality.

**Files to modify**:
- `package.json`

**Implementation**:
```bash
# Run this command in the terminal
bun add electron-updater

# This will add electron-updater to your dependencies
```

**Expected changes in package.json**:
```json
"dependencies": {
  ...existing dependencies...
  "electron-updater": "^6.3.9"
}
```

**Testing**:
```bash
# Verify installation
bun list electron-updater

# Should show electron-updater version
```

**Commit**:
```bash
git add package.json bun.lockb
git commit -m "feat: add electron-updater dependency for auto-updates"
```

---

#### Task 1.2: Configure package.json repository and build settings ✅

**Status**: ✅ Completed - version set to 0.0.1, repository and build config added
**Commit**: 2987a4c

**Description**: Add repository information and build configuration so electron-updater knows where to check for updates.

**Files to modify**:
- `package.json`

**Implementation**:
```json
// Add these fields to package.json at the root level
{
  "name": "tapestry",
  "version": "0.0.1",  // Starting version (early development)
  "repository": {
    "type": "git",
    "url": "https://github.com/saadiq/tapestry.git"
  },
  "build": {
    "appId": "com.saadiq.tapestry",
    "productName": "Tapestry",
    "directories": {
      "output": "dist"
    },
    "mac": {
      "category": "public.app-category.productivity"
    },
    "publish": {
      "provider": "github",
      "owner": "saadiq",
      "repo": "tapestry"
    }
  }
}
```

**What these fields do**:
- `repository`: Tells npm/bun where the source code lives
- `build.appId`: Unique identifier for your app (reverse domain notation)
- `build.publish`: Tells electron-updater where to look for updates

**Testing**:
```bash
# Validate JSON syntax
bun run lint

# If no JSON errors, the configuration is valid
```

**Commit**:
```bash
git add package.json
git commit -m "feat: add repository and build configuration for updates"
```

---

#### Task 1.3: Update Forge configuration for proper .zip generation ✅

**Status**: ✅ Completed - forge.config.ts updated with app name, bundle ID, and category
**Commit**: aed0d22

**Description**: Configure Electron Forge to generate .zip files with the correct structure for auto-updates.

**Files to modify**:
- `forge.config.ts`

**Implementation**:
```typescript
// In forge.config.ts, update the packagerConfig and makers

import type { ForgeConfig } from '@electron-forge/shared-types';
// ... other imports ...

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'Tapestry',  // Ensure consistent naming
    appBundleId: 'com.saadiq.tapestry',  // Match package.json
    appCategoryType: 'public.app-category.productivity',
    // Add icon configuration if you have icons
    // icon: './assets/icon', // without extension, Forge auto-detects
  },
  rebuildConfig: {},
  makers: [
    // Keep existing makers, but ensure ZIP maker is configured for Mac
    new MakerZIP({
      // ZIP maker for macOS - this is what electron-updater will download
    }, ['darwin']),
    // ... keep other makers ...
  ],
  // ... rest of config ...
};
```

**Why this matters**:
- electron-updater needs consistent app naming
- .zip files must contain the complete .app bundle
- The appBundleId must match across configurations

**Testing**:
```bash
# Test that the build still works
bun run package

# Check that out/Tapestry-darwin-arm64/ or similar exists
ls -la out/
```

**Commit**:
```bash
git add forge.config.ts
git commit -m "feat: configure Forge for consistent app packaging"
```

---

### Phase 2: GitHub Actions Workflow ✅ COMPLETED

---

#### Task 2.1: Create GitHub Actions release workflow ✅

**Status**: ✅ Completed - Workflow created with dynamic ZIP file detection
**Files Created**: `.github/workflows/release.yml`

**Description**: Create a workflow that automatically builds and releases your app when you push a version tag.

**Critical Fix Applied**: The workflow uses dynamic file detection to handle version format mismatch:
- Git tags use format: `v0.0.1` (with 'v' prefix)
- Electron Forge builds: `Tapestry-darwin-arm64-0.0.1.zip` (no 'v' prefix)
- Solution: Added `find` command to dynamically locate the built ZIP file

**Implementation**:
```yaml
# .github/workflows/release.yml
name: Build and Release

# Trigger on version tags
on:
  push:
    tags:
      - 'v*'  # Matches v0.0.1, v0.1.0, etc.

jobs:
  build-and-release:
    runs-on: macos-latest  # Use macOS runner for ARM Mac builds

    steps:
      # Checkout the code
      - name: Checkout code
        uses: actions/checkout@v4

      # Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      # Install Bun
      - name: Install Bun
        run: |
          curl -fsSL https://bun.sh/install | bash
          echo "$HOME/.bun/bin" >> $GITHUB_PATH

      # Install dependencies
      - name: Install dependencies
        run: bun install

      # Build the app
      - name: Build Electron app
        run: bun run make
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Find the built artifacts
      - name: List build artifacts
        run: |
          echo "Build artifacts:"
          ls -la out/make/
          ls -la out/make/zip/darwin/

      # Find the ZIP file dynamically (handles version format differences)
      - name: Find ZIP file
        id: find_zip
        run: |
          ZIP_PATH=$(find out/make/zip/darwin/arm64 -name "*.zip" -type f | head -n 1)
          echo "Found ZIP: $ZIP_PATH"
          echo "ZIP_PATH=$ZIP_PATH" >> $GITHUB_OUTPUT

      # Create Release
      - name: Create GitHub Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
          body: |
            ## What's Changed
            Auto-generated release for ${{ github.ref }}

            See commit history for changes.

      # Upload the ZIP file
      - name: Upload Mac ZIP
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ${{ steps.find_zip.outputs.ZIP_PATH }}
          asset_name: Tapestry-mac-${{ github.ref_name }}.zip
          asset_content_type: application/zip
```

**How this workflow works**:
1. Triggers when you push a tag starting with 'v'
2. Sets up macOS environment with Node.js and Bun
3. Builds your app using Electron Forge
4. Dynamically finds the built ZIP file (handles version format differences)
5. Creates a GitHub Release
6. Uploads the .zip file to the release with consistent naming

**Testing**: Will be tested when you push your first tag

**Commit**:
```bash
git add .github/workflows/release.yml
git commit -m "feat: add GitHub Actions workflow with dynamic ZIP detection"
```

---

#### Task 2.2: Configure Electron Forge for electron-updater compatibility ✅

**Status**: ✅ Completed - Configuration clarification (no additional files needed)

**Description**: Since we're using Electron Forge (not electron-builder), we need to ensure our Forge configuration generates the proper artifacts for electron-updater.

**Note**: Electron Forge handles the build process, so we don't need a separate electron-builder.yml file. The electron-updater will work with the GitHub releases created by our workflow.

**Key Points**:
- electron-updater can work directly with GitHub releases
- The workflow will create releases with proper .zip files
- electron-updater will automatically find and download updates from GitHub releases
- No need for separate electron-builder configuration when using Forge

**What electron-updater needs from GitHub releases**:
- A .zip file with the app bundle
- Consistent naming (handled by our workflow)
- Proper version tags (v0.0.1, v0.0.2, etc.)

**Testing**: Configuration will be validated during the build process

**Commit**: No files to commit for this task (configuration clarification only)
```

---

### Phase 3: Auto-Updater Implementation

---

#### Task 3.1: Create the updater module

**Description**: Create a module that handles all auto-update logic.

**Files to create**:
- `src/main/updater.ts`

**Implementation**:
```typescript
// src/main/updater.ts
import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';

// Configure logging (optional but helpful for debugging)
import log from 'electron-log';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Store update info for later use
let updateInfo: any = null;
let mainWindow: BrowserWindow | null = null;

/**
 * Initialize the auto-updater
 * @param window - The main application window
 */
export function initAutoUpdater(window: BrowserWindow) {
  mainWindow = window;

  // Configure auto-updater settings
  autoUpdater.autoDownload = false; // We'll control when to download
  autoUpdater.autoInstallOnAppQuit = true; // Install when app closes

  // Set up event handlers
  setupEventHandlers();

  // Check for updates on startup (non-blocking)
  setTimeout(() => {
    checkForUpdates(true); // silent check
  }, 3000); // Wait 3 seconds after startup

  // Set up periodic checks (every 4 hours)
  setInterval(() => {
    checkForUpdates(true); // silent check
  }, 4 * 60 * 60 * 1000);
}

/**
 * Set up all event handlers for the auto-updater
 */
function setupEventHandlers() {
  // When checking for updates starts
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    sendStatusToWindow('checking-for-update');
  });

  // When an update is available
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    updateInfo = info;
    sendStatusToWindow('update-available', info);

    // Show notification in renderer
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseName: info.releaseName,
        releaseDate: info.releaseDate,
      });
    }
  });

  // When no update is available
  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available');
    sendStatusToWindow('update-not-available', info);
  });

  // Error handling
  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    sendStatusToWindow('update-error', err.message);
  });

  // Download progress
  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
    logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`;
    logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`;
    log.info(logMessage);
    sendStatusToWindow('download-progress', progressObj);
  });

  // When update is downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded');
    sendStatusToWindow('update-downloaded', info);

    // Notify renderer that update is ready
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });
}

/**
 * Send status updates to the renderer process
 */
function sendStatusToWindow(status: string, data?: any) {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status, data });
  }
}

/**
 * Manually check for updates
 * @param silent - If true, don't show dialogs for "no update available"
 */
export function checkForUpdates(silent = false) {
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    if (!silent) {
      dialog.showErrorBox(
        'Update Check Failed',
        `Unable to check for updates: ${err.message}`
      );
    }
  });
}

/**
 * Start downloading the update
 */
export function downloadUpdate() {
  autoUpdater.downloadUpdate();
}

/**
 * Quit and install the update
 */
export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}

/**
 * Get the current app version
 */
export function getCurrentVersion(): string {
  return app.getVersion();
}
```

**What this module does**:
- Initializes electron-updater with your GitHub releases
- Checks for updates on startup and every 4 hours
- Sends update status to the renderer process
- Provides functions to control the update process

**Testing**: Will test after integration

**Commit**:
```bash
git add src/main/updater.ts
git commit -m "feat: implement auto-updater module with GitHub integration"
```

---

#### Task 3.2: Add electron-log dependency for update logging

**Description**: Add logging support for better debugging of the update process.

**Implementation**:
```bash
# Install electron-log
bun add electron-log
```

**Testing**:
```bash
bun list electron-log
```

**Commit**:
```bash
git add package.json bun.lockb
git commit -m "feat: add electron-log for update debugging"
```

---

#### Task 3.3: Integrate updater into main process

**Description**: Initialize the auto-updater when the app starts.

**Files to modify**:
- `src/main/main.ts`

**Implementation**:
```typescript
// At the top of src/main/main.ts, add:
import { initAutoUpdater, checkForUpdates, downloadUpdate, quitAndInstall, getCurrentVersion } from './updater';

// After creating the window in createWindow(), add:
const createWindow = () => {
  // ... existing window creation code ...

  // Initialize auto-updater after window is created
  initAutoUpdater(mainWindow);

  // ... rest of existing code ...
};

// Before app.whenReady(), add these IPC handlers:
// IPC Handlers for updates
ipcMain.handle('check-for-updates', async () => {
  checkForUpdates(false); // Not silent - show dialogs
  return { success: true };
});

ipcMain.handle('download-update', async () => {
  downloadUpdate();
  return { success: true };
});

ipcMain.handle('quit-and-install', async () => {
  quitAndInstall();
  return { success: true };
});

ipcMain.handle('get-app-version', async () => {
  return getCurrentVersion();
});
```

**Testing**:
```bash
# Build and run the app
bun start

# Check console for update check logs
# Should see "Checking for updates..." in the console
```

**Commit**:
```bash
git add src/main/main.ts
git commit -m "feat: integrate auto-updater into main process"
```

---

#### Task 3.4: Expose update API through preload script

**Description**: Add update-related functions to the API exposed to the renderer process.

**Files to modify**:
- `src/main/preload.ts`

**Implementation**:
```typescript
// In src/main/preload.ts, add to the electronAPI object:

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing API methods ...

  // Update APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Update event listeners
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', callback);
  },
  onUpdateStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('update-status', (_event, status) => callback(status));
  },

  // Remove listeners (for cleanup)
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-status');
  },
});
```

**Also update the type definitions**:
```typescript
// In src/renderer/types/electron.d.ts (or wherever your types are)
interface ElectronAPI {
  // ... existing methods ...

  // Update methods
  checkForUpdates: () => Promise<{ success: boolean }>;
  downloadUpdate: () => Promise<{ success: boolean }>;
  quitAndInstall: () => Promise<{ success: boolean }>;
  getAppVersion: () => Promise<string>;

  // Update event handlers
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => void;
  removeUpdateListeners: () => void;
}

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
}

interface UpdateStatus {
  status: string;
  data?: any;
}
```

**Testing**: TypeScript compilation should succeed

**Commit**:
```bash
git add src/main/preload.ts
git commit -m "feat: expose update API through preload script"
```

---

### Phase 4: User Interface Components

---

#### Task 4.1: Create update notification component

**Description**: Create a React component that shows when an update is available.

**Files to create**:
- `src/renderer/components/UpdateNotification/UpdateNotification.tsx`
- `src/renderer/components/UpdateNotification/index.ts`

**Implementation**:
```typescript
// src/renderer/components/UpdateNotification/UpdateNotification.tsx
import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
}

export const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    // Get current version on mount
    window.electronAPI.getAppVersion().then(setCurrentVersion);

    // Set up update event listeners
    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setUpdateAvailable(true);
      setShowDialog(true); // Auto-show dialog when update is available
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setReadyToInstall(true);
      setDownloading(false);
    });

    window.electronAPI.onUpdateStatus((status) => {
      if (status.status === 'download-progress' && status.data) {
        setDownloadProgress(Math.round(status.data.percent));
      }
    });

    // Cleanup
    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    await window.electronAPI.downloadUpdate();
  };

  const handleInstall = async () => {
    await window.electronAPI.quitAndInstall();
  };

  const handleDismiss = () => {
    setShowDialog(false);
  };

  // Show notification badge when update is available but dialog is hidden
  if (updateAvailable && !showDialog) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50"
        onClick={() => setShowDialog(true)}
      >
        <div className="bg-primary text-primary-content px-4 py-2 rounded-lg shadow-lg cursor-pointer flex items-center gap-2 hover:bg-primary-focus transition-colors">
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Update Available</span>
        </div>
      </div>
    );
  }

  // Show update dialog
  if (showDialog && updateInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-base-100 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Update Available</h2>
              <p className="text-sm text-base-content/70 mt-1">
                Version {updateInfo.version} is now available
              </p>
              <p className="text-xs text-base-content/50 mt-1">
                Current version: {currentVersion}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-sm btn-circle"
              disabled={downloading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Release Notes */}
          {updateInfo.releaseNotes && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">What's New:</h3>
              <div className="text-sm text-base-content/70 max-h-32 overflow-y-auto">
                {updateInfo.releaseNotes}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {downloading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Downloading...</span>
                <span>{downloadProgress}%</span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={downloadProgress}
                max="100"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {!readyToInstall && !downloading && (
              <>
                <button
                  onClick={handleDismiss}
                  className="btn btn-ghost"
                >
                  Later
                </button>
                <button
                  onClick={handleDownload}
                  className="btn btn-primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Update
                </button>
              </>
            )}

            {readyToInstall && (
              <>
                <button
                  onClick={handleDismiss}
                  className="btn btn-ghost"
                >
                  Install on Next Launch
                </button>
                <button
                  onClick={handleInstall}
                  className="btn btn-primary"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Restart & Install
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
```

```typescript
// src/renderer/components/UpdateNotification/index.ts
export { UpdateNotification } from './UpdateNotification';
```

**What this component does**:
- Shows a subtle badge when updates are available
- Opens a dialog with update details
- Shows download progress
- Allows user to install or postpone

**Testing**: Will test after integration

**Commit**:
```bash
git add src/renderer/components/UpdateNotification/
git commit -m "feat: create update notification UI component"
```

---

#### Task 4.2: Integrate update notification into app

**Description**: Add the update notification component to your main app.

**Files to modify**:
- `src/renderer/App.tsx`

**Implementation**:
```typescript
// In src/renderer/App.tsx, add:
import { UpdateNotification } from './components/UpdateNotification';

// Inside your AppContent component, add the UpdateNotification:
function AppContent() {
  // ... existing code ...

  return (
    <>
      {/* ... existing JSX ... */}

      {/* Add this at the end, so it renders on top */}
      <UpdateNotification />
    </>
  );
}
```

**Testing**:
```bash
bun start
# The component should render (though no updates will be available yet)
```

**Commit**:
```bash
git add src/renderer/App.tsx
git commit -m "feat: integrate update notification into main app"
```

---

#### Task 4.3: Add "Check for Updates" menu item

**Description**: Add a menu item that allows users to manually check for updates.

**Files to modify**:
- `src/main/menu/applicationMenu.ts`

**Implementation**:
```typescript
// In src/main/menu/applicationMenu.ts, find the app menu (macOS) section
// Add this to the submenu array after 'About':

const template: MenuItemConstructorOptions[] = [
  // App Menu (macOS only)
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            {
              label: 'Check for Updates...',
              click: async () => {
                const { checkForUpdates } = await import('../updater');
                checkForUpdates(false); // Not silent
              }
            },
            { type: 'separator' as const },
            // ... rest of menu items ...
          ]
        }
      ]
    : []),
  // ... rest of menu ...
];

// For non-Mac, add it to the Help menu (or create one if it doesn't exist):
{
  label: 'Help',
  submenu: [
    {
      label: 'Check for Updates...',
      click: async () => {
        const { checkForUpdates } = await import('../updater');
        checkForUpdates(false);
      }
    },
    // ... other help items ...
  ]
}
```

**Testing**:
```bash
bun start
# Check that "Check for Updates" appears in the app menu (Mac) or Help menu (Windows/Linux)
```

**Commit**:
```bash
git add src/main/menu/applicationMenu.ts
git commit -m "feat: add Check for Updates menu item"
```

---

#### Task 4.4: Display version in status bar

**Description**: Show the current app version in the status bar so users know what version they're running.

**Files to modify**:
- `src/renderer/components/Layout/StatusBar.tsx`

**Implementation**:
```typescript
// In src/renderer/components/Layout/StatusBar.tsx, add:
import { useState, useEffect } from 'react';

// Inside the StatusBar component:
export function StatusBar({ ... }) {
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // Get app version on mount
    window.electronAPI.getAppVersion().then((version) => {
      setAppVersion(version);
    });
  }, []);

  // In the JSX, add version display:
  return (
    <div className="...existing classes...">
      {/* ... existing status bar items ... */}

      {/* Add version display */}
      <div className="flex items-center gap-2 text-xs text-base-content/50">
        <span>v{appVersion}</span>
      </div>
    </div>
  );
}
```

**Testing**:
```bash
bun start
# Should see "v0.0.1" (or your current version) in the status bar
```

**Commit**:
```bash
git add src/renderer/components/Layout/StatusBar.tsx
git commit -m "feat: display app version in status bar"
```

---

### Phase 5: Testing & Release Process

---

#### Task 5.1: Create test plan documentation

**Description**: Document how to test the update system.

**Files to create**:
- `docs/testing/auto-update-testing.md`

**Implementation**:
```markdown
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
```

**Commit**:
```bash
git add docs/testing/auto-update-testing.md
git commit -m "docs: add auto-update testing guide"
```

---

#### Task 5.2: Test the complete workflow

**Description**: Perform an end-to-end test of the release and update system.

**Manual Testing Steps**:

1. **Prepare for first release**:
```bash
# Ensure everything is committed
git status

# Check current version in package.json (should be 0.0.1)
cat package.json | grep version

# Create your first release
bun version patch  # Creates 0.0.2 and git tag

# Push changes
git push origin main
git push origin v0.0.2
```

2. **Monitor GitHub Actions**:
- Go to your repository on GitHub
- Click "Actions" tab
- Watch the workflow run
- Should take 5-10 minutes

3. **Verify Release**:
- Go to "Releases" on GitHub
- Should see "Release v0.0.2"
- Should have Tapestry-mac-v0.0.2.zip attached

4. **Test Update Flow**:
- If you have v0.0.1 installed, open it
- Use "Check for Updates" menu item
- Should detect v0.0.2
- Test download and install

**Commit after testing**:
```bash
git add -A
git commit -m "test: complete auto-update system implementation"
```

---

### Phase 6: Final Configuration & Polish

---

#### Task 6.1: Add error handling and logging

**Description**: Improve error handling and add user-friendly error messages.

**Files to modify**:
- `src/main/updater.ts`
- `src/renderer/components/UpdateNotification/UpdateNotification.tsx`

**Key improvements to add**:
1. Network error handling
2. User-friendly error messages
3. Retry logic for failed downloads
4. Logging to help debug issues

**Implementation notes**:
- Add try-catch blocks around update checks
- Show specific error messages (network vs. parsing vs. permissions)
- Add retry button for failed downloads
- Log all update events to electron-log

---

#### Task 6.2: Add update settings (optional)

**Description**: Allow users to configure update behavior.

**Potential settings**:
- Enable/disable automatic checks
- Check frequency
- Auto-download updates
- Beta channel opt-in (future)

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Build Fails on GitHub Actions
**Symptom**: GitHub Actions workflow fails during build step
**Solutions**:
- Check Node version matches your local environment
- Ensure all dependencies are in package.json (not just devDependencies)
- Check for platform-specific code that might fail on GitHub's runners

#### Updates Not Detected
**Symptom**: App doesn't find updates even though new release exists
**Solutions**:
- Ensure repository is PUBLIC
- Check version in package.json is lower than release version
- Verify release is not marked as "pre-release"
- Check DevTools console for errors

#### Update Download Hangs
**Symptom**: Progress stays at 0% or stops mid-download
**Solutions**:
- Check network connectivity
- Verify GitHub Release has the .zip file attached
- Try manual download from GitHub to verify file integrity
- Check firewall/antivirus settings

#### Installation Fails After Download
**Symptom**: Update downloads but won't install
**Solutions**:
- Ensure app has write permissions to its directory
- Close all app instances before installing
- On Mac, check Gatekeeper settings
- Try moving app to Applications folder

#### Version Mismatch
**Symptom**: App shows different version than expected
**Solutions**:
- Clear build cache: `rm -rf out/ .vite/`
- Rebuild: `bun run make`
- Check package.json version matches git tag

### Debug Commands

```bash
# Check current version
cat package.json | grep version

# List git tags
git tag -l

# Check GitHub Release API (replace with your repo)
curl https://api.github.com/repos/saadiq/tapestry/releases/latest

# Clean build
rm -rf out/ .vite/ dist/
bun install
bun run make

# Test locally without GitHub
# Temporarily modify updater.ts to use local server
# Run: npx http-server ./out/make -p 8080
# Point updater to http://localhost:8080
```

## Security Considerations

### Code Signing (Recommended for Production)

While not required for basic functionality, code signing is recommended for production:

1. **Mac**: Requires Apple Developer account ($99/year)
   - Prevents Gatekeeper warnings
   - Enables notarization for smoother installs
   - Add to GitHub Secrets: `APPLE_ID`, `APPLE_ID_PASS`, `CSC_LINK`, `CSC_KEY_PASSWORD`

2. **Windows**: Requires code signing certificate
   - Prevents SmartScreen warnings
   - Various certificate providers available

### Update Security

- Updates are served over HTTPS from GitHub
- electron-updater verifies file checksums automatically
- Consider implementing:
  - Update signature verification
  - Certificate pinning for extra security
  - Staged rollouts for large user bases

## Maintenance Tasks

### Regular Maintenance

1. **Monitor GitHub Actions usage**: Free tier includes 2000 minutes/month
2. **Clean old releases**: Keep last 5-10 releases, archive older ones
3. **Update dependencies**: Regularly update electron-updater and electron
4. **Test update path**: Before major releases, test update from oldest supported version

### Version Strategy

Recommended semantic versioning:
- **Patch** (1.0.X): Bug fixes, small improvements
- **Minor** (1.X.0): New features, backwards compatible
- **Major** (X.0.0): Breaking changes, major redesigns

## Summary

You now have a complete auto-update system that:
- ✅ Builds automatically when you push version tags
- ✅ Creates GitHub Releases with your app
- ✅ Checks for updates automatically
- ✅ Notifies users politely about updates
- ✅ Downloads and installs updates seamlessly
- ✅ Gives users control over when to update

To release a new version:
```bash
bun version patch  # or minor/major
git push origin main --tags
```

The rest happens automatically! 🎉