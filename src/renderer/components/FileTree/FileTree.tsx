/**
 * FileTree Component
 * Main tree component with virtual scrolling and search functionality
 */

import { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X } from 'lucide-react';
import { FileTreeItem } from './FileTreeItem';
import { ContextMenu } from './ContextMenu';
import { InputModal, ConfirmDialog } from '../Modals';
import { useFileTreeContext } from '../../store/fileTreeStore';
import { useToast } from '../Notifications';
import type {
  FileNode,
  ContextMenuState,
  ContextMenuAction,
} from '../../../shared/types/fileTree';

interface FlatNode extends FileNode {
  depth: number;
}

export function FileTree() {
  const {
    nodes,
    selectedPath,
    activePath,
    searchQuery,
    isLoading,
    error,
    dirtyPaths,
    toggleExpand,
    selectFile,
    openFile,
    setSearchQuery,
    refresh,
    createFile,
    createDirectory,
    rename,
    delete: deleteNode,
  } = useFileTreeContext();

  const toast = useToast();

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    targetPath: null,
    targetType: null,
  });

  const [newFileModal, setNewFileModal] = useState<{ isOpen: boolean; parentPath: string }>({
    isOpen: false,
    parentPath: '',
  });

  const [newFolderModal, setNewFolderModal] = useState<{ isOpen: boolean; parentPath: string }>({
    isOpen: false,
    parentPath: '',
  });

  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; path: string; currentName: string }>({
    isOpen: false,
    path: '',
    currentName: '',
  });

  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; path: string; name: string }>({
    isOpen: false,
    path: '',
    name: '',
  });

  // Flatten tree structure for virtual scrolling
  const flattenedNodes = useMemo(() => {
    const flattened: FlatNode[] = [];

    const flatten = (nodes: FileNode[], depth = 0) => {
      for (const node of nodes) {
        // Filter by search query
        if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          continue;
        }

        flattened.push({ ...node, depth });

        // Add children if directory is expanded
        if (node.type === 'directory' && node.isExpanded && node.children) {
          flatten(node.children, depth + 1);
        }
      }
    };

    flatten(nodes);
    return flattened;
  }, [nodes, searchQuery]);

  // Virtual scrolling setup
  const parentRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);

  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // Estimated height of each row in pixels
    overscan: 10, // Number of items to render outside of visible area
  });

  const handleContextMenu = (event: React.MouseEvent, node: FileNode) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      targetPath: node.path,
      targetType: node.type,
    });
  };

  const handleContextMenuAction = async (action: ContextMenuAction, path: string) => {
    // Close context menu
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      targetPath: null,
      targetType: null,
    });

    // Handle context menu actions
    switch (action) {
      case 'refresh':
        refresh();
        break;
      case 'new-file':
        setNewFileModal({ isOpen: true, parentPath: path });
        break;
      case 'new-folder':
        setNewFolderModal({ isOpen: true, parentPath: path });
        break;
      case 'rename': {
        const pathParts = path.split('/');
        const currentName = pathParts[pathParts.length - 1];
        setRenameModal({ isOpen: true, path, currentName });
        break;
      }
      case 'delete': {
        const pathParts = path.split('/');
        const name = pathParts[pathParts.length - 1];
        setDeleteDialog({ isOpen: true, path, name });
        break;
      }
      case 'reveal-in-finder': {
        try {
          const result = await window.electronAPI.fileSystem.showItemInFolder(path);
          if (!result.success) {
            toast.showError(result.error || 'Failed to reveal item in file manager');
          }
        } catch (error) {
          console.error('Error revealing in finder:', error);
          toast.showError('Failed to reveal item in file manager');
        }
        break;
      }
    }
  };

  const handleNewFile = async (fileName: string) => {
    await createFile(newFileModal.parentPath, fileName);
    setNewFileModal({ isOpen: false, parentPath: '' });
  };

  const handleNewFolder = async (folderName: string) => {
    await createDirectory(newFolderModal.parentPath, folderName);
    setNewFolderModal({ isOpen: false, parentPath: '' });
  };

  const handleRename = async (newName: string) => {
    await rename(renameModal.path, newName);
    setRenameModal({ isOpen: false, path: '', currentName: '' });
  };

  const handleDelete = async () => {
    const success = await deleteNode(deleteDialog.path);
    const fileName = deleteDialog.name;
    setDeleteDialog({ isOpen: false, path: '', name: '' });

    if (success) {
      toast.showSuccess(`File "${fileName}" deleted successfully`);
    } else {
      toast.showError(`Failed to delete "${fileName}"`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const currentIndex = flattenedNodes.findIndex((node) => node.path === selectedPath);

    if (currentIndex === -1) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          selectFile(flattenedNodes[currentIndex - 1].path);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < flattenedNodes.length - 1) {
          selectFile(flattenedNodes[currentIndex + 1].path);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        {
          const currentNode = flattenedNodes[currentIndex];
          if (currentNode.type === 'directory' && !currentNode.isExpanded) {
            toggleExpand(currentNode.path);
          }
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        {
          const currentNode = flattenedNodes[currentIndex];
          if (currentNode.type === 'directory' && currentNode.isExpanded) {
            toggleExpand(currentNode.path);
          }
        }
        break;
      case 'Enter':
        event.preventDefault();
        {
          const currentNode = flattenedNodes[currentIndex];
          if (currentNode.type === 'file') {
            openFile(currentNode.path);
          } else {
            toggleExpand(currentNode.path);
          }
        }
        break;
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Search Bar */}
      <div className="p-2 border-b border-base-300">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-base-content/50" />
          <input
            type="text"
            placeholder="Search files..."
            className="input input-sm input-bordered w-full pl-9 pr-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-error m-2">
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && flattenedNodes.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-base-content/60">
            {searchQuery ? 'No files found' : 'No files to display'}
          </p>
        </div>
      )}

      {/* File Tree with Virtual Scrolling */}
      {!isLoading && !error && flattenedNodes.length > 0 && (
        <div
          ref={parentRef as any}
          className="flex-1 overflow-auto"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const node = flattenedNodes[virtualItem.index];
              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <FileTreeItem
                    node={node}
                    depth={node.depth}
                    onToggle={toggleExpand}
                    onSelect={selectFile}
                    onOpen={openFile}
                    onContextMenu={handleContextMenu}
                    isSelected={node.path === selectedPath}
                    isActive={node.path === activePath}
                    isDirty={dirtyPaths.has(node.path)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        menuState={contextMenu}
        onClose={() =>
          setContextMenu({
            isOpen: false,
            position: { x: 0, y: 0 },
            targetPath: null,
            targetType: null,
          })
        }
        onAction={handleContextMenuAction}
      />

      {/* New File Modal */}
      <InputModal
        isOpen={newFileModal.isOpen}
        title="New File"
        message="Enter a name for the new file:"
        placeholder="filename.md"
        confirmText="Create"
        onConfirm={handleNewFile}
        onCancel={() => setNewFileModal({ isOpen: false, parentPath: '' })}
      />

      {/* New Folder Modal */}
      <InputModal
        isOpen={newFolderModal.isOpen}
        title="New Folder"
        message="Enter a name for the new folder:"
        placeholder="folder-name"
        confirmText="Create"
        onConfirm={handleNewFolder}
        onCancel={() => setNewFolderModal({ isOpen: false, parentPath: '' })}
      />

      {/* Rename Modal */}
      <InputModal
        isOpen={renameModal.isOpen}
        title="Rename"
        message="Enter a new name:"
        placeholder="new-name"
        defaultValue={renameModal.currentName}
        confirmText="Rename"
        onConfirm={handleRename}
        onCancel={() => setRenameModal({ isOpen: false, path: '', currentName: '' })}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteDialog.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmButtonClass="btn-error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, path: '', name: '' })}
      />
    </div>
  );
}
