import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import * as fileHandlers from './fileSystem/fileHandlers';
import * as directoryHandlers from './fileSystem/directoryHandlers';
import * as fileWatcher from './fileSystem/fileWatcher';
import { createApplicationMenu } from './menu/applicationMenu';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Store reference to main window for file watcher and menu
let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Create application menu
  createApplicationMenu(mainWindow);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Register IPC handlers for file system operations
function registerIpcHandlers() {
  /**
   * Validates and opens external URLs safely.
   * Only allows http, https, and mailto protocols to prevent security exploits
   * such as file:// disclosure, javascript: execution, or shell command injection.
   */
  ipcMain.handle('shell:openExternal', async (_event, url: string): Promise<{success: boolean, error?: string}> => {
    try {
      // Validate URL format
      const parsedUrl = new URL(url);

      // Whitelist of allowed protocols
      // Note: file: protocol is intentionally blocked to prevent local file disclosure attacks
      const allowedProtocols = ['http:', 'https:', 'mailto:'];

      // Check for disallowed protocols (including javascript: and data:)
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        console.error(`[Security] Blocked attempt to open URL with disallowed protocol: ${parsedUrl.protocol}`);
        return { success: false, error: 'This type of link cannot be opened for security reasons' };
      }

      // Additional check for javascript: or data: protocols in the URL string
      // (defense in depth in case URL parsing doesn't catch edge cases)
      if (/^(javascript|data):/i.test(url)) {
        console.error(`[Security] Blocked attempt to open javascript: or data: URL`);
        return { success: false, error: 'This type of link cannot be opened for security reasons' };
      }

      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('[shell:openExternal] Error opening URL:', error);
      return { success: false, error: 'Unable to open link. Please check the URL format.' };
    }
  });

  // File operations
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    return await fileHandlers.readFile(filePath);
  });

  ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
    return await fileHandlers.writeFile(filePath, content);
  });

  ipcMain.handle('fs:createFile', async (_event, filePath: string, content?: string) => {
    return await fileHandlers.createFile(filePath, content);
  });

  ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
    return await fileHandlers.deleteFile(filePath);
  });

  ipcMain.handle('fs:renameFile', async (_event, oldPath: string, newPath: string) => {
    return await fileHandlers.renameFile(oldPath, newPath);
  });

  ipcMain.handle('fs:fileExists', async (_event, filePath: string) => {
    return await fileHandlers.fileExists(filePath);
  });

  ipcMain.handle('fs:openFile', async () => {
    return await fileHandlers.openFile();
  });

  // Directory operations
  ipcMain.handle('fs:openDirectory', async () => {
    return await directoryHandlers.openDirectory();
  });

  ipcMain.handle('fs:readDirectory', async (_event, dirPath: string, recursive?: boolean) => {
    return await directoryHandlers.readDirectory(dirPath, recursive);
  });

  // File watcher operations
  ipcMain.handle('fs:watchDirectory', async (_event, dirPath: string) => {
    if (!mainWindow) {
      return {
        success: false,
        error: 'Main window not available',
      };
    }
    return fileWatcher.watchDirectory(dirPath, mainWindow);
  });

  ipcMain.handle('fs:unwatchDirectory', async (_event, dirPath: string) => {
    return fileWatcher.unwatchDirectory(dirPath);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  registerIpcHandlers();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Clean up file watchers
  fileWatcher.unwatchAll();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up watchers before quitting
app.on('before-quit', () => {
  fileWatcher.unwatchAll();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
