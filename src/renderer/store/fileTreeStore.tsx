/**
 * File Tree State Management
 * Uses React Context API for managing file tree state across components
 */

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { fileSystemService } from '../services/fileSystemService';
import type { DirectoryEntry } from '../../shared/types/fileSystem';
import type {
  FileNode,
  FileTreeState,
  FileTreeActions,
} from '../../shared/types/fileTree';

interface FileTreeContextValue extends FileTreeState, FileTreeActions {}

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

export function useFileTreeContext() {
  const context = useContext(FileTreeContext);
  if (!context) {
    throw new Error('useFileTreeContext must be used within FileTreeProvider');
  }
  return context;
}

interface FileTreeProviderProps {
  children: ReactNode;
}

export function FileTreeProvider({ children }: FileTreeProviderProps) {
  const [state, setState] = useState<FileTreeState>({
    rootPath: null,
    nodes: [],
    selectedPath: null,
    activePath: null,
    searchQuery: '',
    expandedPaths: new Set(),
    isLoading: false,
    error: null,
  });

  // Transform DirectoryEntry to FileNode
  const transformDirectoryEntriesToFileNodes = useCallback(
    (entries: DirectoryEntry[], basePath: string = '', expandedPaths?: Set<string>): FileNode[] => {
      return entries.map((entry) => {
        const node: FileNode = {
          id: entry.path,
          name: entry.name,
          path: entry.path,
          type: entry.isDirectory ? 'directory' : 'file',
          extension: entry.extension,
          // Preserve expanded state if expandedPaths is provided
          isExpanded: expandedPaths ? expandedPaths.has(entry.path) : false,
        };

        if (entry.children && entry.children.length > 0) {
          node.children = transformDirectoryEntriesToFileNodes(entry.children, entry.path, expandedPaths);
        }

        return node;
      });
    },
    []
  );

  // Load directory structure
  const loadDirectory = useCallback(async (path: string) => {
    // Capture current expanded paths before setting loading state
    let expandedPaths: Set<string> | undefined;
    setState((prev) => {
      expandedPaths = prev.expandedPaths;
      return { ...prev, isLoading: true, error: null };
    });

    try {
      // Call real IPC to load directory contents recursively
      const entries = await fileSystemService.readDirectory(path, true);

      // Transform with preserved expansion state
      const nodes = transformDirectoryEntriesToFileNodes(entries, path, expandedPaths);

      setState((prev) => ({
        ...prev,
        rootPath: path,
        nodes,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load directory',
      }));
    }
  }, [transformDirectoryEntriesToFileNodes]);

  // Toggle directory expansion
  const toggleExpand = useCallback((path: string) => {
    setState((prev) => {
      const newExpandedPaths = new Set(prev.expandedPaths);
      if (newExpandedPaths.has(path)) {
        newExpandedPaths.delete(path);
      } else {
        newExpandedPaths.add(path);
      }

      // Update isExpanded flag in nodes
      const updateNodes = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => {
          if (node.path === path) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) };
          }
          return node;
        });
      };

      return {
        ...prev,
        expandedPaths: newExpandedPaths,
        nodes: updateNodes(prev.nodes),
      };
    });
  }, []);

  // Select a file (highlight)
  const selectFile = useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      selectedPath: path,
    }));
  }, []);

  // Open a file (set as active in editor)
  const openFile = useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      activePath: path,
      selectedPath: path,
    }));
  }, []);

  // Set search query
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  // Create a new file
  const createFile = useCallback(async (parentPath: string, fileName: string) => {
    try {
      // Ensure .md extension
      const normalizedFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
      const filePath = `${parentPath}/${normalizedFileName}`;

      const result = await fileSystemService.createFile(filePath, '');

      if (result.success) {
        // Refresh directory tree to show new file
        if (state.rootPath) {
          await loadDirectory(state.rootPath);
        }
        return true;
      } else {
        throw new Error(result.error || 'Failed to create file');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create file',
      }));
      return false;
    }
  }, [state.rootPath, loadDirectory]);

  // Create a new directory
  const createDirectory = useCallback(async (parentPath: string, dirName: string) => {
    try {
      // Create directory by creating a .gitkeep file inside it
      const dirPath = `${parentPath}/${dirName}`;
      const gitkeepPath = `${dirPath}/.gitkeep.md`;

      const result = await fileSystemService.createFile(gitkeepPath, '');

      if (result.success) {
        // Refresh directory tree to show new directory
        if (state.rootPath) {
          await loadDirectory(state.rootPath);
        }
        return true;
      } else {
        throw new Error(result.error || 'Failed to create directory');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create directory',
      }));
      return false;
    }
  }, [state.rootPath, loadDirectory]);

  // Rename a file or directory
  const rename = useCallback(async (oldPath: string, newName: string) => {
    try {
      const pathParts = oldPath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');

      const result = await fileSystemService.renameFile(oldPath, newPath);

      if (result.success) {
        // Refresh directory tree to show renamed file
        if (state.rootPath) {
          await loadDirectory(state.rootPath);
        }
        return true;
      } else {
        throw new Error(result.error || 'Failed to rename');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to rename',
      }));
      return false;
    }
  }, [state.rootPath, loadDirectory]);

  // Delete a file or directory
  const deleteNode = useCallback(async (path: string) => {
    try {
      const result = await fileSystemService.deleteFile(path);

      if (result.success) {
        // Refresh directory tree to remove deleted file
        if (state.rootPath) {
          await loadDirectory(state.rootPath);
        }
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete',
      }));
      return false;
    }
  }, [state.rootPath, loadDirectory]);

  // Refresh the tree
  const refresh = useCallback(async () => {
    if (state.rootPath) {
      await loadDirectory(state.rootPath);
    }
  }, [state.rootPath, loadDirectory]);

  // Clear all state
  const clear = useCallback(() => {
    setState({
      rootPath: null,
      nodes: [],
      selectedPath: null,
      activePath: null,
      searchQuery: '',
      expandedPaths: new Set(),
      isLoading: false,
      error: null,
    });
  }, []);

  const value: FileTreeContextValue = {
    ...state,
    loadDirectory,
    toggleExpand,
    selectFile,
    openFile,
    setSearchQuery,
    createFile,
    createDirectory,
    rename,
    delete: deleteNode,
    refresh,
    clear,
  };

  return (
    <FileTreeContext.Provider value={value}>
      {children}
    </FileTreeContext.Provider>
  );
}
