# Implementation Plan: Remove Cache and Simplify Auto-Save

**Date**: December 2024
**Author**: Engineering Team
**Status**: Ready for Implementation
**Priority**: High - Data safety is our #1 priority

## Executive Summary

We are simplifying Tapestry's document management by removing the complex multi-file caching system and implementing a straightforward auto-save approach. When users switch between files, unsaved changes will be automatically saved. If auto-save fails, we'll display clear error messages to prevent data loss.

### Current Problems
1. **Complex Caching Logic**: 400+ lines of cache management code in `App.tsx` that handles edge cases like LRU eviction, cache validation, and dirty state tracking
2. **Confusing User Experience**: Users don't know which files have unsaved changes across multiple documents
3. **Race Conditions**: Complex timing issues between auto-save timers, file watchers, and cache updates
4. **Memory Concerns**: Caching up to 10 documents in memory without clear user benefit

### New Approach
- **Auto-save on blur**: When switching files, auto-save the current file immediately
- **Clear error handling**: Show toast notifications if save fails, keep user in current file
- **Single source of truth**: Only the active file has in-memory state
- **No caching**: Each file switch reads fresh from disk

## Architecture Overview

### Files to Modify

| File | Purpose | Changes Required |
|------|---------|-----------------|
| `src/renderer/App.tsx` | Main app component with cache | Remove all cache logic (~200 lines) |
| `src/renderer/hooks/useFileContent.ts` | File content management | Add sync save method, improve error handling |
| `src/renderer/store/fileTreeStore.tsx` | File tree state | Add save-before-switch logic |
| `src/renderer/components/Notifications/ToastContainer.tsx` | User notifications | Add warning variant for save failures |
| `tests/` | Test files | New tests for auto-save behavior |

### Removed Concepts
- `FileContentCache` interface and `fileContentCacheRef`
- `rawDiskContentRef` for cache validation
- `MAX_CACHE_SIZE` and LRU eviction logic
- Cache restoration on file switch
- Cache cleanup for deleted files
- Complex save lifecycle with pending events queue

## Detailed Implementation Tasks

### Task 1: Add Warning Toast Variant
**Files**: `src/renderer/components/Notifications/ToastContainer.tsx`, `Toast.tsx`
**Time Estimate**: 30 minutes
**Priority**: Do First (prerequisite)

#### Requirements
1. Add `showWarning` method to toast context
2. Add 'warning' to `ToastType` union
3. Style warning toast (yellow/orange color scheme)

#### Implementation
```typescript
// ToastContainer.tsx
interface ToastContextValue {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void; // NEW
  showInfo: (message: string, duration?: number) => void;
}

const showWarning = useCallback((message: string, duration = 4000) => {
  showToast(message, 'warning', duration);
}, [showToast]);

// Toast.tsx
export type ToastType = 'success' | 'error' | 'info' | 'warning'; // UPDATED

// Add warning styles in Toast component
const typeClasses = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
  warning: 'alert-warning', // NEW - DaisyUI should have this
};
```

#### Testing
```typescript
// Toast.test.tsx
describe('Toast Notifications', () => {
  it('displays warning toast with correct styling', () => {
    const { showWarning } = renderHook(() => useToast());
    act(() => showWarning('File save pending'));
    expect(screen.getByText('File save pending')).toHaveClass('alert-warning');
  });
});
```

#### Manual Testing
1. Open developer console
2. Run: `window.testToast = () => { /* trigger showWarning */ }`
3. Verify yellow/orange toast appears
4. Verify auto-dismisses after 4 seconds

---

### Task 2: Add Synchronous Save Method to useFileContent
**Files**: `src/renderer/hooks/useFileContent.ts`
**Time Estimate**: 1 hour
**Priority**: Do Second (core functionality)

#### Requirements
1. Add `saveFileSync` method that saves immediately (no debounce)
2. Clear any pending auto-save timers before sync save
3. Return detailed result object with success/error info
4. Ensure proper error handling

#### Implementation
```typescript
// useFileContent.ts

interface SaveResult {
  success: boolean;
  error?: string;
  filePath?: string;
}

interface UseFileContentReturn extends UseFileContentState {
  // ... existing methods ...
  saveFileSync: () => Promise<SaveResult>; // NEW
}

export function useFileContent(options: UseFileContentOptions = {}): UseFileContentReturn {
  // ... existing code ...

  /**
   * Save file immediately without debounce
   * Used when switching files to ensure data is persisted
   */
  const saveFileSync = useCallback(async (): Promise<SaveResult> => {
    // Clear any pending auto-save timer
    clearAutoSaveTimer();

    const filePath = state.filePath;

    if (!filePath) {
      return {
        success: false,
        error: 'No file is currently open'
      };
    }

    if (!state.isDirty) {
      // No changes to save - this is success
      return {
        success: true,
        filePath
      };
    }

    // Call before save callback
    onBeforeSave?.();

    setState((prev) => ({ ...prev, saving: true, error: null }));

    try {
      const result = await fileSystemService.writeFile(filePath, state.content);

      if (result.success) {
        setState((prev) => ({
          ...prev,
          originalContent: prev.content,
          isDirty: false,
          saving: false,
        }));
        onAfterSave?.(true);
        return {
          success: true,
          filePath
        };
      } else {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: result.error || 'Failed to save file',
        }));
        onAfterSave?.(false);
        return {
          success: false,
          error: result.error || 'Failed to save file',
          filePath
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save file';
      setState((prev) => ({
        ...prev,
        saving: false,
        error: errorMessage,
      }));
      onAfterSave?.(false);
      return {
        success: false,
        error: errorMessage,
        filePath
      };
    }
  }, [state.filePath, state.content, state.isDirty, clearAutoSaveTimer,
      onBeforeSave, onAfterSave]);

  return {
    ...state,
    loadFile,
    saveFile,
    saveFileSync, // NEW
    updateContent,
    updateOriginalContent,
    closeFile,
    clearError,
    clearAutoSaveTimer,
    getCurrentState,
  };
}
```

#### Testing
```typescript
// useFileContent.test.ts
describe('useFileContent', () => {
  describe('saveFileSync', () => {
    it('saves immediately without debounce', async () => {
      const { result } = renderHook(() => useFileContent());

      // Load a file
      await act(async () => {
        await result.current.loadFile('/test/file.md');
      });

      // Make changes
      act(() => {
        result.current.updateContent('new content');
      });

      // Save synchronously
      const saveResult = await act(async () => {
        return await result.current.saveFileSync();
      });

      expect(saveResult.success).toBe(true);
      expect(result.current.isDirty).toBe(false);
    });

    it('returns error when save fails', async () => {
      // Mock write failure
      fileSystemService.writeFile = jest.fn().mockResolvedValue({
        success: false,
        error: 'Permission denied'
      });

      const { result } = renderHook(() => useFileContent());

      await act(async () => {
        await result.current.loadFile('/test/file.md');
      });

      act(() => {
        result.current.updateContent('new content');
      });

      const saveResult = await act(async () => {
        return await result.current.saveFileSync();
      });

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toBe('Permission denied');
      expect(result.current.isDirty).toBe(true); // Still dirty
    });

    it('clears pending auto-save timer', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useFileContent({
        enableAutoSave: true,
        autoSaveDelay: 1000
      }));

      await act(async () => {
        await result.current.loadFile('/test/file.md');
      });

      // Trigger auto-save timer
      act(() => {
        result.current.updateContent('new content');
      });

      // Save synchronously before timer fires
      await act(async () => {
        await result.current.saveFileSync();
      });

      // Advance timers - auto-save should not fire
      jest.advanceTimersByTime(2000);

      // Verify only one save occurred
      expect(fileSystemService.writeFile).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});
```

---

### Task 3: Remove Cache Logic from App.tsx
**Files**: `src/renderer/App.tsx`
**Time Estimate**: 2 hours
**Priority**: Do Third (main refactor)

#### Requirements
1. Remove all cache-related interfaces, refs, and state
2. Remove cache save/restore logic in file switch effect
3. Implement save-before-switch behavior
4. Simplify file watcher handling
5. Update beforeunload to only check active file

#### What to Remove (line numbers from current file)
- Lines 35-42: `FileContentCache` interface
- Line 45: `MAX_CACHE_SIZE` constant
- Line 64: `fileContentCacheRef`
- Line 67: `rawDiskContentRef`
- Lines 72-74: Save tracking refs (keep simplified version)
- Lines 74: `pendingFileEventsRef`
- Lines 93-120: Complex save lifecycle (simplify)
- Lines 162-275: File loading with cache (replace with simple load)
- Lines 301-334: Cache cleanup effects
- Lines 418-419: Cache clearing in folder operations
- Lines 456-463: Complex beforeunload check

#### New Implementation
```typescript
// App.tsx - Simplified version
function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const {
    loadDirectory,
    openFile: setActiveFile,
    activePath,
    rootPath,
    setFileDirty,
    nodes,
  } = useFileTreeContext();
  const toast = useToast();
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Track when we're saving (simplified)
  const isSavingRef = useRef(false);

  // Previous path for save-before-switch
  const previousPathRef = useRef<string | null>(null);

  // File content hook with auto-save
  const fileContent = useFileContent({
    enableAutoSave: true,
    autoSaveDelay: 1000,
    onBeforeSave: useCallback(() => {
      isSavingRef.current = true;
    }, []),
    onAfterSave: useCallback((success: boolean) => {
      isSavingRef.current = false;
      if (!success && fileContent.error) {
        toast.showError(`Auto-save failed: ${fileContent.error}`);
      }
    }, [toast, fileContent.error])
  });

  // Load file when activePath changes (with save-before-switch)
  useEffect(() => {
    const loadFileWithSave = async () => {
      if (!activePath) return;

      // Save previous file if it was dirty
      if (previousPathRef.current &&
          previousPathRef.current !== activePath &&
          fileContent.isDirty) {

        setIsLoadingFile(true);
        toast.showInfo('Saving previous file...');

        const saveResult = await fileContent.saveFileSync();

        if (!saveResult.success) {
          // Save failed - show error and prevent switch
          toast.showError(
            `Failed to save ${previousPathRef.current}: ${saveResult.error}. ` +
            `Please fix the issue before switching files.`
          );
          setIsLoadingFile(false);

          // Revert the file selection in tree
          // The activePath !== fileContent.filePath guard prevents infinite loop
          // because fileContent.filePath is already previousPathRef.current
          if (previousPathRef.current !== activePath) {
            setActiveFile(previousPathRef.current);
          }
          return;
        }

        // Clear dirty state in tree for saved file
        setFileDirty(previousPathRef.current, false);
      }

      // Load the new file
      setIsLoadingFile(true);
      try {
        await fileContent.loadFile(activePath);
        previousPathRef.current = activePath;
      } catch (error) {
        console.error('Failed to load file:', error);
        toast.showError(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoadingFile(false);
      }
    };

    if (activePath && activePath !== fileContent.filePath) {
      loadFileWithSave();
    }
  }, [activePath, fileContent, setActiveFile, setFileDirty, toast]);

  // Update word count when content changes
  useEffect(() => {
    if (fileContent.content) {
      const text = fileContent.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = text.length > 0 ? text.split(' ').length : 0;
      setWordCount(words);
    }
  }, [fileContent.content]);

  // Sync dirty state to file tree
  useEffect(() => {
    if (activePath) {
      setFileDirty(activePath, fileContent.isDirty);
    }
  }, [activePath, fileContent.isDirty, setFileDirty]);

  // Handle manual save
  const handleSave = useCallback(async () => {
    const success = await fileContent.saveFile();
    if (success) {
      toast.showSuccess('File saved successfully');
    } else if (fileContent.error) {
      toast.showError(`Failed to save file: ${fileContent.error}`);
    }
  }, [fileContent, toast]);

  // File watcher - simplified
  useEffect(() => {
    if (!rootPath) return;

    const handleFileChange = async (event?: FileWatcherEvent) => {
      // Skip if we're currently saving
      if (isSavingRef.current) return;

      // If active file was modified externally
      if (event?.path === activePath) {
        if (fileContent.isDirty) {
          toast.showWarning(
            'File was modified externally. Your unsaved changes may conflict. ' +
            'Save your changes to overwrite external modifications.'
          );
        } else {
          // Reload file from disk
          await fileContent.loadFile(activePath);
          toast.showInfo('File reloaded due to external changes');
        }
      }

      // Reload directory tree
      await loadDirectory(rootPath);
    };

    if (window.electronAPI?.fileSystem?.onFileChange) {
      window.electronAPI.fileSystem.onFileChange(handleFileChange);
    }

    return () => {
      if (window.electronAPI?.fileSystem?.removeFileChangeListener) {
        window.electronAPI.fileSystem.removeFileChangeListener(handleFileChange);
      }
    };
  }, [rootPath, activePath, fileContent, loadDirectory, toast]);

  // Warn before closing with unsaved changes (simplified)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (fileContent.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [fileContent.isDirty]);

  // ... rest of component (UI rendering, keyboard shortcuts, etc.)
}
```

#### Testing Requirements
```typescript
// App.test.tsx
describe('App - Auto-save on file switch', () => {
  it('saves dirty file when switching to another file', async () => {
    const { getByTestId } = render(<App />);

    // Load first file
    await act(async () => {
      fireEvent.click(getByTestId('file-1'));
    });

    // Make changes
    const editor = getByTestId('editor');
    await act(async () => {
      fireEvent.change(editor, { target: { value: 'modified content' } });
    });

    // Switch to second file
    await act(async () => {
      fireEvent.click(getByTestId('file-2'));
    });

    // Verify save was called for first file
    expect(fileSystemService.writeFile).toHaveBeenCalledWith(
      '/test/file-1.md',
      'modified content'
    );

    // Verify second file loaded
    expect(fileSystemService.readFile).toHaveBeenCalledWith('/test/file-2.md');
  });

  it('prevents file switch when save fails', async () => {
    // Mock save failure
    fileSystemService.writeFile = jest.fn().mockResolvedValue({
      success: false,
      error: 'Permission denied'
    });

    const { getByTestId, getByText } = render(<App />);

    // Load and modify first file
    await act(async () => {
      fireEvent.click(getByTestId('file-1'));
    });

    const editor = getByTestId('editor');
    await act(async () => {
      fireEvent.change(editor, { target: { value: 'modified content' } });
    });

    // Try to switch files
    await act(async () => {
      fireEvent.click(getByTestId('file-2'));
    });

    // Verify error message shown
    expect(getByText(/Failed to save.*Permission denied/)).toBeInTheDocument();

    // Verify still on first file
    expect(editor.value).toBe('modified content');

    // Verify second file NOT loaded
    expect(fileSystemService.readFile).not.toHaveBeenCalledWith('/test/file-2.md');
  });
});
```

---

### Task 4: ~~Update File Tree Store~~ (SKIP THIS TASK)
**Decision**: Skip this task entirely. Handle everything in App.tsx for simplicity.

After reviewing the architecture, adding save coordination to the FileTreeStore would add unnecessary complexity. The simpler approach in Task 3, where we handle save-before-switch entirely in App.tsx, is better because:
- It keeps all save logic in one place
- Avoids adding business logic to the store
- The store should focus on tree state management only

**Note**: The `activePath !== fileContent.filePath` guard in the useEffect will prevent infinite loops when we revert the file selection after a failed save.

---

### Task 3.5: Add Window Blur Auto-Save (NEW)
**Files**: `src/renderer/App.tsx`
**Time Estimate**: 30 minutes
**Priority**: Do After Task 3

#### Requirements
1. Save current file when window loses focus
2. Don't prevent blur if save fails (just warn)
3. Only save if file is dirty

#### Implementation
```typescript
// Add to App.tsx after other effects
useEffect(() => {
  const handleWindowBlur = async () => {
    // Only save if there's a dirty file open
    if (fileContent.isDirty && fileContent.filePath) {
      const result = await fileContent.saveFileSync();
      if (!result.success) {
        // Don't prevent blur, but show warning
        // Use warning instead of error since we can't block the blur
        toast.showWarning(`Auto-save failed on window blur: ${result.error}`);
      }
    }
  };

  window.addEventListener('blur', handleWindowBlur);
  return () => window.removeEventListener('blur', handleWindowBlur);
}, [fileContent, toast]);
```

#### Testing
```typescript
// App.test.tsx
describe('Window blur auto-save', () => {
  it('saves dirty file when window loses focus', async () => {
    const { container } = render(<App />);

    // Load and modify a file
    await act(async () => {
      await loadTestFile();
      modifyContent('new content');
    });

    // Simulate window blur
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    // Verify save was called
    expect(fileSystemService.writeFile).toHaveBeenCalledWith(
      '/test/file.md',
      'new content'
    );
  });

  it('shows warning when blur save fails', async () => {
    fileSystemService.writeFile = jest.fn().mockResolvedValue({
      success: false,
      error: 'Permission denied'
    });

    const { container } = render(<App />);

    // Load and modify a file
    await act(async () => {
      await loadTestFile();
      modifyContent('new content');
    });

    // Simulate window blur
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    // Should show warning toast (not error)
    expect(screen.getByText(/Auto-save failed on window blur.*Permission denied/)).toBeInTheDocument();
    expect(screen.getByText(/Auto-save failed/)).toHaveClass('alert-warning');
  });

  it('does not save on blur if file is not dirty', async () => {
    const mockWrite = jest.fn();
    fileSystemService.writeFile = mockWrite;

    const { container } = render(<App />);

    // Load file but don't modify
    await act(async () => {
      await loadTestFile();
    });

    // Simulate window blur
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
    });

    // Should NOT have called writeFile
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
```

#### Manual Testing
1. Open a file and make changes
2. Switch to another application (Cmd+Tab or Alt+Tab)
3. Verify file saves automatically
4. Test with save failure (read-only file) - verify warning appears

---

### Task 5: Write Comprehensive Tests
**Files**: Create new test files
**Time Estimate**: 2 hours
**Priority**: Do Throughout (TDD approach)

#### Test Files to Create

##### 1. `src/renderer/hooks/useFileContent.test.ts`
```typescript
import { renderHook, act } from '@testing-library/react';
import { useFileContent } from './useFileContent';
import { fileSystemService } from '../services/fileSystemService';

// Mock the service
jest.mock('../services/fileSystemService');

describe('useFileContent - saveFileSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('saves immediately without debounce', async () => {
    const mockWrite = jest.fn().mockResolvedValue({ success: true });
    fileSystemService.writeFile = mockWrite;
    fileSystemService.readFile = jest.fn().mockResolvedValue({
      content: 'initial content',
      metadata: { size: 15, modified: new Date() }
    });

    const { result } = renderHook(() => useFileContent());

    // Load file
    await act(async () => {
      await result.current.loadFile('/test.md');
    });

    // Update content
    act(() => {
      result.current.updateContent('modified content');
    });

    // Save synchronously
    const saveResult = await act(async () => {
      return await result.current.saveFileSync();
    });

    expect(saveResult.success).toBe(true);
    expect(mockWrite).toHaveBeenCalledWith('/test.md', 'modified content');
    expect(result.current.isDirty).toBe(false);
  });

  it('returns detailed error information on failure', async () => {
    fileSystemService.writeFile = jest.fn().mockResolvedValue({
      success: false,
      error: 'Disk full'
    });
    fileSystemService.readFile = jest.fn().mockResolvedValue({
      content: 'content',
      metadata: { size: 7, modified: new Date() }
    });

    const { result } = renderHook(() => useFileContent());

    await act(async () => {
      await result.current.loadFile('/test.md');
    });

    act(() => {
      result.current.updateContent('new');
    });

    const saveResult = await act(async () => {
      return await result.current.saveFileSync();
    });

    expect(saveResult).toEqual({
      success: false,
      error: 'Disk full',
      filePath: '/test.md'
    });
    expect(result.current.isDirty).toBe(true); // Still dirty
  });

  it('does not save if content is not dirty', async () => {
    const mockWrite = jest.fn();
    fileSystemService.writeFile = mockWrite;
    fileSystemService.readFile = jest.fn().mockResolvedValue({
      content: 'content',
      metadata: { size: 7, modified: new Date() }
    });

    const { result } = renderHook(() => useFileContent());

    await act(async () => {
      await result.current.loadFile('/test.md');
    });

    // Don't modify content
    const saveResult = await act(async () => {
      return await result.current.saveFileSync();
    });

    expect(saveResult.success).toBe(true);
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('cancels pending auto-save timer when saving synchronously', async () => {
    jest.useFakeTimers();

    const mockWrite = jest.fn().mockResolvedValue({ success: true });
    fileSystemService.writeFile = mockWrite;
    fileSystemService.readFile = jest.fn().mockResolvedValue({
      content: 'content',
      metadata: { size: 7, modified: new Date() }
    });

    const { result } = renderHook(() => useFileContent({
      enableAutoSave: true,
      autoSaveDelay: 1000
    }));

    await act(async () => {
      await result.current.loadFile('/test.md');
    });

    // Trigger auto-save timer
    act(() => {
      result.current.updateContent('modified');
    });

    // Advance time partially
    jest.advanceTimersByTime(500);

    // Save synchronously
    await act(async () => {
      await result.current.saveFileSync();
    });

    // Advance past original auto-save time
    jest.advanceTimersByTime(1000);

    // Should only have been called once (by saveFileSync)
    expect(mockWrite).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
```

##### 2. `src/renderer/tests/App.autosave.test.tsx`
```typescript
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from '../App';
import { fileSystemService } from '../services/fileSystemService';

jest.mock('../services/fileSystemService');

describe('App - Simplified Auto-save', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    fileSystemService.readDirectory = jest.fn().mockResolvedValue({
      success: true,
      nodes: [
        {
          name: 'file1.md',
          path: '/test/file1.md',
          type: 'file',
          children: null,
          isExpanded: false
        },
        {
          name: 'file2.md',
          path: '/test/file2.md',
          type: 'file',
          children: null,
          isExpanded: false
        }
      ]
    });

    fileSystemService.readFile = jest.fn().mockImplementation((path) => {
      return Promise.resolve({
        content: `Content of ${path}`,
        metadata: { size: 100, modified: new Date() }
      });
    });

    fileSystemService.writeFile = jest.fn().mockResolvedValue({ success: true });
    fileSystemService.watchDirectory = jest.fn().mockResolvedValue({ success: true });
    fileSystemService.unwatchDirectory = jest.fn().mockResolvedValue({ success: true });
  });

  it('saves current file when switching to another file', async () => {
    const { container } = render(<App />);

    // Open a directory first
    await act(async () => {
      await fileSystemService.openDirectory();
    });

    // Click first file
    const file1 = await screen.findByText('file1.md');
    await act(async () => {
      fireEvent.click(file1);
    });

    // Wait for file to load
    await waitFor(() => {
      const editor = container.querySelector('[contenteditable]');
      expect(editor).toBeInTheDocument();
    });

    // Modify content
    const editor = container.querySelector('[contenteditable]');
    await act(async () => {
      fireEvent.input(editor, {
        target: { textContent: 'Modified content for file1' }
      });
    });

    // Click second file
    const file2 = await screen.findByText('file2.md');
    await act(async () => {
      fireEvent.click(file2);
    });

    // Verify file1 was saved
    await waitFor(() => {
      expect(fileSystemService.writeFile).toHaveBeenCalledWith(
        '/test/file1.md',
        expect.stringContaining('Modified content')
      );
    });

    // Verify file2 was loaded
    expect(fileSystemService.readFile).toHaveBeenCalledWith('/test/file2.md');
  });

  it('shows error and prevents switch when save fails', async () => {
    // Setup save to fail
    fileSystemService.writeFile = jest.fn().mockResolvedValue({
      success: false,
      error: 'Permission denied'
    });

    const { container } = render(<App />);

    // Open directory and first file
    await act(async () => {
      await fileSystemService.openDirectory();
    });

    const file1 = await screen.findByText('file1.md');
    await act(async () => {
      fireEvent.click(file1);
    });

    await waitFor(() => {
      const editor = container.querySelector('[contenteditable]');
      expect(editor).toBeInTheDocument();
    });

    // Modify content
    const editor = container.querySelector('[contenteditable]');
    await act(async () => {
      fireEvent.input(editor, {
        target: { textContent: 'Modified content' }
      });
    });

    // Try to switch files
    const file2 = await screen.findByText('file2.md');
    await act(async () => {
      fireEvent.click(file2);
    });

    // Should show error toast
    await waitFor(() => {
      expect(screen.getByText(/Failed to save.*Permission denied/)).toBeInTheDocument();
    });

    // Should still be showing file1 content
    expect(editor.textContent).toContain('Modified content');

    // Should NOT have loaded file2
    expect(fileSystemService.readFile).not.toHaveBeenCalledWith('/test/file2.md');
  });

  it('does not save when switching if file is not dirty', async () => {
    const { container } = render(<App />);

    await act(async () => {
      await fileSystemService.openDirectory();
    });

    const file1 = await screen.findByText('file1.md');
    await act(async () => {
      fireEvent.click(file1);
    });

    await waitFor(() => {
      const editor = container.querySelector('[contenteditable]');
      expect(editor).toBeInTheDocument();
    });

    // Don't modify content

    // Switch to file2
    const file2 = await screen.findByText('file2.md');
    await act(async () => {
      fireEvent.click(file2);
    });

    // Should NOT have called writeFile
    expect(fileSystemService.writeFile).not.toHaveBeenCalled();

    // Should have loaded file2
    expect(fileSystemService.readFile).toHaveBeenCalledWith('/test/file2.md');
  });

  it('handles external file changes correctly', async () => {
    const { container } = render(<App />);

    let fileChangeCallback: ((event: any) => void) | null = null;
    window.electronAPI = {
      fileSystem: {
        onFileChange: (cb: (event: any) => void) => {
          fileChangeCallback = cb;
        },
        removeFileChangeListener: jest.fn()
      }
    };

    await act(async () => {
      await fileSystemService.openDirectory();
    });

    const file1 = await screen.findByText('file1.md');
    await act(async () => {
      fireEvent.click(file1);
    });

    // Simulate external file change
    await act(async () => {
      fileChangeCallback?.({
        path: '/test/file1.md',
        type: 'change'
      });
    });

    // Should reload the file
    await waitFor(() => {
      expect(fileSystemService.readFile).toHaveBeenCalledWith('/test/file1.md');
    });

    // Should show info toast
    expect(screen.getByText(/File reloaded due to external changes/)).toBeInTheDocument();
  });

  it('warns about conflicts when external changes occur with dirty file', async () => {
    const { container } = render(<App />);

    let fileChangeCallback: ((event: any) => void) | null = null;
    window.electronAPI = {
      fileSystem: {
        onFileChange: (cb: (event: any) => void) => {
          fileChangeCallback = cb;
        },
        removeFileChangeListener: jest.fn()
      }
    };

    await act(async () => {
      await fileSystemService.openDirectory();
    });

    const file1 = await screen.findByText('file1.md');
    await act(async () => {
      fireEvent.click(file1);
    });

    await waitFor(() => {
      const editor = container.querySelector('[contenteditable]');
      expect(editor).toBeInTheDocument();
    });

    // Modify content
    const editor = container.querySelector('[contenteditable]');
    await act(async () => {
      fireEvent.input(editor, {
        target: { textContent: 'My changes' }
      });
    });

    // Simulate external change
    await act(async () => {
      fileChangeCallback?.({
        path: '/test/file1.md',
        type: 'change'
      });
    });

    // Should show warning
    await waitFor(() => {
      expect(screen.getByText(/File was modified externally.*conflict/)).toBeInTheDocument();
    });

    // Should NOT reload the file (preserve user's changes)
    expect(fileSystemService.readFile).toHaveBeenCalledTimes(1); // Only initial load
  });
});
```

---

### Task 6: Update Documentation
**Files**: `README.md`, `CLAUDE.md`
**Time Estimate**: 30 minutes
**Priority**: Do Last

#### Changes Required
1. Remove mentions of multi-file editing cache
2. Document new auto-save behavior
3. Update architecture section

#### README.md Updates
```markdown
## Auto-Save Behavior

Tapestry automatically saves your work to prevent data loss:

- **Auto-save timer**: Changes are automatically saved after 1 second of inactivity
- **Save on switch**: When switching between files, unsaved changes are saved immediately
- **Error handling**: If auto-save fails, you'll see a clear error message and the file switch is prevented
- **Manual save**: Press Cmd/Ctrl+S to save immediately

### Data Safety

Your data safety is our top priority:
- If a file cannot be saved when switching, you'll remain on the current file
- Clear error messages explain why saves failed (permissions, disk space, etc.)
- External file changes are detected and you're warned about conflicts
```

#### CLAUDE.md Updates
```markdown
## Auto-Save Implementation

The auto-save system in Tapestry is designed for simplicity and data safety:

### Key Components

1. **useFileContent Hook** (`src/renderer/hooks/useFileContent.ts`)
   - Manages file content state and auto-save timers
   - Provides `saveFileSync()` for immediate saves when switching files
   - Auto-saves after 1 second of inactivity

2. **App Component** (`src/renderer/App.tsx`)
   - Orchestrates save-before-switch behavior
   - Handles file watcher events
   - Shows appropriate toast notifications

### Behavior

- When switching files, if the current file is dirty:
  1. Show "Saving..." toast
  2. Call `saveFileSync()`
  3. If save succeeds, load new file
  4. If save fails, show error and stay on current file

- No caching or complex state management
- Each file switch reads fresh from disk
- Only the active file has in-memory state
```

---

## Testing Strategy

### Existing Test Updates
**IMPORTANT**: Before making changes, run the existing test suite to establish a baseline.

1. **Run existing tests first**: `bun test` - document any failures
2. **Update breaking tests**: Tests that expect cache behavior will need updates
3. **Delete obsolete tests**: Remove `src/renderer/tests/App.cache.test.tsx` entirely
4. **Add new tests**: For simplified auto-save behavior

### Unit Tests (TDD Approach)
1. Write test first for each new method
2. Implement minimum code to pass
3. Refactor for clarity

### Integration Tests
1. Test full save-before-switch flow
2. Test error scenarios (permission denied, disk full)
3. Test file watcher interactions
4. Test window blur auto-save

### Test Files to Update/Delete
- **DELETE**: `src/renderer/tests/App.cache.test.tsx` - entire file tests removed cache
- **UPDATE**: Any test that mocks or expects `fileContentCacheRef`
- **ADD**: Tests for `saveFileSync` method
- **ADD**: Tests for window blur handler

### Manual Testing Checklist
- [ ] Open app with multiple markdown files
- [ ] Edit file1, switch to file2 - verify file1 saves
- [ ] Edit file1, switch to file2 with save error - verify stays on file1
- [ ] Edit file1, wait 1 second - verify auto-saves
- [ ] Edit file1, switch to another app (Cmd+Tab) - verify saves on blur
- [ ] Edit file1, close app - verify warning appears
- [ ] External edit to clean file - verify reloads
- [ ] External edit to dirty file - verify warning appears
- [ ] Rapid file switching - verify no race conditions
- [ ] Large file (>1MB) - verify performance acceptable

## Implementation Order

### Phase 1: Foundation (Day 1)
1. ✅ Create warning toast variant (30 min)
2. ✅ Add `saveFileSync` to useFileContent with tests (1 hr)
3. ✅ Write integration tests for expected behavior (1 hr)

**Commit**: "feat: add synchronous save method and warning toasts"

### Phase 2: Remove Cache (Day 1-2)
1. ✅ Remove cache interfaces and refs from App.tsx (30 min)
2. ✅ Simplify file loading effect (1 hr)
3. ✅ Implement save-before-switch logic (1 hr)
4. ✅ Add window blur auto-save handler (30 min)
5. ✅ Run tests, fix issues (30 min)

**Commit**: "refactor: remove file content cache system"
**Commit**: "feat: add auto-save on window blur"

### Phase 3: Polish (Day 2)
1. ✅ Simplify file watcher logic (30 min)
2. ✅ Update beforeunload handler (15 min)
3. ✅ Delete App.cache.test.tsx (5 min)
4. ✅ Add remaining integration tests (1 hr)
5. ✅ Update documentation (30 min)

**Commit**: "refactor: simplify auto-save and file watcher logic"
**Commit**: "test: remove obsolete cache tests"
**Commit**: "docs: update auto-save behavior documentation"

## Rollback Plan

If issues arise in production:

1. **Immediate**: Revert to previous git commit
2. **Hotfix**: Disable auto-save temporarily via feature flag
3. **Data Recovery**: File system writes are atomic, partial writes unlikely

## Success Criteria

1. **No data loss**: All edits are saved before switching files
2. **Clear errors**: Users understand why saves fail
3. **Performance**: File switches complete in <500ms for typical files
4. **Code reduction**: Remove ~200 lines of cache complexity
5. **Test coverage**: >90% coverage for save logic

## Code Metrics

### Before
- App.tsx: 647 lines
- Complex cache logic: ~200 lines
- Test coverage: 75%

### After (Expected)
- App.tsx: ~450 lines
- Simple save logic: ~50 lines
- Test coverage: >90%

## Common Pitfalls to Avoid

1. **Race Conditions**: Always check if save is in progress before file operations
2. **Stale Closures**: Use refs for values that change frequently
3. **Error Swallowing**: Always surface save errors to user
4. **Memory Leaks**: Clean up timers and listeners
5. **Lost Focus**: Save when window loses focus, not just file switch

## Questions for Product Team

1. Should we save when the app loses focus (switches to another app)?
2. What's the maximum acceptable delay for auto-save? (currently 1 second)
3. Should we add a "Save All" option for future multi-tab support?
4. How should we handle network drives with high latency?

## Engineering Notes

### Why Remove the Cache?

The original cache system was designed to support multi-tab editing in the future. However:
- It adds 200+ lines of complex state management
- It creates confusing edge cases (LRU eviction, cache invalidation)
- Users don't understand which files have unsaved changes
- The benefit (faster file switching) is negligible with SSDs

### Alternative Considered

We considered keeping a simple Map of dirty files but decided against it because:
- It still requires cache invalidation logic
- File watcher integration becomes complex
- Save-before-switch is simpler and more predictable

### Performance Impact

- File switch time increases by ~50ms (cost of save)
- This is acceptable for typical markdown files (<100KB)
- Large files (>1MB) may see 200ms increase
- Users prefer data safety over marginal speed increase

### File Watcher During Saves

When we save a file, we temporarily ignore file watcher events by setting `isSavingRef.current = true`. This is intentional and correct because:

1. **Prevents false positives**: Our own writes would trigger "external modification" warnings
2. **Brief window**: The save operation only takes ~50-200ms
3. **Real changes detected**: Any actual external changes during this window would create conflicts anyway
4. **Next cycle catches changes**: After save completes, the file watcher resumes normal operation

The simplified approach (dropping events during save) is better than queueing them because:
- File watcher will fire again after save for any real external changes
- The directory reload will catch any structural changes
- Avoids complex queue management for a rare edge case

## Appendix: Removed Code

The following code blocks will be removed from App.tsx:

```typescript
// REMOVE: Cache interface (lines 35-42)
interface FileContentCache {
  content: string;
  originalContent: string;
  rawDiskContent: string;
  isDirty: boolean;
  timestamp: number;
}

// REMOVE: Cache refs (lines 64, 67)
const fileContentCacheRef = useRef<Map<string, FileContentCache>>(new Map());
const rawDiskContentRef = useRef<Map<string, string>>(new Map());

// REMOVE: Complex save lifecycle (lines 93-120)
// REMOVE: Cache save/restore logic (lines 162-275)
// REMOVE: Cache cleanup effects (lines 301-334)
```

---

End of Implementation Plan