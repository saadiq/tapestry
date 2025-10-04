/**
 * File Tree Type Definitions
 * Defines the data structures for the file tree navigation system
 */

export type FileNodeType = 'file' | 'directory';

export interface FileNode {
  /** Unique identifier for the node */
  id: string;
  /** File or directory name */
  name: string;
  /** Full path to the file/directory */
  path: string;
  /** Type of node */
  type: FileNodeType;
  /** Child nodes (only for directories) */
  children?: FileNode[];
  /** Whether the directory is expanded */
  isExpanded?: boolean;
  /** Whether this is the currently selected/active file */
  isActive?: boolean;
  /** File extension (for files only) */
  extension?: string;
  /** Last modified timestamp */
  lastModified?: number;
  /** File size in bytes (for files only) */
  size?: number;
}

export interface FileTreeState {
  /** Root directory being displayed */
  rootPath: string | null;
  /** Tree structure */
  nodes: FileNode[];
  /** Currently selected file path */
  selectedPath: string | null;
  /** Currently active file (opened in editor) */
  activePath: string | null;
  /** Search/filter query */
  searchQuery: string;
  /** Expanded directory paths */
  expandedPaths: Set<string>;
  /** Files with unsaved changes */
  dirtyPaths: Set<string>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

export interface FileTreeActions {
  /** Load a directory structure */
  loadDirectory: (path: string) => Promise<void>;
  /** Toggle directory expansion */
  toggleExpand: (path: string) => void;
  /** Select a file (highlight) */
  selectFile: (path: string) => void;
  /** Open a file (set as active in editor) */
  openFile: (path: string) => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Create a new file */
  createFile: (parentPath: string, fileName: string) => Promise<void>;
  /** Create a new directory */
  createDirectory: (parentPath: string, dirName: string) => Promise<void>;
  /** Rename a file or directory */
  rename: (oldPath: string, newName: string) => Promise<void>;
  /** Delete a file or directory */
  delete: (path: string) => Promise<void>;
  /** Refresh the tree */
  refresh: () => Promise<void>;
  /** Clear all state */
  clear: () => void;
  /** Mark a file as dirty (has unsaved changes) */
  setFileDirty: (path: string, isDirty: boolean) => void;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuState {
  isOpen: boolean;
  position: ContextMenuPosition;
  targetPath: string | null;
  targetType: FileNodeType | null;
}

export type ContextMenuAction =
  | 'new-file'
  | 'new-folder'
  | 'rename'
  | 'delete'
  | 'refresh'
  | 'reveal-in-finder';
