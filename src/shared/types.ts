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
  openExternal: (url: string) => Promise<void>;

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
}

// Extend Window interface to include our API
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
