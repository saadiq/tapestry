import { useState, useRef, useEffect, ReactNode } from 'react';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';

interface MainLayoutProps {
  sidebar?: ReactNode;
  children?: ReactNode;
  currentFile?: string;
  isDirty?: boolean;
  wordCount?: number;
  cursorPosition?: { line: number; column: number };
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSave?: () => void;
  onOpenFolder?: () => void;
  onNewFile?: () => void;
}

export function MainLayout({
  sidebar,
  children,
  currentFile,
  isDirty = false,
  wordCount = 0,
  cursorPosition = { line: 1, column: 1 },
  theme = 'light',
  onToggleTheme,
  onSave,
  onOpenFolder,
  onNewFile
}: MainLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar
        currentFile={currentFile}
        isDirty={isDirty}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onToggleSidebar={toggleSidebar}
        onSave={onSave}
        onOpenFolder={onOpenFolder}
        onNewFile={onNewFile}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!sidebarCollapsed && sidebar && (
          <>
            <aside
              ref={sidebarRef}
              style={{ width: `${sidebarWidth}px` }}
              className="flex flex-col overflow-hidden border-r border-base-300 bg-base-100"
            >
              {sidebar}
            </aside>

            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`w-1 cursor-col-resize bg-base-300 transition-colors hover:bg-primary ${
                isResizing ? 'bg-primary' : ''
              }`}
            />
          </>
        )}

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-base-200">
          {children}
        </main>
      </div>

      <StatusBar
        wordCount={wordCount}
        cursorPosition={cursorPosition}
        currentFile={currentFile}
      />
    </div>
  );
}
