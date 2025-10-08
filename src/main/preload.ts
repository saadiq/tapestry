/**
 * Preload script - runs before the renderer process loads.
 * This is where we expose a secure API to the renderer using contextBridge.
 *
 * See the Electron documentation for details on how to use preload scripts:
 * https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { IElectronAPI, UpdateInfo, UpdateStatus } from '../shared/types';
import type {
  FileContent,
  FileOperationResult,
  DirectoryPickerResult,
  FilePickerResult,
  DirectoryEntry,
  FileWatcherEvent,
} from '../shared/types/fileSystem';

// Type definitions for IPC callback wrappers
type FileChangeCallback = (event: FileWatcherEvent) => void;
type IPCFileChangeWrapper = (_event: unknown, data: FileWatcherEvent) => void;

type UpdateInfoCallback = (info: { version: string; releaseDate: string }) => void;
type IPCUpdateInfoWrapper = (_event: unknown, info: { version: string; releaseDate: string }) => void;

type UpdateStatusCallback = (status: string) => void;
type IPCUpdateStatusWrapper = (_event: unknown, status: string) => void;

// WeakMaps to store IPC wrapper functions for cleanup
const fileChangeWrappers = new WeakMap<FileChangeCallback, IPCFileChangeWrapper>();
const updateAvailableWrappers = new WeakMap<UpdateInfoCallback, IPCUpdateInfoWrapper>();
const updateDownloadedWrappers = new WeakMap<UpdateInfoCallback, IPCUpdateInfoWrapper>();
const updateStatusWrappers = new WeakMap<UpdateStatusCallback, IPCUpdateStatusWrapper>();

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: IElectronAPI = {
  platform: process.platform,

  openExternal: (url: string): Promise<{success: boolean, error?: string}> =>
    ipcRenderer.invoke('shell:openExternal', url),

  fileSystem: {
    // File operations
    readFile: (filePath: string): Promise<FileContent> =>
      ipcRenderer.invoke('fs:readFile', filePath),

    writeFile: (filePath: string, content: string): Promise<FileOperationResult> =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),

    createFile: (filePath: string, content?: string): Promise<FileOperationResult> =>
      ipcRenderer.invoke('fs:createFile', filePath, content),

    deleteFile: (filePath: string): Promise<FileOperationResult> =>
      ipcRenderer.invoke('fs:deleteFile', filePath),

    renameFile: (oldPath: string, newPath: string): Promise<FileOperationResult> =>
      ipcRenderer.invoke('fs:renameFile', oldPath, newPath),

    fileExists: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('fs:fileExists', filePath),

    openFile: (): Promise<FilePickerResult> =>
      ipcRenderer.invoke('fs:openFile'),

    // Directory operations
    openDirectory: (): Promise<DirectoryPickerResult> =>
      ipcRenderer.invoke('fs:openDirectory'),

    readDirectory: (dirPath: string, recursive?: boolean): Promise<DirectoryEntry[]> =>
      ipcRenderer.invoke('fs:readDirectory', dirPath, recursive),

    // File watcher
    watchDirectory: (dirPath: string): Promise<FileOperationResult> =>
      ipcRenderer.invoke('fs:watchDirectory', dirPath),

    unwatchDirectory: (dirPath: string): Promise<FileOperationResult> =>
      ipcRenderer.invoke('fs:unwatchDirectory', dirPath),

    onFileChange: (callback: (event: FileWatcherEvent) => void): void => {
      // Create wrapper that ipcRenderer expects and store it in WeakMap
      const wrapper = (_event: any, data: FileWatcherEvent) => callback(data);
      fileChangeWrappers.set(callback, wrapper);
      ipcRenderer.on('file-watcher-event', wrapper);
    },

    removeFileChangeListener: (callback: (event: FileWatcherEvent) => void): void => {
      // Retrieve the wrapper from WeakMap
      const wrapper = fileChangeWrappers.get(callback);
      if (wrapper) {
        ipcRenderer.removeListener('file-watcher-event', wrapper);
        fileChangeWrappers.delete(callback);
      }
    },

    // Shell operations
    showItemInFolder: (itemPath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('shell:showItemInFolder', itemPath),
  },

  // Update APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Update event listeners
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const wrapper = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
    updateAvailableWrappers.set(callback, wrapper);
    ipcRenderer.on('update-available', wrapper);
  },
  onUpdateDownloaded: (callback: () => void) => {
    const wrapper = () => callback();
    updateDownloadedWrappers.set(callback, wrapper);
    ipcRenderer.on('update-downloaded', wrapper);
  },
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const wrapper = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status);
    updateStatusWrappers.set(callback, wrapper);
    ipcRenderer.on('update-status', wrapper);
  },

  // Remove individual listeners (for cleanup)
  removeUpdateAvailableListener: (callback: (info: UpdateInfo) => void) => {
    const wrapper = updateAvailableWrappers.get(callback);
    if (wrapper) {
      ipcRenderer.removeListener('update-available', wrapper);
      updateAvailableWrappers.delete(callback);
    }
  },
  removeUpdateDownloadedListener: (callback: () => void) => {
    const wrapper = updateDownloadedWrappers.get(callback);
    if (wrapper) {
      ipcRenderer.removeListener('update-downloaded', wrapper);
      updateDownloadedWrappers.delete(callback);
    }
  },
  removeUpdateStatusListener: (callback: (status: UpdateStatus) => void) => {
    const wrapper = updateStatusWrappers.get(callback);
    if (wrapper) {
      ipcRenderer.removeListener('update-status', wrapper);
      updateStatusWrappers.delete(callback);
    }
  },

  // Remove all listeners (for cleanup)
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-status');
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Expose IPC communication for menu events
contextBridge.exposeInMainWorld('electron', {
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'menu-new-file',
      'menu-open-file',
      'menu-open-folder',
      'menu-save',
      'menu-save-as',
      'menu-toggle-sidebar',
      'menu-find'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'menu-new-file',
      'menu-open-file',
      'menu-open-folder',
      'menu-save',
      'menu-save-as',
      'menu-toggle-sidebar',
      'menu-find'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  send: (channel: string, ...args: any[]) => {
    const validChannels: string[] = [];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  }
});

console.log('🔌 Preload script loaded');
