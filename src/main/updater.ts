// src/main/updater.ts
import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

// Configure logging (optional but helpful for debugging)
autoUpdater.logger = log;
if (autoUpdater.logger && 'transports' in autoUpdater.logger) {
  (autoUpdater.logger as typeof log).transports.file.level = 'info';
}

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
  setInterval(
    () => {
      checkForUpdates(true); // silent check
    },
    4 * 60 * 60 * 1000,
  );
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
        `Unable to check for updates: ${err.message}`,
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
