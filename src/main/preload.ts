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
  DirectoryEntry,
  FileWatcherEvent,
} from '../shared/types/fileSystem';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: IElectronAPI = {
  platform: process.platform,

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
      ipcRenderer.on('file-watcher-event', (_event, data: FileWatcherEvent) =>
        callback(data)
      );
    },

    removeFileChangeListener: (callback: (event: FileWatcherEvent) => void): void => {
      ipcRenderer.removeListener('file-watcher-event', callback as any);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('🔌 Preload script loaded');
