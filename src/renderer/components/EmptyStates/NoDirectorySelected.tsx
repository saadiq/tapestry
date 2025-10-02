import { FolderOpen, Sparkles } from 'lucide-react';

interface NoDirectorySelectedProps {
  onOpenFolder?: () => void;
}

export function NoDirectorySelected({ onOpenFolder }: NoDirectorySelectedProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-base-200">
      <div className="hero">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <Sparkles className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-6 text-3xl font-bold">Welcome to Tapestry</h1>
            <p className="py-6 text-base-content/70">
              Your AI-powered document workspace. Get started by opening a folder
              to browse and edit your markdown files.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={onOpenFolder}
            >
              <FolderOpen className="h-5 w-5" />
              Open Folder
            </button>

            <div className="mt-8">
              <div className="text-sm text-base-content/60">
                <p className="mb-2">Keyboard shortcuts:</p>
                <div className="flex flex-col gap-1">
                  <p><kbd className="kbd kbd-sm">⌘</kbd> + <kbd className="kbd kbd-sm">O</kbd> Open Folder</p>
                  <p><kbd className="kbd kbd-sm">⌘</kbd> + <kbd className="kbd kbd-sm">N</kbd> New File</p>
                  <p><kbd className="kbd kbd-sm">⌘</kbd> + <kbd className="kbd kbd-sm">B</kbd> Toggle Sidebar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
