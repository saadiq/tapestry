import { ReactNode } from 'react';
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
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar
        currentFile={currentFile}
        isDirty={isDirty}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onSave={onSave}
        onOpenFolder={onOpenFolder}
        onNewFile={onNewFile}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - manages its own collapse/resize */}
        {sidebar}

        {/* Main Content Area - flex-1 expands to fill remaining space */}
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
