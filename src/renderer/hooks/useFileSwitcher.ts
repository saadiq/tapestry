/**
 * Hook for managing file switching with auto-save
 *
 * This hook handles the complex logic of switching between files,
 * including saving the previous file before switching and handling
 * failures gracefully to prevent data loss.
 */

import { useEffect, useRef, useState } from 'react';
import { normalizePath, getDirectoryPath, isPathWithinDirectory } from '../utils/pathUtils';
import { fileSystemService } from '../services/fileSystemService';
import { TIMING_CONFIG } from '../../shared/config/timing';
import type { UseFileContentReturn } from './useFileContent';
import type { FileNode } from '../../shared/types/fileSystem';

interface UseFileSwitcherOptions {
  activePath: string | null;
  fileContent: UseFileContentReturn;
  nodes: FileNode[];
  rootPath: string | null;
  setActiveFile: (path: string) => void;
  setFileDirty: (path: string, isDirty: boolean) => void;
  loadDirectory: (path: string) => Promise<void>;
  showToast: {
    showSuccess: (message: string) => void;
    showError: (message: string, duration?: number, action?: any) => void;
    showInfo: (message: string) => void;
    showWarning: (message: string) => void;
  };
}

interface UseFileSwitcherReturn {
  isLoadingFile: boolean;
  ensureDirectoryContext: (filePath: string) => Promise<void>;
}

/**
 * Hook to manage file switching with save-before-switch logic
 */
export function useFileSwitcher({
  activePath,
  fileContent,
  nodes,
  rootPath,
  setActiveFile,
  setFileDirty,
  loadDirectory,
  showToast,
}: UseFileSwitcherOptions): UseFileSwitcherReturn {
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Synchronous guard to prevent concurrent file switches
  const isSwitchingFileRef = useRef(false);

  // Previous path for save-before-switch
  const previousPathRef = useRef<string | null>(null);

  // Load file when activePath changes (with save-before-switch)
  useEffect(() => {
    const loadFileWithSave = async () => {
      // Prevent concurrent file switches using ref for synchronous check
      if (isSwitchingFileRef.current) {
        console.log('[File Switch] Already switching files, ignoring concurrent request');
        return;
      }

      // Clean up previous path ref when no file is open
      if (!activePath) {
        previousPathRef.current = null;
        return;
      }

      // Set switching flag immediately to prevent race conditions
      isSwitchingFileRef.current = true;

      // Save previous file if it was dirty
      if (
        previousPathRef.current &&
        previousPathRef.current !== activePath &&
        fileContent.isDirty
      ) {
        setIsLoadingFile(true);

        // Show toast for larger files that might take time to save
        const approxSizeInBytes = fileContent.content.length * 2;
        const shouldShowToast =
          approxSizeInBytes > TIMING_CONFIG.LARGE_FILE_TOAST_THRESHOLD_BYTES;
        if (shouldShowToast) {
          showToast.showInfo('Saving previous file...');
        }

        const saveResult = await fileContent.saveFileSync();

        if (!saveResult.success) {
          // Save failed - show error with retry button and prevent switch
          showToast.showError(
            `Failed to save ${previousPathRef.current}: ${saveResult.error}. ` +
              `Please fix the issue before switching files.`,
            0, // Don't auto-close
            {
              label: 'Retry',
              onClick: async () => {
                // Retry save
                const retryResult = await fileContent.saveFileSync();
                if (retryResult.success) {
                  showToast.showSuccess('File saved successfully');
                  // Clear dirty state
                  if (retryResult.filePath) {
                    setFileDirty(retryResult.filePath, false);
                  }
                } else {
                  showToast.showError(`Retry failed: ${retryResult.error}`);
                }
              },
            }
          );
          setIsLoadingFile(false);
          isSwitchingFileRef.current = false;

          // Revert the file selection in tree to keep user on the file with unsaved changes
          if (previousPathRef.current !== activePath) {
            setActiveFile(previousPathRef.current);
          }
          return;
        }

        // Clear dirty state in tree for saved file
        setFileDirty(previousPathRef.current, false);
      }

      // Load the new file
      setIsLoadingFile(true);
      try {
        // Check file size before loading to warn about large files
        const fileNode = nodes.find((node) => node.path === activePath);
        if (
          fileNode?.size &&
          fileNode.size > TIMING_CONFIG.LARGE_FILE_WARNING_THRESHOLD_BYTES
        ) {
          const sizeMB = (fileNode.size / 1_048_576).toFixed(1);
          showToast.showWarning(
            `Loading large file (${sizeMB} MB). This may take a moment...`
          );
        }

        await fileContent.loadFile(activePath);
        previousPathRef.current = activePath;
      } catch (error) {
        console.error('Failed to load file:', error);
        showToast.showError(
          `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsLoadingFile(false);
        isSwitchingFileRef.current = false;
      }
    };

    // Only trigger load when activePath changes and differs from current file
    if (
      activePath &&
      activePath !== fileContent.filePath &&
      activePath !== previousPathRef.current
    ) {
      loadFileWithSave();
    }
  }, [activePath, fileContent, setActiveFile, setFileDirty, showToast, nodes]);

  /**
   * Ensure the directory context is loaded for a given file path
   * If the file is outside the current root, reload the directory tree
   */
  const ensureDirectoryContext = async (filePath: string) => {
    // Defensive check for invalid file path
    if (!filePath) {
      console.warn('ensureDirectoryContext: received empty filePath');
      return;
    }

    const directoryPath = getDirectoryPath(filePath);

    if (!directoryPath) {
      return;
    }

    const normalizedFilePath = normalizePath(filePath);
    const normalizedRoot = rootPath ? normalizePath(rootPath) : null;

    // Additional defensive check after normalization
    if (normalizedFilePath === '') {
      console.warn('ensureDirectoryContext: filePath normalized to empty string');
      return;
    }

    const shouldReloadTree =
      !normalizedRoot || !isPathWithinDirectory(normalizedFilePath, normalizedRoot);

    if (shouldReloadTree) {
      if (rootPath) {
        await fileSystemService.unwatchDirectory(rootPath);
      }

      await loadDirectory(directoryPath);
      await fileSystemService.watchDirectory(directoryPath);
    }
  };

  return {
    isLoadingFile,
    ensureDirectoryContext,
  };
}
