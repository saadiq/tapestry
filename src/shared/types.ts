/**
 * Shared types between main and renderer processes
 */

import type {
  FileContent,
  FileOperationResult,
  DirectoryPickerResult,
  DirectoryEntry,
  FileWatcherEvent,
} from './types/fileSystem';

export interface IElectronAPI {
  // Platform info
  platform: NodeJS.Platform;

  // Shell operations
  openExternal: (url: string) => Promise<{success: boolean, error?: string}>;

  // File operations
  fileSystem: {
    // File operations
    readFile: (filePath: string) => Promise<FileContent>;
    writeFile: (filePath: string, content: string) => Promise<FileOperationResult>;
    createFile: (filePath: string, content?: string) => Promise<FileOperationResult>;
    deleteFile: (filePath: string) => Promise<FileOperationResult>;
    renameFile: (oldPath: string, newPath: string) => Promise<FileOperationResult>;
    fileExists: (filePath: string) => Promise<boolean>;

    // Directory operations
    openDirectory: () => Promise<DirectoryPickerResult>;
    readDirectory: (dirPath: string, recursive?: boolean) => Promise<DirectoryEntry[]>;

    // File watcher
    watchDirectory: (dirPath: string) => Promise<FileOperationResult>;
    unwatchDirectory: (dirPath: string) => Promise<FileOperationResult>;
    onFileChange: (callback: (event: FileWatcherEvent) => void) => void;
    removeFileChangeListener: (callback: (event: FileWatcherEvent) => void) => void;
  };

  // Update operations
  checkForUpdates: () => Promise<{ success: boolean }>;
  downloadUpdate: () => Promise<{ success: boolean }>;
  quitAndInstall: () => Promise<{ success: boolean }>;
  getAppVersion: () => Promise<string>;

  // Update event handlers
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => void;
  removeUpdateAvailableListener: (callback: (info: UpdateInfo) => void) => void;
  removeUpdateDownloadedListener: (callback: () => void) => void;
  removeUpdateStatusListener: (callback: (status: UpdateStatus) => void) => void;
  removeUpdateListeners: () => void;
}

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
}

export interface DownloadProgressData {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export type UpdateStatus =
  | { status: 'checking-for-update'; data?: never }
  | { status: 'update-available'; data: UpdateInfo }
  | { status: 'update-not-available'; data: UpdateInfo }
  | { status: 'download-progress'; data: DownloadProgressData }
  | { status: 'update-downloaded'; data: UpdateInfo }
  | { status: 'update-error'; data: string };

// Extend Window interface to include our API
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
