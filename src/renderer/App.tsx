/**
 * Main App Component
 */

import './index.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileTreeProvider, useFileTreeContext } from './store/fileTreeStore';
import { EditorComponent } from './components/Editor/EditorComponent';
import { NoDirectorySelected } from './components/EmptyStates/NoDirectorySelected';
import { NoFileOpen } from './components/EmptyStates/NoFileOpen';
import { ToastProvider, useToast } from './components/Notifications';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileContent } from './hooks/useFileContent';
import { fileSystemService } from './services/fileSystemService';
import type { FileWatcherEvent } from '../shared/types/fileSystem';
import { normalizePath, getDirectoryPath, isPathWithinDirectory } from './utils/pathUtils';
import { TIMING_CONFIG } from '../shared/config/timing';

// Track files we're currently saving to ignore file watcher events
const activeSaves = new Map<string, number>(); // normalized filePath -> timestamp

/**
 * Periodic cleanup interval for activeSaves Map
 * Prevents memory leaks when files are opened rapidly but cleanup never triggers
 */
let saveTrackingCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic cleanup of stale save tracking entries
 */
function startSaveTrackingCleanup(): void {
  if (saveTrackingCleanupInterval) return; // Already running

  saveTrackingCleanupInterval = setInterval(() => {
    const now = Date.now();
    const maxAge = 5000; // 5 seconds
    for (const [path, timestamp] of activeSaves.entries()) {
      if (now - timestamp > maxAge) {
        activeSaves.delete(path);
      }
    }
  }, 10000); // Cleanup every 10 seconds
}

/**
 * Stop periodic cleanup (called on app unmount)
 */
function stopSaveTrackingCleanup(): void {
  if (saveTrackingCleanupInterval) {
    clearInterval(saveTrackingCleanupInterval);
    saveTrackingCleanupInterval = null;
  }
  activeSaves.clear();
}

/**
 * Track that a save operation is starting for a file
 * Paths are automatically normalized for cross-platform consistency
 * Performs eager cleanup of stale entries to prevent memory growth
 */
function trackSaveStart(filePath: string): void {
  const normalizedPath = normalizePath(filePath);

  // Eagerly clean up stale entries before adding new one
  // This prevents memory growth during rapid file operations
  const now = Date.now();
  const maxAge = 5000; // 5 seconds
  for (const [path, timestamp] of activeSaves.entries()) {
    if (now - timestamp > maxAge) {
      activeSaves.delete(path);
    }
  }

  activeSaves.set(normalizedPath, now);
}

/**
 * Check if a file is currently being saved
 * Returns true if the file was saved within the debounce window
 */
function isSaveActive(filePath: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const saveTimestamp = activeSaves.get(normalizedPath);

  if (!saveTimestamp) {
    return false;
  }

  return Date.now() - saveTimestamp < TIMING_CONFIG.FILE_WATCHER_DEBOUNCE_MS;
}

/**
 * Mark a save operation as complete and schedule cleanup
 */
function trackSaveEnd(filePath: string): void {
  const normalizedPath = normalizePath(filePath);

  // Keep the save timestamp for debounce period to ignore file watcher events
  // Cleanup happens eagerly in trackSaveStart and periodically via interval
  setTimeout(() => {
    activeSaves.delete(normalizedPath);
  }, TIMING_CONFIG.FILE_WATCHER_DEBOUNCE_MS);
}

// Inner component that has access to FileTreeContext and Toast
function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const {
    loadDirectory,
    openFile: setActiveFile,
    activePath,
    rootPath,
    setFileDirty,
    nodes,
  } = useFileTreeContext();
  const toast = useToast();
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Synchronous guard to prevent concurrent file switches
  // Must use ref (not state) for immediate synchronous check
  const isSwitchingFileRef = useRef(false);

  // Track which large files we've shown blur warnings for
  const shownBlurWarningsRef = useRef(new Set<string>());

  // Previous path for save-before-switch
  const previousPathRef = useRef<string | null>(null);

  // Ref to track current file path for save callbacks
  const currentFilePathRef = useRef<string | null>(null);

  // Save lifecycle callbacks to track save state per file
  const handleBeforeSave = useCallback(() => {
    const currentPath = currentFilePathRef.current;
    if (currentPath) {
      trackSaveStart(currentPath);
    }
  }, []);

  const handleAfterSave = useCallback((success: boolean) => {
    const currentPath = currentFilePathRef.current;
    if (currentPath) {
      trackSaveEnd(currentPath);
    }
  }, []);

  const fileContent = useFileContent({
    enableAutoSave: true,
    autoSaveDelay: TIMING_CONFIG.AUTO_SAVE_DELAY_MS,
    saveTimeout: TIMING_CONFIG.SAVE_TIMEOUT_MS,
    onBeforeSave: handleBeforeSave,
    onAfterSave: handleAfterSave
  });

  // Update the ref when filePath changes
  currentFilePathRef.current = fileContent.filePath;

  // Load file when activePath changes (with save-before-switch)
  useEffect(() => {
    const loadFileWithSave = async () => {
      // Prevent concurrent file switches using ref for synchronous check
      // This prevents race conditions when user rapidly clicks multiple files
      if (isSwitchingFileRef.current) {
        console.log('[File Switch] Already switching files, ignoring concurrent request');
        return;
      }

      // Clean up previous path ref when no file is open
      if (!activePath) {
        previousPathRef.current = null;
        return;
      }

      // Save previous file if it was dirty
      if (previousPathRef.current &&
          previousPathRef.current !== activePath &&
          fileContent.isDirty) {

        isSwitchingFileRef.current = true;
        setIsLoadingFile(true);

        // Show toast for larger files that might take time to save
        // Use approximate size (2 bytes per char for UTF-16) to avoid Blob creation overhead
        const approxSizeInBytes = fileContent.content.length * 2;
        const shouldShowToast = approxSizeInBytes > TIMING_CONFIG.LARGE_FILE_TOAST_THRESHOLD_BYTES;
        if (shouldShowToast) {
          toast.showInfo('Saving previous file...');
        }

        const saveResult = await fileContent.saveFileSync();

        if (!saveResult.success) {
          // Save failed - show error with retry button and prevent switch
          toast.showError(
            `Failed to save ${previousPathRef.current}: ${saveResult.error}. ` +
            `Please fix the issue before switching files.`,
            0, // Don't auto-close
            {
              label: 'Retry',
              onClick: async () => {
                // Retry save
                const retryResult = await fileContent.saveFileSync();
                if (retryResult.success) {
                  toast.showSuccess('File saved successfully');
                  // Clear dirty state
                  if (retryResult.filePath) {
                    setFileDirty(retryResult.filePath, false);
                  }
                } else {
                  toast.showError(`Retry failed: ${retryResult.error}`);
                }
              }
            }
          );
          setIsLoadingFile(false);
          isSwitchingFileRef.current = false;

          // Revert the file selection in tree to keep user on the file with unsaved changes
          // This prevents data loss by blocking the switch until save succeeds
          if (previousPathRef.current !== activePath) {
            setActiveFile(previousPathRef.current);
          }
          return;
        }

        // Clear dirty state in tree for saved file
        setFileDirty(previousPathRef.current, false);
      }

      // Load the new file
      isSwitchingFileRef.current = true;
      setIsLoadingFile(true);
      try {
        // Check file size before loading to warn about large files
        const fileNode = nodes.find(node => node.path === activePath);
        if (fileNode?.size && fileNode.size > TIMING_CONFIG.LARGE_FILE_WARNING_THRESHOLD_BYTES) {
          const sizeMB = (fileNode.size / 1_048_576).toFixed(1);
          toast.showWarning(`Loading large file (${sizeMB} MB). This may take a moment...`);
        }

        await fileContent.loadFile(activePath);
        previousPathRef.current = activePath;
      } catch (error) {
        console.error('Failed to load file:', error);
        toast.showError(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoadingFile(false);
        isSwitchingFileRef.current = false;
      }
    };

    // Only trigger load when activePath changes and differs from current file
    // This guard prevents infinite loops when reverting selection after failed save:
    // - Failed save triggers setActiveFile(previousPathRef.current)
    // - previousPathRef.current === fileContent.filePath (hasn't changed yet)
    // - activePath becomes previousPathRef.current
    // - activePath === fileContent.filePath, so effect doesn't re-run
    if (activePath && activePath !== fileContent.filePath) {
      loadFileWithSave();
    }
  }, [activePath, fileContent, setActiveFile, setFileDirty, toast, nodes]);

  // Update word count when content changes
  useEffect(() => {
    if (fileContent.content) {
      const text = fileContent.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = text.length > 0 ? text.split(' ').length : 0;
      setWordCount(words);
    }
  }, [fileContent.content]);

  // Sync dirty state to file tree
  useEffect(() => {
    if (activePath) {
      setFileDirty(activePath, fileContent.isDirty);
    }
  }, [activePath, fileContent.isDirty, setFileDirty]);

  const handleUpdate = useCallback((newContent: string) => {
    fileContent.updateContent(newContent);
  }, [fileContent]);

  const handleContentLoaded = useCallback((convertedContent: string) => {
    // Only update content and originalContent when file is not dirty
    if (!fileContent.isDirty) {
      fileContent.updateOriginalContent(convertedContent);
      fileContent.updateContent(convertedContent);
    }
  }, [fileContent]);

  const handleSave = useCallback(async () => {
    const success = await fileContent.saveFile();
    if (success) {
      toast.showSuccess('File saved successfully');
    } else if (fileContent.error) {
      toast.showError(`Failed to save file: ${fileContent.error}`);
    }
  }, [fileContent, toast]);

  const ensureDirectoryContext = useCallback(
    async (filePath: string) => {
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
    },
    [loadDirectory, rootPath]
  );

  const handleOpenFile = useCallback(async () => {
    const result = await fileSystemService.openFile();
    if (result.success && result.path) {
      await ensureDirectoryContext(result.path);
      // Setting activePath will trigger the useEffect to load the file
      setActiveFile(result.path);
      toast.showSuccess(`Opened file: ${result.path.split('/').pop()}`);
    } else if (!result.canceled && result.error) {
      toast.showError(`Failed to open file: ${result.error}`);
    }
  }, [ensureDirectoryContext, setActiveFile, toast]);

  const handleOpenFolder = useCallback(async () => {
    const result = await fileSystemService.openDirectory();
    if (result.success && result.path) {
      await loadDirectory(result.path);
      // Watch directory for changes
      await fileSystemService.watchDirectory(result.path);
      toast.showSuccess(`Opened folder: ${result.path.split('/').pop()}`);
    } else if (!result.canceled && result.error) {
      toast.showError(`Failed to open folder: ${result.error}`);
    }
  }, [loadDirectory, toast]);

  const handleNewFile = useCallback(() => {
    // New file is handled via file tree context menu
    console.log('New file: Use context menu in file tree');
  }, []);

  const handleToggleSidebar = useCallback(() => {
    // Sidebar toggle is handled by MainLayout
  }, []);

  const handleFind = useCallback(() => {
    // TODO: Implement find functionality
    console.log('Find clicked');
  }, []);

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleSave,
    onOpenFile: handleOpenFile,
    onOpenFolder: handleOpenFolder,
    onNewFile: handleNewFile,
    onToggleSidebar: handleToggleSidebar,
    onFind: handleFind
  });

  // Warn before closing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (fileContent.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [fileContent.isDirty]);

  // Auto-save on window blur - uses refs to avoid re-registration
  useEffect(() => {
    const blurTimeouts: NodeJS.Timeout[] = [];

    const handleWindowBlur = () => {
      // Debounce rapid blur events (e.g., quick app switching)
      // Clear all pending timeouts before creating a new one
      blurTimeouts.forEach(clearTimeout);
      blurTimeouts.length = 0;

      const timeout = setTimeout(async () => {
        // Use refs to get latest values
        const currentFileContent = fileContentRef.current;
        const currentToast = toastRef.current;

        // Only save if there's a dirty file open
        if (currentFileContent.isDirty && currentFileContent.filePath) {
          // Check file size to avoid blocking UI on large file saves
          // Use approximate size (2 bytes per char for UTF-16) to avoid Blob creation overhead
          const approxSizeInBytes = currentFileContent.content.length * 2;

          // For very large files (>5MB), defer the save to avoid UI jank during blur
          // User will be prompted to save on file switch or app close instead
          if (approxSizeInBytes > TIMING_CONFIG.LARGE_FILE_WARNING_THRESHOLD_BYTES) {
            console.log('[Blur Save] Skipping auto-save for large file on blur to prevent UI jank');

            // Show per-file info toast to inform user
            const warningKey = `${currentFileContent.filePath}-blur-warning`;
            if (!shownBlurWarningsRef.current.has(warningKey)) {
              currentToast.showInfo(
                'Auto-save on window blur is disabled for large files (>5MB) to prevent UI lag. ' +
                'Your changes will be saved when switching files or closing the app.',
                6000 // Show for 6 seconds
              );
              shownBlurWarningsRef.current.add(warningKey);
            }
            return;
          }

          const result = await currentFileContent.saveFileSync();
          if (!result.success) {
            // Don't prevent blur, but show warning
            currentToast.showWarning(`Auto-save failed on window blur: ${result.error}`);
          }
        }
      }, TIMING_CONFIG.BLUR_SAVE_DEBOUNCE_MS);

      blurTimeouts.push(timeout);
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      blurTimeouts.forEach(clearTimeout);
    };
  }, []); // Empty deps - register once, use refs for values

  // Refs for file watcher to avoid excessive re-registration
  // Must be declared AFTER fileContent is initialized
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;

  // Cache normalized active path to avoid repeated normalization
  const normalizedActivePathRef = useRef<string | null>(null);

  const fileContentRef = useRef(fileContent);
  fileContentRef.current = fileContent;

  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Update normalized path when active path changes
  useEffect(() => {
    normalizedActivePathRef.current = activePath ? normalizePath(activePath) : null;
  }, [activePath]);

  // Refs for menu handlers to prevent listener re-registration
  const handlersRef = useRef({
    newFile: handleNewFile,
    openFile: handleOpenFile,
    openFolder: handleOpenFolder,
    save: handleSave,
    toggleSidebar: handleToggleSidebar,
    find: handleFind
  });

  // Update handler refs when handlers change (doesn't trigger effects)
  handlersRef.current = {
    newFile: handleNewFile,
    openFile: handleOpenFile,
    openFolder: handleOpenFolder,
    save: handleSave,
    toggleSidebar: handleToggleSidebar,
    find: handleFind
  };

  // File watcher - uses refs for stability
  useEffect(() => {
    if (!rootPath) return;

    const handleFileChange = async (event?: FileWatcherEvent) => {
      try {
        // Use refs to get latest values without causing effect re-runs
        const currentActivePath = activePathRef.current;
        const currentFileContent = fileContentRef.current;
        const currentToast = toastRef.current;

        // Normalize event path for cross-platform comparison (Windows vs Unix)
        // Use cached normalized active path to avoid repeated normalization
        const normalizedEventPath = event?.path ? normalizePath(event.path) : null;
        const normalizedActivePath = normalizedActivePathRef.current;

        // If active file was modified externally
        if (normalizedEventPath && normalizedActivePath && normalizedEventPath === normalizedActivePath) {
          // Skip if we're currently saving this specific file
          if (currentActivePath && isSaveActive(currentActivePath)) {
            // This is likely our own save, ignore it
            return;
          }

          if (currentFileContent.isDirty) {
            currentToast.showWarning(
              'File was modified externally. Your unsaved changes may conflict. ' +
              'Save your changes to overwrite external modifications.'
            );
          } else {
            // Reload file from disk
            await currentFileContent.loadFile(currentActivePath);
            currentToast.showInfo('File reloaded due to external changes');
          }
        }

        // Reload directory tree
        await loadDirectory(rootPath);
      } catch (error) {
        console.error('[File Watcher] Error handling file change:', error);
        const currentToast = toastRef.current;
        currentToast.showError(
          `Failed to refresh directory: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    };

    if (window.electronAPI?.fileSystem?.onFileChange) {
      window.electronAPI.fileSystem.onFileChange(handleFileChange);
    }

    return () => {
      if (window.electronAPI?.fileSystem?.removeFileChangeListener) {
        window.electronAPI.fileSystem.removeFileChangeListener(handleFileChange);
      }
    };
  }, [rootPath, loadDirectory]);

  // Listen for menu events from main process - uses refs to prevent memory leak
  useEffect(() => {
    if (!window.electron) return;

    // Create stable wrapper functions that read from refs
    const wrappers = {
      'menu-new-file': () => handlersRef.current.newFile(),
      'menu-open-file': async () => await handlersRef.current.openFile(),
      'menu-open-folder': async () => await handlersRef.current.openFolder(),
      'menu-save': () => handlersRef.current.save(),
      'menu-toggle-sidebar': () => handlersRef.current.toggleSidebar(),
      'menu-find': () => handlersRef.current.find()
    };

    // Register all listeners
    Object.entries(wrappers).forEach(([channel, handler]) => {
      window.electron.on(channel as any, handler);
    });

    // Cleanup - remove all listeners
    return () => {
      Object.entries(wrappers).forEach(([channel, handler]) => {
        window.electron.removeListener(channel as any, handler);
      });
    };
  }, []); // Empty deps - runs only once on mount

  // Start/stop save tracking cleanup on mount/unmount
  useEffect(() => {
    startSaveTrackingCleanup();
    return () => {
      stopSaveTrackingCleanup();
    };
  }, []);

  return (
    <MainLayout
      theme={theme}
      onToggleTheme={toggleTheme}
      currentFile={fileContent.filePath || undefined}
      isDirty={fileContent.isDirty}
      wordCount={wordCount}
      cursorPosition={cursorPosition}
      onSave={handleSave}
      onOpenFolder={handleOpenFolder}
      onNewFile={handleNewFile}
      sidebar={rootPath ? <Sidebar /> : undefined}
    >
      {!rootPath ? (
        <NoDirectorySelected onOpenFolder={handleOpenFolder} />
      ) : !activePath ? (
        <NoFileOpen hasDirectory={!!rootPath} onNewFile={handleNewFile} />
      ) : (fileContent.loading || isLoadingFile) ? (
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-lg" role="status" aria-label="Loading file"></span>
        </div>
      ) : fileContent.error ? (
        <div className="flex items-center justify-center h-full">
          <div className="alert alert-error max-w-md">
            <span>{fileContent.error}</span>
          </div>
        </div>
      ) : (
        <EditorComponent
          content={fileContent.content}
          onUpdate={handleUpdate}
          onContentLoaded={handleContentLoaded}
          placeholder="Start typing your document..."
          editable={true}
        />
      )}
    </MainLayout>
  );
}

// Main App component with providers
function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <FileTreeProvider>
          <AppContent />
        </FileTreeProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

// Type definitions for Electron IPC
declare global {
  interface Window {
    electron?: {
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
    };
  }
}
