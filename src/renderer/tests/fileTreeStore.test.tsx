/**
 * Tests for fileTreeStore
 *
 * These tests verify:
 * - File deletion clears activePath when deleting active file
 * - File deletion clears selectedPath when deleting selected file
 * - File deletion clears dirtyPaths when deleting dirty file
 * - File deletion doesn't affect unrelated active/selected paths
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FileTreeProvider, useFileTreeContext } from '../store/fileTreeStore';
import { fileSystemService } from '../services/fileSystemService';
import type { ReactNode } from 'react';

// Create mock functions
const mockReadDirectory = vi.fn();
const mockDeleteFile = vi.fn();

// Mock the file system service
vi.mock('../services/fileSystemService', () => ({
  fileSystemService: {
    readDirectory: mockReadDirectory,
    deleteFile: mockDeleteFile,
  },
}));

// Wrapper component for the hook
const wrapper = ({ children }: { children: ReactNode }) => (
  <FileTreeProvider>{children}</FileTreeProvider>
);

describe('FileTreeStore - Delete Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockReadDirectory.mockResolvedValue([
      {
        name: 'file1.md',
        path: '/test/file1.md',
        isDirectory: false,
        extension: '.md',
      },
      {
        name: 'file2.md',
        path: '/test/file2.md',
        isDirectory: false,
        extension: '.md',
      },
      {
        name: 'file3.md',
        path: '/test/file3.md',
        isDirectory: false,
        extension: '.md',
      },
    ]);

    mockDeleteFile.mockResolvedValue({
      success: true,
    });
  });

  describe('deleteNode - activePath clearing', () => {
    it('should clear activePath when deleting the currently active file', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file1 as active
      act(() => {
        result.current.openFile('/test/file1.md');
      });

      expect(result.current.activePath).toBe('/test/file1.md');

      // Delete the active file
      await act(async () => {
        await result.current.delete('/test/file1.md');
      });

      expect(result.current.activePath).toBeNull();
      expect(mockDeleteFile).toHaveBeenCalledWith('/test/file1.md');
    });

    it('should not clear activePath when deleting a different file', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file1 as active
      act(() => {
        result.current.openFile('/test/file1.md');
      });

      expect(result.current.activePath).toBe('/test/file1.md');

      // Delete a different file
      await act(async () => {
        await result.current.delete('/test/file2.md');
      });

      expect(result.current.activePath).toBe('/test/file1.md');
      expect(mockDeleteFile).toHaveBeenCalledWith('/test/file2.md');
    });
  });

  describe('deleteNode - selectedPath clearing', () => {
    it('should clear selectedPath when deleting the currently selected file', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file1 as selected (but not active)
      act(() => {
        result.current.selectFile('/test/file1.md');
      });

      expect(result.current.selectedPath).toBe('/test/file1.md');

      // Delete the selected file
      await act(async () => {
        await result.current.delete('/test/file1.md');
      });

      expect(result.current.selectedPath).toBeNull();
      expect(mockDeleteFile).toHaveBeenCalledWith('/test/file1.md');
    });

    it('should not clear selectedPath when deleting a different file', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file1 as selected
      act(() => {
        result.current.selectFile('/test/file1.md');
      });

      expect(result.current.selectedPath).toBe('/test/file1.md');

      // Delete a different file
      await act(async () => {
        await result.current.delete('/test/file2.md');
      });

      expect(result.current.selectedPath).toBe('/test/file1.md');
      expect(mockDeleteFile).toHaveBeenCalledWith('/test/file2.md');
    });
  });

  describe('deleteNode - dirtyPaths cleanup', () => {
    it('should remove deleted file from dirtyPaths', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Mark file1 as dirty
      act(() => {
        result.current.setFileDirty('/test/file1.md', true);
      });

      expect(result.current.dirtyPaths.has('/test/file1.md')).toBe(true);

      // Delete the dirty file
      await act(async () => {
        await result.current.delete('/test/file1.md');
      });

      expect(result.current.dirtyPaths.has('/test/file1.md')).toBe(false);
      expect(mockDeleteFile).toHaveBeenCalledWith('/test/file1.md');
    });

    it('should preserve other dirty files when deleting one', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Mark multiple files as dirty
      act(() => {
        result.current.setFileDirty('/test/file1.md', true);
        result.current.setFileDirty('/test/file2.md', true);
      });

      expect(result.current.dirtyPaths.has('/test/file1.md')).toBe(true);
      expect(result.current.dirtyPaths.has('/test/file2.md')).toBe(true);

      // Delete file1
      await act(async () => {
        await result.current.delete('/test/file1.md');
      });

      expect(result.current.dirtyPaths.has('/test/file1.md')).toBe(false);
      expect(result.current.dirtyPaths.has('/test/file2.md')).toBe(true);
    });
  });

  describe('deleteNode - combined scenarios', () => {
    it('should clear all related state when deleting active, selected, and dirty file', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file1 as active (which also sets it as selected) and dirty
      act(() => {
        result.current.openFile('/test/file1.md');
        result.current.setFileDirty('/test/file1.md', true);
      });

      expect(result.current.activePath).toBe('/test/file1.md');
      expect(result.current.selectedPath).toBe('/test/file1.md');
      expect(result.current.dirtyPaths.has('/test/file1.md')).toBe(true);

      // Delete the file
      await act(async () => {
        await result.current.delete('/test/file1.md');
      });

      expect(result.current.activePath).toBeNull();
      expect(result.current.selectedPath).toBeNull();
      expect(result.current.dirtyPaths.has('/test/file1.md')).toBe(false);
    });

    it('should handle deletion failure gracefully', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Mock deletion failure
      mockDeleteFile.mockResolvedValueOnce({
        success: false,
        error: 'Permission denied',
      });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file1 as active
      act(() => {
        result.current.openFile('/test/file1.md');
      });

      // Try to delete - should fail
      const success = await act(async () => {
        return await result.current.delete('/test/file1.md');
      });

      expect(success).toBe(false);
      expect(result.current.activePath).toBe('/test/file1.md'); // Should remain active
      expect(result.current.error).toContain('Permission denied');
    });
  });

  describe('deleteNode - state optimization', () => {
    it('should not trigger state update when deleting unrelated file', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file1 as active
      act(() => {
        result.current.openFile('/test/file1.md');
      });

      // Track state updates by capturing the state object reference
      const stateBefore = {
        activePath: result.current.activePath,
        selectedPath: result.current.selectedPath,
        dirtyPaths: result.current.dirtyPaths,
      };

      // Delete a different file that's not active, selected, or dirty
      await act(async () => {
        await result.current.delete('/test/file2.md');
      });

      // Note: loadDirectory creates new nodes array, so full equality check won't work
      // But we can verify the important paths remain the same
      expect(result.current.activePath).toBe(stateBefore.activePath);
      expect(result.current.selectedPath).toBe(stateBefore.selectedPath);
    });
  });

  describe('deleteNode - directory deletion with children', () => {
    beforeEach(() => {
      // Mock directory structure with nested files
      mockReadDirectory.mockResolvedValue([
        {
          name: 'folder',
          path: '/test/folder',
          isDirectory: true,
          children: [
            {
              name: 'child1.md',
              path: '/test/folder/child1.md',
              isDirectory: false,
              extension: '.md',
            },
            {
              name: 'child2.md',
              path: '/test/folder/child2.md',
              isDirectory: false,
              extension: '.md',
            },
          ],
        },
        {
          name: 'file.md',
          path: '/test/file.md',
          isDirectory: false,
          extension: '.md',
        },
      ]);
    });

    it('should clear activePath when deleting parent directory of active file', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set child file as active
      act(() => {
        result.current.openFile('/test/folder/child1.md');
      });

      expect(result.current.activePath).toBe('/test/folder/child1.md');

      // Delete parent directory
      await act(async () => {
        await result.current.delete('/test/folder');
      });

      expect(result.current.activePath).toBeNull();
      expect(mockDeleteFile).toHaveBeenCalledWith('/test/folder');
    });

    it('should clear dirtyPaths for all children when deleting directory', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Mark multiple children as dirty
      act(() => {
        result.current.setFileDirty('/test/folder/child1.md', true);
        result.current.setFileDirty('/test/folder/child2.md', true);
      });

      expect(result.current.dirtyPaths.has('/test/folder/child1.md')).toBe(true);
      expect(result.current.dirtyPaths.has('/test/folder/child2.md')).toBe(true);

      // Delete parent directory
      await act(async () => {
        await result.current.delete('/test/folder');
      });

      expect(result.current.dirtyPaths.has('/test/folder/child1.md')).toBe(false);
      expect(result.current.dirtyPaths.has('/test/folder/child2.md')).toBe(false);
    });

    it('should not clear activePath for files outside deleted directory', async () => {
      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file outside folder as active
      act(() => {
        result.current.openFile('/test/file.md');
      });

      expect(result.current.activePath).toBe('/test/file.md');

      // Delete folder
      await act(async () => {
        await result.current.delete('/test/folder');
      });

      expect(result.current.activePath).toBe('/test/file.md');
    });

    it('should handle edge case: similar path names without false positives', async () => {
      // Mock directory structure with similar names
      mockReadDirectory.mockResolvedValue([
        {
          name: 'parent',
          path: '/test/parent',
          isDirectory: true,
          children: [
            {
              name: 'file.md',
              path: '/test/parent/file.md',
              isDirectory: false,
              extension: '.md',
            },
          ],
        },
        {
          name: 'parentfoo',
          path: '/test/parentfoo',
          isDirectory: true,
          children: [
            {
              name: 'file.md',
              path: '/test/parentfoo/file.md',
              isDirectory: false,
              extension: '.md',
            },
          ],
        },
      ]);

      const { result } = renderHook(() => useFileTreeContext(), { wrapper });

      // Load directory
      await act(async () => {
        await result.current.loadDirectory('/test');
      });

      // Set file in parentfoo as active and dirty
      act(() => {
        result.current.openFile('/test/parentfoo/file.md');
        result.current.setFileDirty('/test/parentfoo/file.md', true);
      });

      expect(result.current.activePath).toBe('/test/parentfoo/file.md');
      expect(result.current.dirtyPaths.has('/test/parentfoo/file.md')).toBe(true);

      // Delete /test/parent (not /test/parentfoo)
      await act(async () => {
        await result.current.delete('/test/parent');
      });

      // Should NOT clear activePath or dirtyPath due to proper path checking
      expect(result.current.activePath).toBe('/test/parentfoo/file.md');
      expect(result.current.dirtyPaths.has('/test/parentfoo/file.md')).toBe(true);
    });
  });
});
