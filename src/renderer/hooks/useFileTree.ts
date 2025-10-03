/**
 * useFileTree Hook
 * Custom hook that provides file tree business logic and utilities
 */

import { useMemo, useCallback } from 'react';
import { useFileTreeContext } from '../store/fileTreeStore';
import type { FileNode } from '../../shared/types/fileTree';

export function useFileTree() {
  const context = useFileTreeContext();

  // Get filtered nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!context.searchQuery) {
      return context.nodes;
    }

    const query = context.searchQuery.toLowerCase();

    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .map((node) => {
          // Check if node name matches
          const nameMatches = node.name.toLowerCase().includes(query);

          // For directories, recursively filter children
          if (node.type === 'directory' && node.children) {
            const filteredChildren = filterNodes(node.children);

            // Include directory if it matches or has matching children
            if (nameMatches || filteredChildren.length > 0) {
              return {
                ...node,
                children: filteredChildren,
                isExpanded: filteredChildren.length > 0 ? true : node.isExpanded,
              };
            }
          }

          // Include file if it matches
          if (node.type === 'file' && nameMatches) {
            return node;
          }

          return null;
        })
        .filter((node): node is FileNode => node !== null);
    };

    return filterNodes(context.nodes);
  }, [context.nodes, context.searchQuery]);

  // Get node by path
  const getNodeByPath = useCallback(
    (path: string): FileNode | null => {
      const findNode = (nodes: FileNode[]): FileNode | null => {
        for (const node of nodes) {
          if (node.path === path) {
            return node;
          }
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      return findNode(context.nodes);
    },
    [context.nodes]
  );

  // Get parent node of a given path
  const getParentNode = useCallback(
    (path: string): FileNode | null => {
      const pathParts = path.split('/');
      if (pathParts.length <= 1) return null;

      const parentPath = pathParts.slice(0, -1).join('/');
      return getNodeByPath(parentPath);
    },
    [getNodeByPath]
  );

  // Check if a path is expanded
  const isPathExpanded = useCallback(
    (path: string): boolean => {
      return context.expandedPaths.has(path);
    },
    [context.expandedPaths]
  );

  // Expand all parent directories of a given path
  const expandToPath = useCallback(
    (path: string) => {
      const pathParts = path.split('/');
      const paths: string[] = [];

      // Build all parent paths
      for (let i = 1; i < pathParts.length; i++) {
        paths.push(pathParts.slice(0, i + 1).join('/'));
      }

      // Expand each parent path
      paths.forEach((p) => {
        if (!context.expandedPaths.has(p)) {
          context.toggleExpand(p);
        }
      });
    },
    [context]
  );

  // Collapse all directories
  const collapseAll = useCallback(() => {
    context.expandedPaths.forEach((path) => {
      context.toggleExpand(path);
    });
  }, [context]);

  // Expand all directories (recursive)
  const expandAll = useCallback(() => {
    const getAllPaths = (nodes: FileNode[]): string[] => {
      const paths: string[] = [];
      nodes.forEach((node) => {
        if (node.type === 'directory') {
          paths.push(node.path);
          if (node.children) {
            paths.push(...getAllPaths(node.children));
          }
        }
      });
      return paths;
    };

    const allPaths = getAllPaths(context.nodes);
    allPaths.forEach((path) => {
      if (!context.expandedPaths.has(path)) {
        context.toggleExpand(path);
      }
    });
  }, [context]);

  // Get file count (files only, not directories)
  const fileCount = useMemo(() => {
    const countFiles = (nodes: FileNode[]): number => {
      return nodes.reduce((count, node) => {
        if (node.type === 'file') {
          return count + 1;
        }
        if (node.children) {
          return count + countFiles(node.children);
        }
        return count;
      }, 0);
    };

    return countFiles(context.nodes);
  }, [context.nodes]);

  // Get directory count
  const directoryCount = useMemo(() => {
    const countDirectories = (nodes: FileNode[]): number => {
      return nodes.reduce((count, node) => {
        if (node.type === 'directory') {
          const childCount = node.children ? countDirectories(node.children) : 0;
          return count + 1 + childCount;
        }
        return count;
      }, 0);
    };

    return countDirectories(context.nodes);
  }, [context.nodes]);

  return {
    ...context,
    filteredNodes,
    getNodeByPath,
    getParentNode,
    isPathExpanded,
    expandToPath,
    collapseAll,
    expandAll,
    fileCount,
    directoryCount,
  };
}
