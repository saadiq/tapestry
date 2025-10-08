/**
 * Main App Component
 */

import './index.css';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileTreeProvider, useFileTreeContext } from './store/fileTreeStore';
import { EditorComponent } from './components/Editor/EditorComponent';
import { NoDirectorySelected } from './components/EmptyStates/NoDirectorySelected';
import { NoFileOpen } from './components/EmptyStates/NoFileOpen';
import { ToastProvider, useToast } from './components/Notifications';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdateNotification } from './components/UpdateNotification';
import { InputModal } from './components/Modals/InputModal';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileContent } from './hooks/useFileContent';
import { useFileSwitcher } from './hooks/useFileSwitcher';
import { fileSystemService } from './services/fileSystemService';
import type { FileWatcherEvent } from '../shared/types/fileSystem';
import { normalizePath } from './utils/pathUtils';
import { TIMING_CONFIG } from '../shared/config/timing';

/**
 * Save tracking architecture:
 *
 * Each AppContent component instance maintains its own save tracking state to coordinate
 * with file system watchers and prevent false "external edit" warnings.
 *
 * Implementation details:
 * - activeSavesRef: Map<string, number> (normalized filePath -> timestamp)
 * - trackSaveStart: Marks when a save begins (adds timestamp)
 * - isSaveActive: Checks if file was saved within FILE_WATCHER_DEBOUNCE_MS (2000ms)
 * - No trackSaveEnd: Timestamps persist for full debounce window to prevent race conditions
 *
 * Why timestamps persist (no early removal):
 * 1. File watcher events arrive 500-2000ms after save completes (macOS/network drive latency)
 * 2. Early removal caused race conditions with false "external edit" warnings
 * 3. Memory is managed via eager cleanup when map exceeds threshold (50 entries)
 *
 * Previous approaches that didn't work:
 * - Module-level state: Poor isolation between component instances
 * - Periodic cleanup timer: Unnecessary overhead for typical usage
 * - trackSaveEnd with setTimeout: Race conditions with delayed file watcher events
 */

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
    createFile,
    error: fileTreeError,
  } = useFileTreeContext();
  const toast = useToast();
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // New file modal state
  const [newFileModal, setNewFileModal] = useState<{ isOpen: boolean }>({
    isOpen: false,
  });

  // Track which large files we've shown blur warnings for
  const shownBlurWarningsRef = useRef(new Set<string>());

  // Ref to track current file path for save callbacks
  const currentFilePathRef = useRef<string | null>(null);

  // Track files we're currently saving to ignore file watcher events
  const activeSavesRef = useRef(new Map<string, number>()); // normalized filePath -> timestamp
  const saveTrackingCleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Track that a save operation is starting for a file
   * Paths are automatically normalized for cross-platform consistency
   * Performs eager cleanup of stale entries to prevent memory growth
   */
  const trackSaveStart = useCallback((filePath: string): void => {
    const normalizedPath = normalizePath(filePath);
    const now = Date.now();

    console.log('[SaveTracking] trackSaveStart called');
    console.log('[SaveTracking]   File path:', filePath);
    console.log('[SaveTracking]   Normalized:', normalizedPath);
    console.log('[SaveTracking]   Timestamp:', now);

    // Only perform eager cleanup if map is getting large
    // This optimizes performance for normal usage while preventing memory leaks
    if (activeSavesRef.current.size > TIMING_CONFIG.SAVE_TRACKING_CLEANUP_THRESHOLD) {
      const maxAge = 5000; // 5 seconds
      console.log('[SaveTracking] Running eager cleanup, map size:', activeSavesRef.current.size);
      for (const [path, timestamp] of activeSavesRef.current.entries()) {
        if (now - timestamp > maxAge) {
          activeSavesRef.current.delete(path);
        }
      }
    }

    activeSavesRef.current.set(normalizedPath, now);
    console.log('[SaveTracking] Timestamp stored, map size now:', activeSavesRef.current.size);
  }, []);

  /**
   * Check if a file is currently being saved
   * Returns true if the file was saved within the debounce window
   */
  const isSaveActive = useCallback((filePath: string): boolean => {
    const normalizedPath = normalizePath(filePath);
    const saveTimestamp = activeSavesRef.current.get(normalizedPath);
    const now = Date.now();

    console.log('[SaveTracking] isSaveActive check');
    console.log('[SaveTracking]   File path:', filePath);
    console.log('[SaveTracking]   Normalized:', normalizedPath);
    console.log('[SaveTracking]   Timestamp:', saveTimestamp || 'NOT FOUND');

    if (!saveTimestamp) {
      console.log('[SaveTracking]   Result: FALSE (no timestamp)');
      return false;
    }

    const age = now - saveTimestamp;
    const isActive = age < TIMING_CONFIG.FILE_WATCHER_DEBOUNCE_MS;
    console.log('[SaveTracking]   Age:', age, 'ms');
    console.log('[SaveTracking]   Debounce window:', TIMING_CONFIG.FILE_WATCHER_DEBOUNCE_MS, 'ms');
    console.log('[SaveTracking]   Result:', isActive ? 'TRUE (within window)' : 'FALSE (too old)');

    return isActive;
  }, []);

  // Save lifecycle callbacks to track save state per file
  const handleBeforeSave = useCallback(() => {
    console.log('[SaveTracking] handleBeforeSave called');
    const currentPath = currentFilePathRef.current;
    console.log('[SaveTracking]   Current file path:', currentPath || 'NULL');
    if (currentPath) {
      trackSaveStart(currentPath);
    } else {
      console.warn('[SaveTracking] No current file path, skipping trackSaveStart');
    }
  }, [trackSaveStart]);

  const handleAfterSave = useCallback((_success: boolean) => {
    // Note: We intentionally don't do anything here because isSaveActive() uses timestamp checking.
    // The timestamp from handleBeforeSave persists for FILE_WATCHER_DEBOUNCE_MS (2000ms) to properly
    // ignore file watcher events triggered by our own saves. Periodic cleanup removes stale entries.
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

  // Use file switcher hook for file loading logic
  const { isLoadingFile, ensureDirectoryContext } = useFileSwitcher({
    activePath,
    fileContent,
    nodes,
    rootPath,
    setActiveFile,
    setFileDirty,
    loadDirectory,
    showToast: toast,
  });

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
    console.log('[App] handleContentLoaded called');
    console.log('[App]   Converted content length:', convertedContent.length);
    console.log('[App]   Current content length:', fileContent.content.length);
    console.log('[App]   isDirty:', fileContent.isDirty);

    // Only update content and originalContent when file is not dirty
    if (!fileContent.isDirty) {
      console.log('[App] File is clean, updating originalContent');
      fileContent.updateOriginalContent(convertedContent);

      // Only update content if it's actually different to prevent cursor jumps
      // This happens during auto-save: file becomes clean, editor fires onContentLoaded,
      // but content hasn't changed - updating it would reset cursor position
      if (fileContent.content !== convertedContent) {
        console.log('[App] Content differs, calling updateContent (THIS WILL CAUSE CURSOR JUMP!)');
        console.trace();
        fileContent.updateContent(convertedContent);
      } else {
        console.log('[App] Content is same, skipping updateContent');
      }
    } else {
      console.log('[App] File is dirty, skipping all updates');
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
    // Can only create files when a folder is open
    if (!rootPath) {
      toast.showWarning('Please open a folder first');
      return;
    }

    // Open the new file modal
    setNewFileModal({ isOpen: true });
  }, [rootPath, toast]);

  const handleNewFileConfirm = useCallback(async (fileName: string) => {
    if (!rootPath) {
      toast.showError('No folder is open');
      setNewFileModal({ isOpen: false });
      return;
    }

    try {
      // Close modal immediately for better UX
      setNewFileModal({ isOpen: false });

      // Create file in root directory using file tree context
      // Note: createFile handles adding .md extension internally
      // Validation is handled by InputModal with validateFilename prop
      const success = await createFile(rootPath, fileName);

      if (!success) {
        // Use detailed error from FileTreeContext instead of generic message
        toast.showError(fileTreeError || 'Failed to create file');
        return;
      }

      // Build the full path to the new file for opening in editor
      // We must normalize extension here because createFile doesn't return the path
      // This duplication with createFile's internal logic is acceptable (YAGNI)
      const normalizedFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
      // Use forward slash - works cross-platform, Node.js normalizes in main process
      const newFilePath = `${rootPath}/${normalizedFileName}`;

      // Open the newly created file in the editor
      setActiveFile(newFilePath);

      // Show success notification
      toast.showSuccess(`File "${normalizedFileName}" created successfully`);
    } catch (error) {
      console.error('Error creating file:', error);
      toast.showError(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [rootPath, createFile, setActiveFile, toast, fileTreeError]);

  const handleNewFileCancel = useCallback(() => {
    setNewFileModal({ isOpen: false });
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

  // Ref to track blur save timeout to prevent memory leaks
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save on window blur - uses refs to avoid re-registration
  useEffect(() => {
    const handleWindowBlur = () => {
      // Debounce rapid blur events (e.g., quick app switching)
      // Clear any pending timeout before creating a new one
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }

      // Capture full state snapshot at blur time to prevent data loss during file switches
      const capturedState = {
        filePath: fileContentRef.current.filePath,
        content: fileContentRef.current.content,
        isDirty: fileContentRef.current.isDirty,
      };

      blurTimeoutRef.current = setTimeout(async () => {
        // Get current refs for toast notifications
        const currentToast = toastRef.current;

        // Only save if the file was dirty when blur occurred and we have a valid file path
        if (!capturedState.isDirty || !capturedState.filePath) {
          return;
        }

        // Check file size to avoid blocking UI on large file saves
        // Use more accurate UTF-8 calculation: most markdown is ASCII (1 byte/char)
        // but allow for some multi-byte characters. Average ~1.5 bytes/char for markdown.
        const approxSizeInBytes = capturedState.content.length * 1.5;

        // For very large files (>5MB), defer the save to avoid UI jank during blur
        // User will be prompted to save on file switch or app close instead
        if (approxSizeInBytes > TIMING_CONFIG.LARGE_FILE_WARNING_THRESHOLD_BYTES) {
          console.log('[Blur Save] Skipping auto-save for large file on blur to prevent UI jank');

          // Show per-file info toast to inform user
          const warningKey = `${capturedState.filePath}-blur-warning`;
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

        // Save using captured state to ensure we save the right content even if user switched files
        // Track save start before attempting write
        trackSaveStart(capturedState.filePath);

        try {
          const result = await fileSystemService.writeFile(capturedState.filePath, capturedState.content);

          if (!result.success) {
            // Don't prevent blur, but show warning
            currentToast.showWarning(`Auto-save failed on window blur: ${result.error}`);
            // Note: We don't call trackSaveEnd on failure - the timestamp will age out naturally
            // This ensures we don't get false positives if the file gets modified externally shortly after
          } else {
            // Note: We don't call trackSaveEnd here - the timestamp from trackSaveStart (line 446)
            // persists for FILE_WATCHER_DEBOUNCE_MS (2000ms) to ignore file watcher events

            // Only clear dirty state if still on the same file
            if (fileContentRef.current.filePath === capturedState.filePath) {
              fileContentRef.current.updateOriginalContent(capturedState.content);
            }
          }
        } catch (error) {
          currentToast.showWarning(
            `Auto-save failed on window blur: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          // Note: We don't call trackSaveEnd on error - the timestamp will age out naturally
        }
      }, TIMING_CONFIG.BLUR_SAVE_DEBOUNCE_MS);
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, [trackSaveStart]); // Include tracking function (stable via useCallback)

  // Clear blur timeout and warnings when file is closed to prevent stale saves and memory leaks
  useEffect(() => {
    if (!fileContent.filePath) {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      // Clear shown blur warnings to prevent memory leak
      shownBlurWarningsRef.current.clear();
    }
  }, [fileContent.filePath]);

  // Refs for file watcher to avoid excessive re-registration
  // Must be declared AFTER fileContent is initialized
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;

  // Compute normalized active path synchronously to avoid race conditions
  const normalizedActivePath = useMemo(() => {
    return activePath ? normalizePath(activePath) : null;
  }, [activePath]);

  const fileContentRef = useRef(fileContent);
  fileContentRef.current = fileContent;

  const toastRef = useRef(toast);
  toastRef.current = toast;

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
        console.log('[FileWatcher] File change event received');
        console.log('[FileWatcher]   Event path:', event?.path || 'NONE');

        // Use refs to get latest values without causing effect re-runs
        const currentActivePath = activePathRef.current;
        const currentFileContent = fileContentRef.current;
        const currentToast = toastRef.current;

        // Normalize event path for cross-platform comparison (Windows vs Unix)
        const normalizedEventPath = event?.path ? normalizePath(event.path) : null;
        console.log('[FileWatcher]   Normalized event path:', normalizedEventPath || 'NONE');
        console.log('[FileWatcher]   Active path:', normalizedActivePath || 'NONE');

        // If active file was modified externally
        if (normalizedEventPath && normalizedActivePath && normalizedEventPath === normalizedActivePath) {
          console.log('[FileWatcher] Active file was modified!');

          // Skip if we're currently saving this specific file
          // Use fileContent.filePath since that's what trackSaveStart uses
          const currentFilePath = currentFileContent.filePath;
          console.log('[FileWatcher]   Current file path:', currentFilePath || 'NULL');

          if (currentFilePath && isSaveActive(currentFilePath)) {
            // This is likely our own save, ignore it
            console.log('[FileWatcher] IGNORED - Save is active for this file');
            return;
          }

          console.log('[FileWatcher] NOT IGNORED - Will check for external changes');

          if (currentFileContent.isDirty) {
            currentToast.showWarning(
              'File was modified externally. Your unsaved changes may conflict. ' +
              'Save your changes to overwrite external modifications.'
            );
          } else {
            // Before reloading, check if content actually changed
            // This prevents unnecessary reloads from spurious file watcher events
            const fileResult = await fileSystemService.readFile(currentActivePath);
            if (!fileResult.success) {
              console.warn('[File Watcher] Failed to read file for comparison:', fileResult.error);
              return;
            }

            // Only reload if content differs from what's in the editor
            if (fileResult.content !== currentFileContent.content) {
              await currentFileContent.loadFile(currentActivePath);
              currentToast.showInfo('File reloaded due to external changes');
            }
            // If content is the same, silently ignore (no reload, no toast)
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
  }, [rootPath, loadDirectory, normalizedActivePath, isSaveActive]);

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
    // Start periodic cleanup of stale save tracking entries
    if (saveTrackingCleanupIntervalRef.current) return; // Already running

    saveTrackingCleanupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const maxAge = 5000; // 5 seconds
      for (const [path, timestamp] of activeSavesRef.current.entries()) {
        if (now - timestamp > maxAge) {
          activeSavesRef.current.delete(path);
        }
      }
    }, 10000); // Cleanup every 10 seconds

    return () => {
      // Stop periodic cleanup on unmount
      if (saveTrackingCleanupIntervalRef.current) {
        clearInterval(saveTrackingCleanupIntervalRef.current);
        saveTrackingCleanupIntervalRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      activeSavesRef.current.clear();
    };
  }, []);

  return (
    <>
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

      {/* New File Modal */}
      <InputModal
        isOpen={newFileModal.isOpen}
        title="New File"
        message="Enter a name for the new file:"
        placeholder="notes.md"
        confirmText="Create"
        onConfirm={handleNewFileConfirm}
        onCancel={handleNewFileCancel}
        validateFilename={true}
      />

      {/* Update notification - renders on top of everything */}
      <UpdateNotification />
    </>
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
