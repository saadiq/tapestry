import './index.css';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileTreeProvider, useFileTreeContext } from './store/fileTreeStore';
import { EditorComponent } from './components/Editor/EditorComponent';
import { NoDirectorySelected } from './components/EmptyStates/NoDirectorySelected';
import { NoFileOpen } from './components/EmptyStates/NoFileOpen';
import { ToastProvider, useToast } from './components/Notifications';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileContent } from './hooks/useFileContent';
import { fileSystemService } from './services/fileSystemService';

// Inner component that has access to FileTreeContext and Toast
function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const {
    loadDirectory,
    openFile: setActiveFile,
    activePath,
    rootPath,
  } = useFileTreeContext();
  const fileContent = useFileContent({ enableAutoSave: true, autoSaveDelay: 1000 }); // Auto-save after 1 second
  const toast = useToast();
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // Load file when activePath changes
  useEffect(() => {
    if (activePath) {
      fileContent.loadFile(activePath);
    }
  }, [activePath]);

  // Update word count when content changes
  useEffect(() => {
    if (fileContent.content) {
      const text = fileContent.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = text.length > 0 ? text.split(' ').length : 0;
      setWordCount(words);
    }
  }, [fileContent.content]);

  const handleUpdate = useCallback((newContent: string) => {
    fileContent.updateContent(newContent);
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
      setActiveFile(result.path);
      await fileContent.loadFile(result.path);
      toast.showSuccess(`Opened file: ${result.path.split('/').pop()}`);
    } else if (!result.canceled && result.error) {
      toast.showError(`Failed to open file: ${result.error}`);
    }
  }, [ensureDirectoryContext, fileContent, setActiveFile, toast]);

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

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fileContent.isDirty]);

  // Listen for file system changes
  useEffect(() => {
    if (!rootPath) return;

    const handleFileChange = async () => {
      // Reload directory tree when files change
      await loadDirectory(rootPath);
    };

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
    <ToastProvider>
      <FileTreeProvider>
        <AppContent />
      </FileTreeProvider>
    </ToastProvider>
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
