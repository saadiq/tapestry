import { Menu, Save, FolderOpen, FileText, Sun, Moon } from 'lucide-react';

interface TitleBarProps {
  currentFile?: string;
  isDirty?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenFolder?: () => void;
  onNewFile?: () => void;
}

export function TitleBar({
  currentFile,
  isDirty = false,
  theme = 'light',
  onToggleTheme,
  onToggleSidebar,
  onSave,
  onOpenFolder,
  onNewFile
}: TitleBarProps) {
  return (
    <div className="navbar border-b border-base-300 bg-base-100 px-2">
      <div className="flex-none">
        <button
          className="btn btn-ghost btn-square btn-sm"
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 px-2">
          <span className="text-lg font-semibold">Tapestry</span>
          {currentFile && (
            <>
              <div className="divider divider-horizontal mx-0"></div>
              <FileText className="h-4 w-4 text-base-content/60" />
              <span className="text-base-content/80">
                {currentFile}
                {isDirty && <span className="ml-1 text-warning">•</span>}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-none">
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-square btn-sm"
            onClick={onOpenFolder}
            title="Open Folder (⌘O)"
          >
            <FolderOpen className="h-5 w-5" />
          </button>

          <button
            className="btn btn-ghost btn-square btn-sm"
            onClick={onNewFile}
            title="New File (⌘N)"
          >
            <FileText className="h-5 w-5" />
          </button>

          <button
            className="btn btn-ghost btn-square btn-sm"
            onClick={onSave}
            disabled={!isDirty}
            title="Save (⌘S)"
          >
            <Save className="h-5 w-5" />
          </button>

          <div className="divider divider-horizontal mx-1"></div>

          <button
            className="btn btn-ghost btn-square btn-sm"
            onClick={onToggleTheme}
            title="Toggle Theme"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
