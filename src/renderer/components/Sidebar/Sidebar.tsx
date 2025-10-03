/**
 * Sidebar Component
 * Resizable sidebar container with collapse functionality
 */

import { useState, useRef, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen, FolderOpen } from 'lucide-react';
import { FileTree } from '../FileTree/FileTree';
import { useFileTreeContext } from '../../store/fileTreeStore';

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 280;

export function Sidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const { rootPath, loadDirectory } = useFileTreeContext();

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleOpenFolder = async () => {
    // TODO: This will trigger IPC call to open folder dialog (Track B)
    // For now, load mock data
    await loadDirectory('/example');
  };

  return (
    <>
      {/* Collapsed Sidebar - Just the toggle button */}
      {isCollapsed && (
        <div className="flex flex-col bg-base-200 border-r border-base-300 p-2">
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={toggleCollapse}
            title="Show sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Expanded Sidebar */}
      {!isCollapsed && (
        <div
          ref={sidebarRef}
          className="flex flex-col bg-base-200 border-r border-base-300 relative"
          style={{ width: `${width}px` }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-2 border-b border-base-300">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">Files</h2>
              {rootPath && (
                <span className="text-xs text-base-content/60 truncate">
                  {rootPath.split('/').pop()}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {!rootPath && (
                <button
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={handleOpenFolder}
                  title="Open folder"
                >
                  <FolderOpen className="h-4 w-4" />
                </button>
              )}
              <button
                className="btn btn-ghost btn-xs btn-square"
                onClick={toggleCollapse}
                title="Hide sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-hidden">
            {rootPath ? (
              <FileTree />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <FolderOpen className="h-12 w-12 text-base-content/30 mb-4" />
                <p className="text-sm text-base-content/60 mb-4">
                  No folder opened
                </p>
                <button className="btn btn-primary btn-sm" onClick={handleOpenFolder}>
                  <FolderOpen className="h-4 w-4" />
                  Open Folder
                </button>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div
            className={`
              absolute top-0 right-0 w-1 h-full cursor-col-resize
              hover:bg-primary/50 transition-colors
              ${isResizing ? 'bg-primary' : ''}
            `}
            onMouseDown={handleMouseDown}
          />
        </div>
      )}
    </>
  );
}
