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

  // Track when we're saving to prevent file watcher from reloading during our own saves
  const isSavingRef = useRef(false);

  // Previous path for save-before-switch
  const previousPathRef = useRef<string | null>(null);

  // Save lifecycle callbacks to track save state
  const handleBeforeSave = useCallback(() => {
    isSavingRef.current = true;
  }, []);

  const handleAfterSave = useCallback((success: boolean) => {
    // Reset saving flag after a short delay to ignore file watcher events from our own save
    setTimeout(() => {
      isSavingRef.current = false;
    }, 500);
  }, []);

  const fileContent = useFileContent({
    enableAutoSave: true,
    autoSaveDelay: 1000,
    onBeforeSave: handleBeforeSave,
    onAfterSave: handleAfterSave
  });

  // Load file when activePath changes (with save-before-switch)
  useEffect(() => {
    const loadFileWithSave = async () => {
      if (!activePath) return;

      // Save previous file if it was dirty
      if (previousPathRef.current &&
          previousPathRef.current !== activePath &&
          fileContent.isDirty) {

        setIsLoadingFile(true);

        // Show toast for larger files that might take time to save
        const approxSizeInBytes = fileContent.content.length * 2;
        const shouldShowToast = approxSizeInBytes > 10240; // 10KB threshold
        if (shouldShowToast) {
          toast.showInfo('Saving previous file...');
        }

        const saveResult = await fileContent.saveFileSync();

        if (!saveResult.success) {
          // Save failed - show error and prevent switch
          toast.showError(
            `Failed to save ${previousPathRef.current}: ${saveResult.error}. ` +
            `Please fix the issue before switching files.`
          );
          setIsLoadingFile(false);

          // Revert the file selection in tree
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
        await fileContent.loadFile(activePath);
        previousPathRef.current = activePath;
      } catch (error) {
        console.error('Failed to load file:', error);
        toast.showError(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoadingFile(false);
      }
    };

    if (activePath && activePath !== fileContent.filePath) {
      loadFileWithSave();
    }
  }, [activePath, fileContent, setActiveFile, setFileDirty, toast]);

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

  // Auto-save on window blur
  useEffect(() => {
    let blurSaveTimeout: NodeJS.Timeout | null = null;
    const BLUR_SAVE_DEBOUNCE_MS = 100;

    const handleWindowBlur = () => {
      // Debounce rapid blur events (e.g., quick app switching)
      if (blurSaveTimeout) {
        clearTimeout(blurSaveTimeout);
      }

      blurSaveTimeout = setTimeout(async () => {
        // Only save if there's a dirty file open
        if (fileContent.isDirty && fileContent.filePath) {
          const result = await fileContent.saveFileSync();
          if (!result.success) {
            // Don't prevent blur, but show warning
            toast.showWarning(`Auto-save failed on window blur: ${result.error}`);
          }
        }
      }, BLUR_SAVE_DEBOUNCE_MS);
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      if (blurSaveTimeout) {
        clearTimeout(blurSaveTimeout);
      }
    };
  }, [fileContent, toast]);

  // File watcher - fixed memory leak by using refs
  useEffect(() => {
    if (!rootPath) return;

    const handleFileChange = async (event?: FileWatcherEvent) => {
      // Skip if we're currently saving
      if (isSavingRef.current) return;

      // Use refs to get latest values without causing effect re-runs
      const currentActivePath = activePathRef.current;
      const currentFileContent = fileContentRef.current;
      const currentToast = toastRef.current;

      // If active file was modified externally
      if (event?.path === currentActivePath) {
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
