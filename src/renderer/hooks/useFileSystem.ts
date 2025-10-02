/**
 * React hook for file system operations
 */

import { useState, useCallback } from 'react';
import { fileSystemService } from '../services/fileSystemService';
import type {
  FileOperationResult,
  DirectoryPickerResult,
  DirectoryEntry,
} from '../../shared/types/fileSystem';

interface UseFileSystemState {
  loading: boolean;
  error: string | null;
}

interface UseFileSystemReturn extends UseFileSystemState {
  // File operations
  createFile: (
    filePath: string,
    content?: string
  ) => Promise<FileOperationResult>;
  deleteFile: (filePath: string) => Promise<FileOperationResult>;
  renameFile: (oldPath: string, newPath: string) => Promise<FileOperationResult>;
  fileExists: (filePath: string) => Promise<boolean>;

  // Directory operations
  openDirectory: () => Promise<DirectoryPickerResult>;
  readDirectory: (
    dirPath: string,
    recursive?: boolean
  ) => Promise<DirectoryEntry[]>;

  // Watcher operations
  watchDirectory: (dirPath: string) => Promise<FileOperationResult>;
  unwatchDirectory: (dirPath: string) => Promise<FileOperationResult>;

  // State management
  clearError: () => void;
}

/**
 * Hook for file system operations
 */
export function useFileSystem(): UseFileSystemReturn {
  const [state, setState] = useState<UseFileSystemState>({
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  /**
   * Create a new file
   */
  const createFile = useCallback(
    async (filePath: string, content = ''): Promise<FileOperationResult> => {
      setLoading(true);
      setError(null);

      try {
        const result = await fileSystemService.createFile(filePath, content);
        if (!result.success) {
          setError(result.error || 'Failed to create file');
        }
        return result;
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to create file';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  /**
   * Delete a file
   */
  const deleteFile = useCallback(
    async (filePath: string): Promise<FileOperationResult> => {
      setLoading(true);
      setError(null);

      try {
        const result = await fileSystemService.deleteFile(filePath);
        if (!result.success) {
          setError(result.error || 'Failed to delete file');
        }
        return result;
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to delete file';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  /**
   * Rename or move a file
   */
  const renameFile = useCallback(
    async (oldPath: string, newPath: string): Promise<FileOperationResult> => {
      setLoading(true);
      setError(null);

      try {
        const result = await fileSystemService.renameFile(oldPath, newPath);
        if (!result.success) {
          setError(result.error || 'Failed to rename file');
        }
        return result;
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to rename file';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  /**
   * Check if a file exists
   */
  const fileExists = useCallback(
    async (filePath: string): Promise<boolean> => {
      try {
        return await fileSystemService.fileExists(filePath);
      } catch (error: any) {
        setError(error.message || 'Failed to check file existence');
        return false;
      }
    },
    [setError]
  );

  /**
   * Open directory picker
   */
  const openDirectory = useCallback(async (): Promise<DirectoryPickerResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await fileSystemService.openDirectory();
      if (!result.success && !result.canceled) {
        setError(result.error || 'Failed to open directory');
      }
      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to open directory';
      setError(errorMsg);
      return {
        success: false,
        canceled: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * Read directory contents
   */
  const readDirectory = useCallback(
    async (dirPath: string, recursive = false): Promise<DirectoryEntry[]> => {
      setLoading(true);
      setError(null);

      try {
        const entries = await fileSystemService.readDirectory(dirPath, recursive);
        return entries;
      } catch (error: any) {
        setError(error.message || 'Failed to read directory');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  /**
   * Start watching a directory
   */
  const watchDirectory = useCallback(
    async (dirPath: string): Promise<FileOperationResult> => {
      setError(null);

      try {
        const result = await fileSystemService.watchDirectory(dirPath);
        if (!result.success) {
          setError(result.error || 'Failed to watch directory');
        }
        return result;
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to watch directory';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }
    },
    [setError]
  );

  /**
   * Stop watching a directory
   */
  const unwatchDirectory = useCallback(
    async (dirPath: string): Promise<FileOperationResult> => {
      setError(null);

      try {
        const result = await fileSystemService.unwatchDirectory(dirPath);
        if (!result.success) {
          setError(result.error || 'Failed to unwatch directory');
        }
        return result;
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to unwatch directory';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }
    },
    [setError]
  );

  return {
    ...state,
    createFile,
    deleteFile,
    renameFile,
    fileExists,
    openDirectory,
    readDirectory,
    watchDirectory,
    unwatchDirectory,
    clearError,
  };
}
