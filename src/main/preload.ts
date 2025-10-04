/**
 * Preload script - runs before the renderer process loads.
 * This is where we expose a secure API to the renderer using contextBridge.
 *
 * See the Electron documentation for details on how to use preload scripts:
 * https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { IElectronAPI } from '../shared/types';
import type {
  FileContent,
  FileOperationResult,
  DirectoryPickerResult,
  FilePickerResult,
  DirectoryEntry,
  FileWatcherEvent,
} from '../shared/types/fileSystem';

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
      // Create wrapper that ipcRenderer expects and store it on the callback
      // so we can remove it later with the same reference
      const wrapper = (_event: any, data: FileWatcherEvent) => callback(data);
      (callback as any).__ipcWrapper = wrapper;
      ipcRenderer.on('file-watcher-event', wrapper);
    },

    removeFileChangeListener: (callback: (event: FileWatcherEvent) => void): void => {
      // Retrieve the wrapper we stored during onFileChange
      const wrapper = (callback as any).__ipcWrapper;
      if (wrapper) {
        ipcRenderer.removeListener('file-watcher-event', wrapper);
        delete (callback as any).__ipcWrapper;
      }
    },
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
