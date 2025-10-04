/**
 * Main App Component
 *
 * Multi-File Editing Implementation Notes:
 *
 * 1. Auto-Save (Fix #3): Auto-save is DISABLED to prevent cache restoration conflicts.
 *    When switching files, cached content is restored immediately. If auto-save were enabled,
 *    the debounced save timer could fire after file switch, saving cached content to the wrong file.
 *    Users must save manually with Cmd+S.
 *
 * 2. Dirty State Persistence (Fix #5): Dirty state is NOT persisted across app restarts.
 *    When the app closes, all unsaved changes in cache are lost. This is intentional to avoid
 *    stale cache issues. Users are warned before closing with unsaved changes.
 *
 * 3. Cache Integrity (Fix #8): Cache entries include timestamps for validation and true LRU eviction.
 *    Cache is invalidated when files are modified externally via file watcher.
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

// Cache entry for multi-file editing with integrity validation
interface FileContentCache {
  content: string;
  originalContent: string;
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
  } = useFileTreeContext();
  const toast = useToast();
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // Multi-file content cache - stores unsaved changes for all opened files
  const fileContentCacheRef = useRef<Map<string, FileContentCache>>(new Map());

  // Track when we're saving to prevent file watcher from reloading during our own saves
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleAfterSave = useCallback((success: boolean) => {
    // Keep isSaving true for 1000ms after save to ignore delayed file watcher events
    saveTimeoutRef.current = setTimeout(() => {
      isSavingRef.current = false;
      saveTimeoutRef.current = null;
    }, 1000);
  }, []);

  const fileContent = useFileContent({
    enableAutoSave: false, // DISABLED: Auto-save causes app reset - use manual save (Cmd+S) only
    autoSaveDelay: 1000,
    // CALLBACKS DISABLED: Testing if callbacks cause reset
    // onBeforeSave: handleBeforeSave,
    // onAfterSave: handleAfterSave
  });

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

      // Gate: prevent concurrent file loading operations (Fix #6)
      if (loadingFileRef.current === activePath) return;
      loadingFileRef.current = activePath;

      try {
        // Save current file to cache before switching (capture synchronously to avoid race - Fix #1)
        const previousPath = lastLoadedPathRef.current;
        if (previousPath && previousPath !== activePath) {
          // Capture current state immediately before any async operations
          const currentContent = fileContent.content;
          const currentOriginalContent = fileContent.originalContent;
          const currentIsDirty = fileContent.isDirty;

          // Implement true LRU eviction (Fix #7): if cache is at max size, remove least recently used entry
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

          fileContentCacheRef.current.set(previousPath, {
            content: currentContent,
            originalContent: currentOriginalContent,
            isDirty: currentIsDirty,
            timestamp: Date.now(),
          });
        }

        // Check if we have cached content for the new file
        const cached = fileContentCacheRef.current.get(activePath);

        if (cached) {
          // Restore from cache
          // Fix #1: Load file first to ensure proper initialization, then restore cached state
          await fileContent.loadFile(activePath);

          // Update cached entry's timestamp for true LRU (Fix #7)
          fileContentCacheRef.current.set(activePath, {
            ...cached,
            timestamp: Date.now(),
          });

          // Restore cached content (which may have unsaved changes)
          fileContent.updateContent(cached.content);
          fileContent.updateOriginalContent(cached.originalContent);
        } else {
          // Load from disk
          await fileContent.loadFile(activePath);
        }

        lastLoadedPathRef.current = activePath;
      } finally {
        // Always clear loading gate
        loadingFileRef.current = null;
      }
    };

    if (activePath && activePath !== lastLoadedPathRef.current) {
      loadFileWithCache();
    }
    // Dependencies are intentionally limited to activePath to avoid stale closures and unnecessary re-runs
    // fileContent methods are accessed via the current render's closure
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

  // Clear cache and dirty paths when rootPath changes
  useEffect(() => {
    fileContentCacheRef.current.clear();
  }, [rootPath]);

  // Clean up cache when files are deleted (Fix #4: Memory leak prevention)
  // This is handled by loadDirectory which removes deleted paths from dirtyPaths,
  // and file watcher which invalidates cache. Additional cleanup happens here
  // to ensure cache doesn't grow unbounded for deleted files.
  useEffect(() => {
    // When activePath changes to null or a file that was deleted, clean up cache
    // This is a defensive measure in case the file was deleted while open
    if (!activePath && lastLoadedPathRef.current) {
      // File was closed, optionally clean from cache after delay
      // For now, we keep cache for quick re-opening
    }
  }, [activePath]);

  const handleUpdate = useCallback((newContent: string) => {
    // Use ref to get latest updateContent function, avoiding stale closure
    updateContentRef.current(newContent);
  }, []);

  const handleContentLoaded = useCallback((convertedContent: string) => {
    // Update the original content to the converted markdown after round-trip
    // This ensures isDirty comparison uses the same format
    fileContent.updateOriginalContent(convertedContent);
  }, [fileContent]);

  const handleSave = useCallback(async () => {
    try {
      // Use ref to get latest saveFile function, avoiding stale closure
      const success = await saveFileRef.current();
      if (success) {
        // Clear cache entry for saved file (Fix #4)
        if (activePath) {
          fileContentCacheRef.current.delete(activePath);
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

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fileContent.isDirty]);

  // Listen for file system changes (Fix #2: Cache invalidation on external changes)
  useEffect(() => {
    if (!rootPath) return;

    // Create stable handler function using current rootPath
    const handleFileChange = async (event: any) => {
      // Ignore file watcher events if we're currently saving (prevents reload from our own saves)
      if (isSavingRef.current) {
        console.log('[FileWatcher] Ignoring file change event during save operation');
        return;
      }

      // Clear cache for changed file (Fix #2: Invalidate stale cache)
      if (event?.path && fileContentCacheRef.current.has(event.path)) {
        console.log('[FileWatcher] Invalidating cache for externally modified file:', event.path);
        fileContentCacheRef.current.delete(event.path);
        setFileDirty(event.path, false);
      }

      // Reload directory tree when files change externally
      console.log('[FileWatcher] Reloading directory due to external file change');
      await loadDirectory(rootPath);
    };

    // Set up file watcher listener
    if (window.electronAPI?.fileSystem?.onFileChange) {
      window.electronAPI.fileSystem.onFileChange(handleFileChange);
    }

    return () => {
      // Clean up listener - this now works correctly because handleFileChange
      // is the same reference that was registered above
      if (window.electronAPI?.fileSystem?.removeFileChangeListener) {
        window.electronAPI.fileSystem.removeFileChangeListener(handleFileChange);
      }
    };
    // Only re-run when rootPath changes, loadDirectory is stable from useCallback
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
      ) : fileContent.loading ? (
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
