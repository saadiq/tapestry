/**
 * FileTreeItem Component
 * Renders a single file or directory item in the tree
 */

import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileText } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { FileNode } from '../../../shared/types/fileTree';

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onOpen: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  onRename: (path: string, newName: string) => void;
  isSelected: boolean;
  isActive: boolean;
  isDirty: boolean;
}

export function FileTreeItem({
  node,
  depth,
  onToggle,
  onSelect,
  onOpen,
  onContextMenu,
  onRename,
  isSelected,
  isActive,
  isDirty,
}: FileTreeItemProps) {
  const isDirectory = node.type === 'directory';
  const hasChildren = isDirectory && node.children && node.children.length > 0;

  const [isRenaming, setIsRenaming] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (isDirectory) {
      onToggle(node.path);
      onSelect(node.path);
    } else {
      onOpen(node.path);
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    onContextMenu(event, node);
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    // Only allow inline rename for active files (already open)
    if (!isDirectory && isActive) {
      event.stopPropagation(); // Prevent triggering other handlers
      setIsRenaming(true);
      setEditValue(node.name);
    }
  };

  const handleRenameSubmit = () => {
    const trimmedValue = editValue.trim();

    // Validate: not empty and different from current name
    if (trimmedValue && trimmedValue !== node.name) {
      onRename(node.path, trimmedValue);
    }

    // Exit rename mode regardless of whether we submitted
    setIsRenaming(false);
    setEditValue(node.name); // Reset to current name
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setEditValue(node.name); // Reset to original name
  };

  const handleRenameKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleRenameSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleRenameCancel();
    }
  };

  const handleRenameBlur = () => {
    // Auto-save on blur (clicking outside the input)
    handleRenameSubmit();
  };

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      // Select all text for immediate replacement (standard file manager UX)
      inputRef.current.select();
    }
  }, [isRenaming, editValue.length]);

  // Get appropriate icon based on node type and state
  const getIcon = () => {
    if (isDirectory) {
      return node.isExpanded ? (
        <FolderOpen className="h-4 w-4 text-primary" />
      ) : (
        <Folder className="h-4 w-4 text-primary" />
      );
    }

    // Use different icons based on file extension
    if (node.extension === 'md') {
      return <FileText className="h-4 w-4 text-accent" />;
    }

    return <File className="h-4 w-4 text-base-content" />;
  };

  // Calculate indentation based on depth
  const indentStyle = {
    paddingLeft: `${depth * 12 + 8}px`,
  };

  return (
    <div
      className={`
        flex items-center gap-1 py-1 px-2 cursor-pointer select-none
        hover:bg-base-200 active:bg-base-300
        transition-colors duration-75
        ${isSelected ? 'bg-base-200' : ''}
        ${isActive ? 'bg-primary/10 border-l-2 border-primary' : ''}
      `}
      style={indentStyle}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Expand/collapse chevron (only for directories with children) */}
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {hasChildren && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.path);
            }}
            className="hover:bg-base-300 rounded p-0.5"
          >
            {node.isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </div>
        )}
      </div>

      {/* File/folder icon */}
      <div className="flex-shrink-0">{getIcon()}</div>

      {/* File/folder name */}
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          className="input input-xs input-bordered flex-1 min-w-0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameBlur}
          onKeyDown={handleRenameKeyDown}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={`
            text-sm truncate flex-1
            ${isActive ? 'font-semibold text-primary' : 'text-base-content'}
            ${isDirty ? 'italic' : ''}
          `}
          onDoubleClick={handleDoubleClick}
        >
          {node.name}
        </span>
      )}

      {/* Dirty indicator (orange dot) for files with unsaved changes */}
      {isDirty && node.type === 'file' && (
        <div className="w-2 h-2 rounded-full bg-warning flex-shrink-0" title="Unsaved changes" />
      )}
    </div>
  );
}
