/**
 * Tests for useFileSwitcher hook
 *
 * These tests verify:
 * - Concurrent file switch prevention
 * - Save-before-switch blocking on failure
 * - Save-before-switch success flow
 * - Directory context management
 * - Large file warnings
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileSwitcher } from '../hooks/useFileSwitcher';
import { fileSystemService } from '../services/fileSystemService';
import type { UseFileContentReturn } from '../hooks/useFileContent';
import type { FileNode } from '../../shared/types/fileSystem';

// Mock the file system service
vi.mock('../services/fileSystemService', () => ({
  fileSystemService: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unwatchDirectory: vi.fn(),
    watchDirectory: vi.fn(),
  },
}));

describe('useFileSwitcher Hook', () => {
  let mockFileContent: UseFileContentReturn;
  let mockSetActiveFile: ReturnType<typeof vi.fn>;
  let mockSetFileDirty: ReturnType<typeof vi.fn>;
  let mockLoadDirectory: ReturnType<typeof vi.fn>;
  let mockShowToast: {
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
    showInfo: ReturnType<typeof vi.fn>;
    showWarning: ReturnType<typeof vi.fn>;
  };
  let mockNodes: FileNode[];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock file content object
    mockFileContent = {
      filePath: null,
      content: '',
      originalContent: '',
      isDirty: false,
      loading: false,
      saving: false,
      error: null,
      metadata: null,
      loadFile: vi.fn().mockResolvedValue(undefined),
      saveFile: vi.fn().mockResolvedValue(true),
      saveFileSync: vi.fn().mockResolvedValue({ success: true }),
      updateContent: vi.fn(),
      updateOriginalContent: vi.fn(),
      closeFile: vi.fn(),
      clearError: vi.fn(),
      clearAutoSaveTimer: vi.fn(),
    };

    mockSetActiveFile = vi.fn();
    mockSetFileDirty = vi.fn();
    mockLoadDirectory = vi.fn().mockResolvedValue(undefined);
    mockShowToast = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showInfo: vi.fn(),
      showWarning: vi.fn(),
    };

    mockNodes = [
      {
        path: '/test/file1.md',
        name: 'file1.md',
        isDirectory: false,
        size: 100,
      },
      {
        path: '/test/file2.md',
        name: 'file2.md',
        isDirectory: false,
        size: 200,
      },
    ] as FileNode[];
  });

  describe('Concurrent File Switch Prevention', () => {
    it('should prevent concurrent file switches', async () => {
      let loadFileResolver: (() => void) | null = null;
      const loadFilePromise = new Promise<void>((resolve) => {
        loadFileResolver = resolve;
      });

      // Mock loadFile to return a promise we control
      mockFileContent.loadFile = vi.fn().mockReturnValue(loadFilePromise);

      const { result, rerender } = renderHook(
        ({ activePath }) =>
          useFileSwitcher({
            activePath,
            fileContent: mockFileContent,
            nodes: mockNodes,
            rootPath: '/test',
            setActiveFile: mockSetActiveFile,
            setFileDirty: mockSetFileDirty,
            loadDirectory: mockLoadDirectory,
            showToast: mockShowToast,
          }),
        {
          initialProps: { activePath: null },
        }
      );

      // Trigger first file switch - this will start loading
      await act(async () => {
        rerender({ activePath: '/test/file1.md' });
      });

      // Verify first load started
      await waitFor(() => {
        expect(mockFileContent.loadFile).toHaveBeenCalledWith('/test/file1.md');
      });

      // Immediately trigger second file switch before first completes
      // This should be ignored due to isSwitchingFileRef guard
      await act(async () => {
        rerender({ activePath: '/test/file2.md' });
      });

      // Resolve the slow load
      await act(async () => {
        loadFileResolver?.();
        await loadFilePromise;
      });

      // The loadFile should only be called once (for the first switch)
      // The second switch should be ignored due to isSwitchingFileRef guard
      expect(mockFileContent.loadFile).toHaveBeenCalledTimes(1);
      expect(mockFileContent.loadFile).toHaveBeenCalledWith('/test/file1.md');
    });

    it('should allow sequential file switches', async () => {
      const { result, rerender } = renderHook(
        ({ activePath }) =>
          useFileSwitcher({
            activePath,
            fileContent: mockFileContent,
            nodes: mockNodes,
            rootPath: '/test',
            setActiveFile: mockSetActiveFile,
            setFileDirty: mockSetFileDirty,
            loadDirectory: mockLoadDirectory,
            showToast: mockShowToast,
          }),
        {
          initialProps: { activePath: null },
        }
      );

      // Update mockFileContent for first file
      mockFileContent.filePath = null;

      // First file switch
      await act(async () => {
        rerender({ activePath: '/test/file1.md' });
      });

      await waitFor(() => {
        expect(mockFileContent.loadFile).toHaveBeenCalledWith('/test/file1.md');
      });

      // Update mockFileContent to simulate file1 is now loaded
      mockFileContent.filePath = '/test/file1.md';
      mockFileContent.content = 'Content of file1';
      mockFileContent.originalContent = 'Content of file1';

      // Second file switch after first completes
      await act(async () => {
        rerender({ activePath: '/test/file2.md' });
      });

      await waitFor(() => {
        expect(mockFileContent.loadFile).toHaveBeenCalledWith('/test/file2.md');
        expect(mockFileContent.loadFile).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Save-Before-Switch Behavior', () => {
    it('should save dirty file before switching', async () => {
      const { result, rerender } = renderHook(
        ({ activePath }) =>
          useFileSwitcher({
            activePath,
            fileContent: mockFileContent,
            nodes: mockNodes,
            rootPath: '/test',
            setActiveFile: mockSetActiveFile,
            setFileDirty: mockSetFileDirty,
            loadDirectory: mockLoadDirectory,
            showToast: mockShowToast,
          }),
        {
          initialProps: { activePath: '/test/file1.md' },
        }
      );

      // Simulate file1 is loaded and dirty
      mockFileContent.filePath = '/test/file1.md';
      mockFileContent.content = 'Modified content';
      mockFileContent.originalContent = 'Original content';
      mockFileContent.isDirty = true;

      // Switch to file2
      await act(async () => {
        rerender({ activePath: '/test/file2.md' });
      });

      // Verify save was called before loading new file
      await waitFor(() => {
        expect(mockFileContent.saveFileSync).toHaveBeenCalled();
        expect(mockFileContent.loadFile).toHaveBeenCalledWith('/test/file2.md');
      });

      // Verify dirty state was cleared
      expect(mockSetFileDirty).toHaveBeenCalledWith('/test/file1.md', false);
    });

    it('should block file switch when save fails', async () => {
      // Mock save failure
      mockFileContent.saveFileSync = vi.fn().mockResolvedValue({
        success: false,
        error: 'Permission denied',
        filePath: '/test/file1.md',
      });

      const { result, rerender } = renderHook(
        ({ activePath }) =>
          useFileSwitcher({
            activePath,
            fileContent: mockFileContent,
            nodes: mockNodes,
            rootPath: '/test',
            setActiveFile: mockSetActiveFile,
            setFileDirty: mockSetFileDirty,
            loadDirectory: mockLoadDirectory,
            showToast: mockShowToast,
          }),
        {
          initialProps: { activePath: null },
        }
      );

      // First, load file1 to establish previousPathRef
      mockFileContent.filePath = null;
      mockFileContent.isDirty = false;

      await act(async () => {
        rerender({ activePath: '/test/file1.md' });
      });

      // Wait for file1 to load (this sets previousPathRef)
      await waitFor(() => {
        expect(mockFileContent.loadFile).toHaveBeenCalledWith('/test/file1.md');
      });

      // Now simulate file1 is loaded and dirty
      mockFileContent.filePath = '/test/file1.md';
      mockFileContent.content = 'Modified content';
      mockFileContent.originalContent = 'Original content';
      mockFileContent.isDirty = true;

      // Try to switch to file2
      await act(async () => {
        rerender({ activePath: '/test/file2.md' });
      });

      // Verify save was attempted
      await waitFor(() => {
        expect(mockFileContent.saveFileSync).toHaveBeenCalled();
      });

      // Verify error toast was shown
      expect(mockShowToast.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save'),
        0,
        expect.any(Object)
      );

      // Verify file switch was blocked (loadFile only called once for file1, not file2)
      expect(mockFileContent.loadFile).toHaveBeenCalledTimes(1);
      expect(mockFileContent.loadFile).toHaveBeenCalledWith('/test/file1.md');

      // Verify active file was reverted
      expect(mockSetActiveFile).toHaveBeenCalledWith('/test/file1.md');
    });

    it('should not save if file is not dirty', async () => {
      const { result, rerender } = renderHook(
        ({ activePath }) =>
          useFileSwitcher({
            activePath,
            fileContent: mockFileContent,
            nodes: mockNodes,
            rootPath: '/test',
            setActiveFile: mockSetActiveFile,
            setFileDirty: mockSetFileDirty,
            loadDirectory: mockLoadDirectory,
            showToast: mockShowToast,
          }),
        {
          initialProps: { activePath: '/test/file1.md' },
        }
      );

      // Simulate file1 is loaded but NOT dirty
      mockFileContent.filePath = '/test/file1.md';
      mockFileContent.content = 'Content';
      mockFileContent.originalContent = 'Content';
      mockFileContent.isDirty = false;

      // Switch to file2
      await act(async () => {
        rerender({ activePath: '/test/file2.md' });
      });

      // Verify save was NOT called
      await waitFor(() => {
        expect(mockFileContent.saveFileSync).not.toHaveBeenCalled();
        expect(mockFileContent.loadFile).toHaveBeenCalledWith('/test/file2.md');
      });
    });
  });

  describe('Large File Handling', () => {
    it('should show warning when loading large file', async () => {
      // Create a large file node (>5MB)
      const largeFileNodes: FileNode[] = [
        {
          path: '/test/large-file.md',
          name: 'large-file.md',
          isDirectory: false,
          size: 6_000_000, // 6MB
        },
      ] as FileNode[];

      const { result, rerender } = renderHook(
        ({ activePath }) =>
          useFileSwitcher({
            activePath,
            fileContent: mockFileContent,
            nodes: largeFileNodes,
            rootPath: '/test',
            setActiveFile: mockSetActiveFile,
            setFileDirty: mockSetFileDirty,
            loadDirectory: mockLoadDirectory,
            showToast: mockShowToast,
          }),
        {
          initialProps: { activePath: null },
        }
      );

      // Load large file
      await act(async () => {
        rerender({ activePath: '/test/large-file.md' });
      });

      // Verify warning toast was shown
      await waitFor(() => {
        expect(mockShowToast.showWarning).toHaveBeenCalledWith(
          expect.stringContaining('Loading large file')
        );
      });
    });

    it('should show "Saving..." toast for large files', async () => {
      const { result, rerender } = renderHook(
        ({ activePath }) =>
          useFileSwitcher({
            activePath,
            fileContent: mockFileContent,
            nodes: mockNodes,
            rootPath: '/test',
            setActiveFile: mockSetActiveFile,
            setFileDirty: mockSetFileDirty,
            loadDirectory: mockLoadDirectory,
            showToast: mockShowToast,
          }),
        {
          initialProps: { activePath: '/test/file1.md' },
        }
      );

      // Simulate file1 is loaded with large content (>10KB)
      mockFileContent.filePath = '/test/file1.md';
      mockFileContent.content = 'x'.repeat(6000); // 12KB in UTF-16
      mockFileContent.originalContent = 'Original';
      mockFileContent.isDirty = true;

      // Switch to file2
      await act(async () => {
        rerender({ activePath: '/test/file2.md' });
      });

      // Verify "Saving..." toast was shown
      await waitFor(() => {
        expect(mockShowToast.showInfo).toHaveBeenCalledWith('Saving previous file...');
      });
    });
  });

  describe('Directory Context Management', () => {
    it('should reload directory when file is outside current root', async () => {
      const { result } = renderHook(() =>
        useFileSwitcher({
          activePath: null,
          fileContent: mockFileContent,
          nodes: mockNodes,
          rootPath: '/test',
          setActiveFile: mockSetActiveFile,
          setFileDirty: mockSetFileDirty,
          loadDirectory: mockLoadDirectory,
          showToast: mockShowToast,
        })
      );

      // Try to ensure context for file outside current root
      await act(async () => {
        await result.current.ensureDirectoryContext('/other/directory/file.md');
      });

      // Verify directory was reloaded
      expect(fileSystemService.unwatchDirectory).toHaveBeenCalledWith('/test');
      expect(mockLoadDirectory).toHaveBeenCalledWith('/other/directory');
      expect(fileSystemService.watchDirectory).toHaveBeenCalledWith(
        '/other/directory'
      );
    });

    it('should not reload directory when file is within current root', async () => {
      const { result } = renderHook(() =>
        useFileSwitcher({
          activePath: null,
          fileContent: mockFileContent,
          nodes: mockNodes,
          rootPath: '/test',
          setActiveFile: mockSetActiveFile,
          setFileDirty: mockSetFileDirty,
          loadDirectory: mockLoadDirectory,
          showToast: mockShowToast,
        })
      );

      // Ensure context for file within current root
      await act(async () => {
        await result.current.ensureDirectoryContext('/test/subdirectory/file.md');
      });

      // Verify directory was NOT reloaded
      expect(fileSystemService.unwatchDirectory).not.toHaveBeenCalled();
      expect(mockLoadDirectory).not.toHaveBeenCalled();
    });

    it('should handle empty file path gracefully', async () => {
      const { result } = renderHook(() =>
        useFileSwitcher({
          activePath: null,
          fileContent: mockFileContent,
          nodes: mockNodes,
          rootPath: '/test',
          setActiveFile: mockSetActiveFile,
          setFileDirty: mockSetFileDirty,
          loadDirectory: mockLoadDirectory,
          showToast: mockShowToast,
        })
      );

      // Try with empty path
      await act(async () => {
        await result.current.ensureDirectoryContext('');
      });

      // Should not throw, should not reload
      expect(mockLoadDirectory).not.toHaveBeenCalled();
    });
  });
});
