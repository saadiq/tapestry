import { FileText, FolderTree } from 'lucide-react';

interface NoFileOpenProps {
  hasDirectory?: boolean;
  onNewFile?: () => void;
}

export function NoFileOpen({ hasDirectory = false, onNewFile }: NoFileOpenProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-base-200">
      <div className="hero">
        <div className="hero-content text-center">
          <div className="max-w-md">
            {hasDirectory ? (
              <>
                <FolderTree className="mx-auto h-16 w-16 text-secondary" />
                <h2 className="mt-6 text-2xl font-bold">No File Selected</h2>
                <p className="py-6 text-base-content/70">
                  Select a file from the sidebar to start editing, or create a new
                  markdown file to get started.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={onNewFile}
                >
                  <FileText className="h-5 w-5" />
                  New File
                </button>
              </>
            ) : (
              <>
                <FileText className="mx-auto h-16 w-16 text-base-content/40" />
                <h2 className="mt-6 text-2xl font-bold">No File Open</h2>
                <p className="py-6 text-base-content/70">
                  Open a folder to browse your files or create a new document.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
