import { useState, useEffect } from 'react';
import { FileText, Map } from 'lucide-react';

interface StatusBarProps {
  wordCount?: number;
  cursorPosition?: { line: number; column: number };
  currentFile?: string;
}

export function StatusBar({
  wordCount = 0,
  cursorPosition = { line: 1, column: 1 },
  currentFile
}: StatusBarProps) {
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // Get app version on mount
    window.electronAPI.getAppVersion().then((version) => {
      setAppVersion(version);
    });
  }, []);
  return (
    <footer className="flex items-center justify-between border-t border-base-300 bg-base-100 px-4 py-2 text-sm">
      <div className="flex items-center gap-4">
        {currentFile && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-base-content/60" />
            <span className="text-base-content/80">{currentFile}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-base-content/60" />
          <span className="text-base-content/80">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        </div>

        <div className="divider divider-horizontal mx-0"></div>

        <div className="text-base-content/80">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>

        {appVersion && (
          <>
            <div className="divider divider-horizontal mx-0"></div>
            <div className="text-base-content/50 text-xs">
              v{appVersion}
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
