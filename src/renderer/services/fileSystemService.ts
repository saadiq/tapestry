/**
 * File system service - wrapper for Electron API file system operations
 */

import type {
  FileContent,
  FileOperationResult,
  DirectoryPickerResult,
  DirectoryEntry,
  FileWatcherEvent,
} from '../../shared/types/fileSystem';

/**
 * File system service class
 */
class FileSystemService {
  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<FileContent> {
    return await window.electronAPI.fileSystem.readFile(filePath);
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<FileOperationResult> {
    return await window.electronAPI.fileSystem.writeFile(filePath, content);
  }

  /**
   * Create a new file
   */
  async createFile(filePath: string, content = ''): Promise<FileOperationResult> {
    return await window.electronAPI.fileSystem.createFile(filePath, content);
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<FileOperationResult> {
    return await window.electronAPI.fileSystem.deleteFile(filePath);
  }

  /**
   * Rename or move a file
   */
  async renameFile(oldPath: string, newPath: string): Promise<FileOperationResult> {
    return await window.electronAPI.fileSystem.renameFile(oldPath, newPath);
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return await window.electronAPI.fileSystem.fileExists(filePath);
  }

  /**
   * Open directory picker dialog
   */
  async openDirectory(): Promise<DirectoryPickerResult> {
    return await window.electronAPI.fileSystem.openDirectory();
  }

  /**
   * Read directory contents
   */
  async readDirectory(dirPath: string, recursive = false): Promise<DirectoryEntry[]> {
    return await window.electronAPI.fileSystem.readDirectory(dirPath, recursive);
  }

  /**
   * Start watching a directory for changes
   */
  async watchDirectory(dirPath: string): Promise<FileOperationResult> {
    return await window.electronAPI.fileSystem.watchDirectory(dirPath);
  }

  /**
   * Stop watching a directory
   */
  async unwatchDirectory(dirPath: string): Promise<FileOperationResult> {
    return await window.electronAPI.fileSystem.unwatchDirectory(dirPath);
  }

  /**
   * Listen for file change events
   */
  onFileChange(callback: (event: FileWatcherEvent) => void): void {
    window.electronAPI.fileSystem.onFileChange(callback);
  }

  /**
   * Remove file change event listener
   */
  removeFileChangeListener(callback: (event: FileWatcherEvent) => void): void {
    window.electronAPI.fileSystem.removeFileChangeListener(callback);
  }
}

// Export singleton instance
export const fileSystemService = new FileSystemService();
