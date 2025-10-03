/**
 * ContextMenu Component
 * Right-click context menu for file operations
 */

import { useState, useEffect, useRef } from 'react';
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
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [inputValue, setInputValue] = useState('');

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
        setShowRenameModal(false);
        setShowNewFileModal(false);
        setShowNewFolderModal(false);
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
    if (action === 'new-file') {
      setShowNewFileModal(true);
    } else if (action === 'new-folder') {
      setShowNewFolderModal(true);
    } else if (action === 'rename') {
      setShowRenameModal(true);
    } else {
      onAction(action, menuState.targetPath!);
      onClose();
    }
  };

  const handleSubmitNewFile = () => {
    if (inputValue.trim()) {
      onAction('new-file', menuState.targetPath!);
      // TODO: Pass the filename to the action
      console.log('Create file:', inputValue);
      setInputValue('');
      setShowNewFileModal(false);
      onClose();
    }
  };

  const handleSubmitNewFolder = () => {
    if (inputValue.trim()) {
      onAction('new-folder', menuState.targetPath!);
      // TODO: Pass the folder name to the action
      console.log('Create folder:', inputValue);
      setInputValue('');
      setShowNewFolderModal(false);
      onClose();
    }
  };

  const handleSubmitRename = () => {
    if (inputValue.trim()) {
      onAction('rename', menuState.targetPath!);
      // TODO: Pass the new name to the action
      console.log('Rename to:', inputValue);
      setInputValue('');
      setShowRenameModal(false);
      onClose();
    }
  };

  return (
    <>
      {/* Context Menu */}
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
              Reveal in Finder
            </a>
          </li>
        </ul>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">New File</h3>
            <div className="form-control mt-4">
              <input
                type="text"
                placeholder="Enter file name..."
                className="input input-bordered"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitNewFile();
                }}
                autoFocus
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowNewFileModal(false);
                  setInputValue('');
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmitNewFile}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">New Folder</h3>
            <div className="form-control mt-4">
              <input
                type="text"
                placeholder="Enter folder name..."
                className="input input-bordered"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitNewFolder();
                }}
                autoFocus
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowNewFolderModal(false);
                  setInputValue('');
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmitNewFolder}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Rename</h3>
            <div className="form-control mt-4">
              <input
                type="text"
                placeholder="Enter new name..."
                className="input input-bordered"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitRename();
                }}
                autoFocus
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowRenameModal(false);
                  setInputValue('');
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmitRename}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
