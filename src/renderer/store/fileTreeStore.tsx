/**
 * File Tree State Management
 * Uses React Context API for managing file tree state across components
 */

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
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

  // Load directory structure
  const loadDirectory = useCallback(async (path: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      // TODO: This will be replaced with actual IPC call to main process (Track B)
      // For now, create mock data structure
      const mockNodes: FileNode[] = [
        {
          id: '1',
          name: 'docs',
          path: '/example/docs',
          type: 'directory',
          isExpanded: false,
          children: [
            {
              id: '1-1',
              name: 'README.md',
              path: '/example/docs/README.md',
              type: 'file',
              extension: 'md',
            },
          ],
        },
        {
          id: '2',
          name: 'notes.md',
          path: '/example/notes.md',
          type: 'file',
          extension: 'md',
        },
      ];

      setState((prev) => ({
        ...prev,
        rootPath: path,
        nodes: mockNodes,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load directory',
      }));
    }
  }, []);

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
    // TODO: Will be implemented with IPC call (Track B)
    console.log('Create file:', { parentPath, fileName });
  }, []);

  // Create a new directory
  const createDirectory = useCallback(async (parentPath: string, dirName: string) => {
    // TODO: Will be implemented with IPC call (Track B)
    console.log('Create directory:', { parentPath, dirName });
  }, []);

  // Rename a file or directory
  const rename = useCallback(async (oldPath: string, newName: string) => {
    // TODO: Will be implemented with IPC call (Track B)
    console.log('Rename:', { oldPath, newName });
  }, []);

  // Delete a file or directory
  const deleteNode = useCallback(async (path: string) => {
    // TODO: Will be implemented with IPC call (Track B)
    console.log('Delete:', { path });
  }, []);

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
