import './index.css';
import { useState, useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileTreeProvider } from './store/fileTreeStore';
import { EditorComponent } from './components/Editor/EditorComponent';
import { NoDirectorySelected } from './components/EmptyStates/NoDirectorySelected';
import { NoFileOpen } from './components/EmptyStates/NoFileOpen';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [content, setContent] = useState('<h1>Welcome to Tapestry</h1><p>Start editing your document...</p>');
  const [isDirty, setIsDirty] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const handleUpdate = (newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
    // Calculate word count from HTML content
    const text = newContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text.length > 0 ? text.split(' ').length : 0;
    setWordCount(words);
  };

  const handleSave = async () => {
    if (!isDirty || !currentFile) return;
    console.log('Save clicked:', currentFile);
    // TODO: Implement actual save with file system (Track B)
    setIsDirty(false);
  };

  const handleOpenFolder = async () => {
    console.log('Open folder clicked');
    // TODO: Wire up with file system API (Track B)
    if (window.electronAPI?.fileSystem?.openDirectory) {
      const result = await window.electronAPI.fileSystem.openDirectory();
      if (result.success && result.directoryPath) {
        setCurrentDirectory(result.directoryPath);
      }
    }
  };

  const handleNewFile = () => {
    console.log('New file clicked');
    // TODO: Implement with file system integration (Track B)
  };

  const handleToggleSidebar = () => {
    console.log('Toggle sidebar clicked');
    // Sidebar toggle is handled by MainLayout
  };

  const handleFind = () => {
    console.log('Find clicked');
    // TODO: Implement find functionality
  };

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleSave,
    onOpenFolder: handleOpenFolder,
    onNewFile: handleNewFile,
    onToggleSidebar: handleToggleSidebar,
    onFind: handleFind
  });

  // Listen for menu events from main process
  useEffect(() => {
    const handleMenuNewFile = () => handleNewFile();
    const handleMenuOpenFolder = (path: string) => {
      console.log('Menu open folder:', path);
      setCurrentDirectory(path);
    };
    const handleMenuSave = () => handleSave();
    const handleMenuToggleSidebar = () => handleToggleSidebar();
    const handleMenuFind = () => handleFind();

    // Set up IPC listeners (requires preload script setup)
    if (window.electron) {
      window.electron.on('menu-new-file', handleMenuNewFile);
      window.electron.on('menu-open-folder', handleMenuOpenFolder);
      window.electron.on('menu-save', handleMenuSave);
      window.electron.on('menu-toggle-sidebar', handleMenuToggleSidebar);
      window.electron.on('menu-find', handleMenuFind);
    }

    return () => {
      // Clean up listeners
      if (window.electron) {
        window.electron.removeListener('menu-new-file', handleMenuNewFile);
        window.electron.removeListener('menu-open-folder', handleMenuOpenFolder);
        window.electron.removeListener('menu-save', handleMenuSave);
        window.electron.removeListener('menu-toggle-sidebar', handleMenuToggleSidebar);
        window.electron.removeListener('menu-find', handleMenuFind);
      }
    };
  }, []);

  return (
    <FileTreeProvider>
      <MainLayout
        theme={theme}
        onToggleTheme={toggleTheme}
        currentFile={currentFile || undefined}
        isDirty={isDirty}
        wordCount={wordCount}
        cursorPosition={cursorPosition}
        onSave={handleSave}
        onOpenFolder={handleOpenFolder}
        onNewFile={handleNewFile}
        sidebar={currentDirectory ? <Sidebar /> : undefined}
      >
        {!currentDirectory ? (
          <NoDirectorySelected onOpenFolder={handleOpenFolder} />
        ) : !currentFile ? (
          <NoFileOpen hasDirectory={!!currentDirectory} onNewFile={handleNewFile} />
        ) : (
          <EditorComponent
            content={content}
            onUpdate={handleUpdate}
            placeholder="Start typing your document..."
            editable={true}
          />
        )}
      </MainLayout>
    </FileTreeProvider>
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
