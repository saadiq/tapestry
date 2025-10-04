/**
 * Main App Component
 *
 * Multi-File Editing Implementation Notes:
 *
 * 1. Auto-Save: Re-enabled with cache-aware implementation. The auto-save timer is cleared
 *    when switching files, and the save operation validates that the file path hasn't changed.
 *    Cache entries are cleared after successful saves to maintain consistency.
 *
 * 2. Dirty State Persistence: Dirty state is NOT persisted across app restarts.
 *    When the app closes, all unsaved changes in cache are lost. This is intentional to avoid
 *    stale cache issues. Users are warned before closing with unsaved changes.
 *
 * 3. Cache Integrity: Cache entries include timestamps for validation and true LRU eviction.
 *    Cache is validated against disk content before restoration and invalidated when files
 *    are modified externally via file watcher.
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

// Cache entry for multi-file editing with integrity validation
interface FileContentCache {
  content: string;
  originalContent: string;
  rawDiskContent: string; // Raw disk content for cache validation
  isDirty: boolean;
  timestamp: number; // For cache validation and true LRU implementation
}

// Maximum number of files to keep in cache
const MAX_CACHE_SIZE = 10;

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

  // Multi-file content cache - stores unsaved changes for all opened files
  const fileContentCacheRef = useRef<Map<string, FileContentCache>>(new Map());

  // Track raw disk content for cache validation (Map: filePath -> raw content)
  const rawDiskContentRef = useRef<Map<string, string>>(new Map());

  // Track when we're saving to prevent file watcher from reloading during our own saves
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Queue for file watcher events during save window (Fix #3)
  const pendingFileEventsRef = useRef<FileWatcherEvent[]>([]);

  // Track last loaded file path to prevent redundant reloads
  const lastLoadedPathRef = useRef<string | null>(null);

  // Loading gate to prevent race conditions from rapid file switching
  const loadingFileRef = useRef<string | null>(null);

  // Save lifecycle callbacks to track save state
  const handleBeforeSave = useCallback(() => {
    isSavingRef.current = true;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  // Store file change handler in ref so we can call it for queued events (Fix #3)
  const handleFileChangeRef = useRef<((event: FileWatcherEvent | undefined) => Promise<void>) | null>(null);

  const handleAfterSave = useCallback((success: boolean) => {
    // Keep isSaving true for 1000ms after save to ignore delayed file watcher events
    saveTimeoutRef.current = setTimeout(() => {
      isSavingRef.current = false;
      saveTimeoutRef.current = null;

      // Clear cache entry after successful save (Fix #1: Memory Leak)
      // This handles both auto-save and manual save
      if (success && activePathRef.current) {
        fileContentCacheRef.current.delete(activePathRef.current);
        rawDiskContentRef.current.delete(activePathRef.current);
        setFileDirty(activePathRef.current, false);
      }

      // Process queued file watcher events (Fix #3)
      const events = pendingFileEventsRef.current;
      pendingFileEventsRef.current = [];

      // Process each queued event using the stored handler
      if (events.length > 0 && handleFileChangeRef.current) {
        console.log(`[FileWatcher] Processing ${events.length} queued event(s)`);
        events.forEach((event) => {
          handleFileChangeRef.current?.(event);
        });
      }
    }, 1000);
  }, [setFileDirty]);

  // Extract auto-save delay to constant (Fix #9)
  const AUTO_SAVE_DELAY_MS = 1000;

  const fileContent = useFileContent({
    enableAutoSave: true, // Re-enabled with cache-aware implementation
    autoSaveDelay: AUTO_SAVE_DELAY_MS,
    onBeforeSave: handleBeforeSave,
    onAfterSave: handleAfterSave
  });

  // Use refs for frequently changing values in file watcher to avoid closure issues
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;

  const fileContentRef = useRef(fileContent);
  fileContentRef.current = fileContent;

  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Store latest fileContent methods in refs to avoid stale closures
  // Update refs directly in render (safe because refs don't trigger re-renders)
  const saveFileRef = useRef(fileContent.saveFile);
  saveFileRef.current = fileContent.saveFile;

  const updateContentRef = useRef(fileContent.updateContent);
  updateContentRef.current = fileContent.updateContent;

  // Load file when activePath changes (only if it's actually different from last loaded)
  useEffect(() => {
    const loadFileWithCache = async () => {
      if (!activePath) return;

      // Gate: prevent concurrent file loading operations
      if (loadingFileRef.current === activePath) return;
      loadingFileRef.current = activePath;

      setIsLoadingFile(true);

      try {
        // Save current file to cache before switching (capture synchronously to avoid race condition)
        const previousPath = lastLoadedPathRef.current;
        if (previousPath && previousPath !== activePath) {
          // Capture current state immediately before any async operations (Fix #1: use getCurrentState)
          const currentState = fileContent.getCurrentState();
          const currentContent = currentState.content;
          const currentOriginalContent = currentState.originalContent;
          const currentIsDirty = currentState.isDirty;

          // Implement true LRU eviction: if cache is at max size, remove least recently used entry
          if (fileContentCacheRef.current.size >= MAX_CACHE_SIZE) {
            // Find oldest entry by timestamp
            let oldestPath: string | null = null;
            let oldestTime = Infinity;

            fileContentCacheRef.current.forEach((entry, path) => {
              if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestPath = path;
              }
            });

            if (oldestPath) {
              fileContentCacheRef.current.delete(oldestPath);
            }
          }

          // Get raw disk content from ref, or empty string if not available
          const rawDiskContent = rawDiskContentRef.current.get(previousPath) || '';

          fileContentCacheRef.current.set(previousPath, {
            content: currentContent,
            originalContent: currentOriginalContent,
            rawDiskContent: rawDiskContent,
            isDirty: currentIsDirty,
            timestamp: Date.now(),
          });
        }

        // Check if we have cached content for the new file
        const cached = fileContentCacheRef.current.get(activePath);

        if (cached) {
          // Validate cache before restoring - check if file was modified on disk
          try {
            const diskResult = await fileSystemService.readFile(activePath);

            // Store raw disk content for future validation
            rawDiskContentRef.current.set(activePath, diskResult.content);

            if (diskResult.content === cached.rawDiskContent) {
              // File unchanged on disk - safe to restore cached changes
              // Clear any pending auto-save timer before manual content update
              fileContent.clearAutoSaveTimer();
              // Manually set state to avoid double file read
              // Use cached originalContent (normalized) instead of disk content (raw)
              fileContent.updateOriginalContent(cached.originalContent);
              fileContent.updateContent(cached.content);

              // Update cached entry's timestamp for true LRU
              fileContentCacheRef.current.set(activePath, {
                ...cached,
                timestamp: Date.now(),
              });
            } else {
              // File changed on disk - invalidate cache and use disk content
              console.log('[Cache] File modified on disk, invalidating cache:', activePath);
              fileContentCacheRef.current.delete(activePath);
              // Clear any pending auto-save timer before manual content update
              fileContent.clearAutoSaveTimer();
              // Use already-read disk content instead of loading again
              fileContent.updateOriginalContent(diskResult.content);
              fileContent.updateContent(diskResult.content);
            }
          } catch (error) {
            // Error reading file for validation - invalidate cache and load from disk
            console.error('[Cache] Error validating cache, invalidating:', error);
            fileContentCacheRef.current.delete(activePath);
            toast.showError(`Error validating cached content: ${error instanceof Error ? error.message : 'Unknown error'}`);

            // Load file (loadFile will read the file internally)
            await fileContent.loadFile(activePath);
            // Raw content will be stored when switching away from this file
          }
        } else {
          // Load from disk and store raw content
          // Note: We read the file twice here - once in loadFile, once to store raw content
          // This is acceptable as it only happens on fresh load (not cache restoration)
          await fileContent.loadFile(activePath);

          // Store raw disk content for future cache validation
          try {
            const diskResult = await fileSystemService.readFile(activePath);
            rawDiskContentRef.current.set(activePath, diskResult.content);
          } catch (error) {
            console.error('[Cache] Failed to read raw disk content:', error);
            // Non-critical: cache validation will fail gracefully without raw content
          }
        }

        lastLoadedPathRef.current = activePath;
      } catch (error) {
        // Handle errors in file loading (Fix #5)
        console.error('[FileLoad] Error loading file:', error);
        toast.showError(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Optionally clear active file to show error state
      } finally {
        // Always clear loading gate and loading state
        loadingFileRef.current = null;
        setIsLoadingFile(false);
      }
    };

    if (activePath && activePath !== lastLoadedPathRef.current) {
      loadFileWithCache();
    }
    // Only depend on activePath - other dependencies (fileContent, setFileDirty, toast, setIsLoadingFile)
    // are either accessed via refs or are stable from hooks, avoiding stale closures
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

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

  // Clear cache when rootPath changes or directory is closed (Fix #3)
  useEffect(() => {
    // Clear cache when switching directories or closing directory (rootPath becomes null)
    fileContentCacheRef.current.clear();
    rawDiskContentRef.current.clear();
  }, [rootPath]);

  // Clean up cache for deleted files synchronously after directory reload (Fix #2)
  useEffect(() => {
    if (!rootPath || nodes.length === 0) return;

    // Collect all valid file paths from the current file tree
    const validPaths = new Set<string>();
    const collectPaths = (nodeList: typeof nodes) => {
      for (const node of nodeList) {
        validPaths.add(node.path);
        if (node.children) {
          collectPaths(node.children);
        }
      }
    };
    collectPaths(nodes);

    // Remove cache entries for files that no longer exist in the tree
    const cacheEntries = Array.from(fileContentCacheRef.current.keys());
    for (const path of cacheEntries) {
      if (!validPaths.has(path)) {
        console.log('[Cache] Removing deleted file from cache:', path);
        fileContentCacheRef.current.delete(path);
        rawDiskContentRef.current.delete(path);
        setFileDirty(path, false);
      }
    }
  }, [nodes, rootPath, setFileDirty]);

  const handleUpdate = useCallback((newContent: string) => {
    // Use ref to get latest updateContent function, avoiding stale closure
    updateContentRef.current(newContent);
  }, []);

  const handleContentLoaded = useCallback((convertedContent: string) => {
    // Only update content and originalContent when file is not dirty
    // This handles initial file load (normalizes markdown format) but preserves
    // unsaved changes when restoring from cache
    if (!fileContent.isDirty) {
      fileContent.updateOriginalContent(convertedContent);
      fileContent.updateContent(convertedContent);
    }
  }, [fileContent]);

  const handleSave = useCallback(async () => {
    try {
      // Use ref to get latest saveFile function, avoiding stale closure
      const success = await saveFileRef.current();
      if (success) {
        // Clear cache entry for saved file (Fix #4)
        if (activePath) {
          fileContentCacheRef.current.delete(activePath);
          rawDiskContentRef.current.delete(activePath);
          setFileDirty(activePath, false);
        }
        toast.showSuccess('File saved successfully');
      } else if (fileContent.error) {
        toast.showError(`Failed to save file: ${fileContent.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      throw error; // Re-throw to let ErrorBoundary catch it
    }
  }, [toast, fileContent.error, activePath, setFileDirty]);

  const ensureDirectoryContext = useCallback(
    async (filePath: string) => {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const trimmedPath = normalizedPath.replace(/\/+$/, '');
      const lastSlashIndex = trimmedPath.lastIndexOf('/');

      if (lastSlashIndex <= 0) {
        return;
      }

      let directoryPath = trimmedPath.slice(0, lastSlashIndex);
      if (/^[A-Za-z]:$/.test(directoryPath)) {
        directoryPath = `${directoryPath}/`;
      }

      const normalizedRoot = rootPath ? rootPath.replace(/\\/g, '/') : null;
      const shouldReloadTree =
        !normalizedRoot || !trimmedPath.startsWith(normalizedRoot);

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
      // Clear cache when switching directories
      fileContentCacheRef.current.clear();
      rawDiskContentRef.current.clear();
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

  // Warn before closing with unsaved changes (check both active file and cache)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if active file is dirty OR if any cached files are dirty
      const hasUnsavedChanges = fileContent.isDirty ||
        Array.from(fileContentCacheRef.current.values()).some(entry => entry.isDirty);

      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fileContent.isDirty]);

  // Clean up save timeout on component unmount (Fix: memory leak)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Listen for file system changes with proper handling of active file modifications
  useEffect(() => {
    if (!rootPath) return;

    // Create stable handler function using current rootPath
    const handleFileChange = async (event: FileWatcherEvent | undefined) => {
      // Queue file watcher events during save window instead of dropping them (Fix #3)
      if (isSavingRef.current) {
        console.log('[FileWatcher] Queueing file change event during save operation');
        if (event) {
          pendingFileEventsRef.current.push(event);
        }
        return;
      }

      // Handle external file modifications before reloading directory (Fix #4)
      if (event?.path) {
        // Handle active file being modified externally (using refs to avoid stale closures)
        if (event.path === activePathRef.current) {
          console.log('[FileWatcher] Active file modified externally:', event.path);

          if (fileContentRef.current.isDirty) {
            // User has unsaved changes - show warning in console
            // TODO: Implement conflict dialog for user to choose which version to keep
            console.warn('[FileWatcher] Conflict: Active file has unsaved changes but was modified externally');
            toastRef.current.showError('File was modified externally. Your unsaved changes may conflict.');
          } else {
            // No unsaved changes - safe to reload
            console.log('[FileWatcher] Reloading active file from disk');
            await fileContentRef.current.loadFile(event.path);
            // Clear cache for reloaded file (Fix #4)
            fileContentCacheRef.current.delete(event.path);
          }
        }

        // Always clear cache and dirty state for externally modified files (Fix #4)
        // This handles both cached and non-cached files (e.g., files evicted from LRU cache)
        fileContentCacheRef.current.delete(event.path);
        rawDiskContentRef.current.delete(event.path);
        setFileDirty(event.path, false);
      }

      // Reload directory tree when files change externally
      console.log('[FileWatcher] Reloading directory due to external file change');
      await loadDirectory(rootPath);
    };

    // Store handler in ref for queued event processing (Fix #3)
    handleFileChangeRef.current = handleFileChange;

    // Set up file watcher listener
    if (window.electronAPI?.fileSystem?.onFileChange) {
      window.electronAPI.fileSystem.onFileChange(handleFileChange);
    }

    return () => {
      // Clean up listener
      if (window.electronAPI?.fileSystem?.removeFileChangeListener) {
        window.electronAPI.fileSystem.removeFileChangeListener(handleFileChange);
      }
    };
    // Only re-run when rootPath or stable functions change (refs avoid stale closures)
  }, [rootPath, loadDirectory, setFileDirty]);

  // Listen for menu events from main process
  useEffect(() => {
    const handleMenuNewFile = () => handleNewFile();
    const handleMenuOpenFile = async () => {
      await handleOpenFile();
    };
    const handleMenuOpenFolder = async () => {
      await handleOpenFolder();
    };
    const handleMenuSave = () => handleSave();
    const handleMenuToggleSidebar = () => handleToggleSidebar();
    const handleMenuFind = () => handleFind();

    // Set up IPC listeners (requires preload script setup)
    if (window.electron) {
      window.electron.on('menu-new-file', handleMenuNewFile);
      window.electron.on('menu-open-file', handleMenuOpenFile);
      window.electron.on('menu-open-folder', handleMenuOpenFolder);
      window.electron.on('menu-save', handleMenuSave);
      window.electron.on('menu-toggle-sidebar', handleMenuToggleSidebar);
      window.electron.on('menu-find', handleMenuFind);
    }

    return () => {
      // Clean up listeners
      if (window.electron) {
        window.electron.removeListener('menu-new-file', handleMenuNewFile);
        window.electron.removeListener('menu-open-file', handleMenuOpenFile);
        window.electron.removeListener('menu-open-folder', handleMenuOpenFolder);
        window.electron.removeListener('menu-save', handleMenuSave);
        window.electron.removeListener('menu-toggle-sidebar', handleMenuToggleSidebar);
        window.electron.removeListener('menu-find', handleMenuFind);
      }
    };
  }, [handleNewFile, handleOpenFile, handleOpenFolder, handleSave, handleToggleSidebar, handleFind]);

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
          <span className="loading loading-spinner loading-lg"></span>
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
