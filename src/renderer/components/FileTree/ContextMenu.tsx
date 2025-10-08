/**
 * ContextMenu Component
 * Right-click context menu for file operations
 */

import { useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderPlus,
  Edit3,
  Trash2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import type {
  ContextMenuState,
  ContextMenuAction,
  FileNode,
} from '../../../shared/types/fileTree';

interface ContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
  onAction: (action: ContextMenuAction, path: string) => void;
}

export function ContextMenu({ menuState, onClose, onAction }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (menuState.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuState.isOpen, onClose]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (menuState.isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [menuState.isOpen, onClose]);

  if (!menuState.isOpen || !menuState.targetPath) {
    return null;
  }

  const isDirectory = menuState.targetType === 'directory';

  const handleAction = (action: ContextMenuAction) => {
    onAction(action, menuState.targetPath!);
    onClose();
  };

  return (
    <div
        ref={menuRef}
        className="fixed z-50 bg-base-100 shadow-lg rounded-lg border border-base-300 py-2 min-w-48"
        style={{
          top: `${menuState.position.y}px`,
          left: `${menuState.position.x}px`,
        }}
      >
        <ul className="menu menu-sm p-0">
          {isDirectory && (
            <>
              <li>
                <a onClick={() => handleAction('new-file')}>
                  <FilePlus className="h-4 w-4" />
                  New File
                </a>
              </li>
              <li>
                <a onClick={() => handleAction('new-folder')}>
                  <FolderPlus className="h-4 w-4" />
                  New Folder
                </a>
              </li>
              <li>
                <div className="divider my-0"></div>
              </li>
            </>
          )}
          <li>
            <a onClick={() => handleAction('rename')}>
              <Edit3 className="h-4 w-4" />
              Rename
            </a>
          </li>
          <li>
            <a onClick={() => handleAction('delete')} className="text-error">
              <Trash2 className="h-4 w-4" />
              Delete
            </a>
          </li>
          <li>
            <div className="divider my-0"></div>
          </li>
          <li>
            <a onClick={() => handleAction('refresh')}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </a>
          </li>
          <li>
            <a onClick={() => handleAction('reveal-in-finder')}>
              <Eye className="h-4 w-4" />
              Reveal in File Manager
            </a>
          </li>
        </ul>
      </div>
    );
}
