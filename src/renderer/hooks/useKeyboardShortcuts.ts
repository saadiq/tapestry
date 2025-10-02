import { useEffect } from 'react';

interface KeyboardShortcuts {
  onSave?: () => void;
  onOpenFolder?: () => void;
  onNewFile?: () => void;
  onToggleSidebar?: () => void;
  onFind?: () => void;
}

export function useKeyboardShortcuts({
  onSave,
  onOpenFolder,
  onNewFile,
  onToggleSidebar,
  onFind
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = e.metaKey || e.ctrlKey;

      if (!isMod) return;

      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          onSave?.();
          break;
        case 'o':
          e.preventDefault();
          onOpenFolder?.();
          break;
        case 'n':
          e.preventDefault();
          onNewFile?.();
          break;
        case 'b':
          e.preventDefault();
          onToggleSidebar?.();
          break;
        case 'f':
          e.preventDefault();
          onFind?.();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, onOpenFolder, onNewFile, onToggleSidebar, onFind]);
}
