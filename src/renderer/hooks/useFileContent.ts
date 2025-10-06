/**
 * React hook for managing file content with auto-save
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fileSystemService } from '../services/fileSystemService';
import type { FileContent } from '../../shared/types/fileSystem';

interface SaveResult {
  success: boolean;
  error?: string;
  filePath?: string;
}

interface UseFileContentState {
  filePath: string | null;
  content: string;
  originalContent: string;
  isDirty: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  metadata: FileContent['metadata'] | null;
}

interface UseFileContentOptions {
  autoSaveDelay?: number; // Delay in milliseconds before auto-saving (default: 300ms)
  enableAutoSave?: boolean; // Enable/disable auto-save (default: true)
  saveTimeout?: number; // Timeout in milliseconds for save operations (default: 30000ms / 30s)
  onBeforeSave?: () => void; // Called before save starts (both auto and manual)
  onAfterSave?: (success: boolean) => void; // Called after save completes (both auto and manual)
}

interface UseFileContentReturn extends UseFileContentState {
  // File operations
  loadFile: (filePath: string) => Promise<void>;
  saveFile: (pathOverride?: string) => Promise<boolean>;
  saveFileSync: () => Promise<SaveResult>;
  updateContent: (newContent: string) => void;
  updateOriginalContent: (content: string) => void;
  closeFile: () => void;

  // State management
  clearError: () => void;
  clearAutoSaveTimer: () => void;
}

/**
 * Hook for managing file content with auto-save
 */
export function useFileContent(
  options: UseFileContentOptions = {}
): UseFileContentReturn {
  const {
    autoSaveDelay = 300,
    enableAutoSave = true,
    saveTimeout = 30000, // 30 seconds default
    onBeforeSave,
    onAfterSave
  } = options;

  const [state, setState] = useState<UseFileContentState>({
    filePath: null,
    content: '',
    originalContent: '',
    isDirty: false,
    loading: false,
    saving: false,
    error: null,
    metadata: null,
  });

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track current file path to avoid stale closure issues in auto-save
  const currentFilePathRef = useRef<string | null>(state.filePath);
  currentFilePathRef.current = state.filePath;

  /**
   * Clear auto-save timer
   */
  const clearAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  /**
   * Load file content
   */
  const loadFile = useCallback(async (filePath: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const fileContent = await fileSystemService.readFile(filePath);

      setState({
        filePath,
        content: fileContent.content,
        originalContent: fileContent.content,
        isDirty: false,
        loading: false,
        saving: false,
        error: null,
        metadata: fileContent.metadata,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load file';
      const errorWithContext = `Failed to load ${filePath}: ${errorMessage}`;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorWithContext,
      }));
    }
  }, []);

  /**
   * Save file content with timeout protection
   */
  const saveFile = useCallback(async (pathOverride?: string): Promise<boolean> => {
    const filePath = pathOverride || state.filePath;

    if (!filePath) {
      setState((prev) => ({
        ...prev,
        error: 'No file is currently open',
      }));
      onAfterSave?.(false);
      return false;
    }

    if (!state.isDirty) {
      // No changes to save
      onAfterSave?.(true);
      return true;
    }

    // Call before save callback
    onBeforeSave?.();

    setState((prev) => ({ ...prev, saving: true, error: null }));

    // Race the save operation against a timeout to prevent eternal hangs
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Save operation timed out after ${saveTimeout}ms`));
        }, saveTimeout);
      });

      const result = await Promise.race([
        fileSystemService.writeFile(filePath, state.content),
        timeoutPromise
      ]);

      if (result.success) {
        setState((prev) => ({
          ...prev,
          originalContent: prev.content,
          isDirty: false,
          saving: false,
        }));
        onAfterSave?.(true);
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: result.error || 'Failed to save file',
        }));
        onAfterSave?.(false);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      const errorWithContext = `Failed to save ${filePath}: ${errorMessage}`;
      setState((prev) => ({
        ...prev,
        saving: false,
        error: errorWithContext,
      }));
      onAfterSave?.(false);
      return false;
    } finally {
      // Guarantee timeout cleanup in all cases (success, failure, or timeout)
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, [state.filePath, state.content, state.isDirty, onBeforeSave, onAfterSave, saveTimeout]);

  /**
   * Save file immediately without debounce
   * Used when switching files to ensure data is persisted
   * Includes timeout to prevent eternal hangs on slow I/O or network drives
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

    // Race the save operation against a timeout
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Save operation timed out after ${saveTimeout}ms`));
        }, saveTimeout);
      });

      const result = await Promise.race([
        fileSystemService.writeFile(filePath, state.content),
        timeoutPromise
      ]);

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      const errorWithContext = `Failed to save ${filePath}: ${errorMessage}`;
      setState((prev) => ({
        ...prev,
        saving: false,
        error: errorWithContext,
      }));
      onAfterSave?.(false);
      return {
        success: false,
        error: errorMessage, // Return base error message for retry logic
        filePath
      };
    } finally {
      // Guarantee timeout cleanup in all cases (success, failure, or timeout)
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, [state.filePath, state.content, state.isDirty, clearAutoSaveTimer,
      onBeforeSave, onAfterSave, saveTimeout]);

  /**
   * Update file content with auto-save timer
   */
  const updateContent = useCallback(
    (newContent: string) => {
      setState((prev) => ({
        ...prev,
        content: newContent,
        isDirty: newContent !== prev.originalContent,
      }));

      // Clear existing auto-save timer
      clearAutoSaveTimer();

      // Set new auto-save timer if enabled
      if (enableAutoSave && currentFilePathRef.current) {
        // Capture the file path when setting the timer
        // This prevents saving to the wrong file if user switches files
        const capturedPath = currentFilePathRef.current;

        autoSaveTimerRef.current = setTimeout(() => {
          // Only save if still on the same file (prevents saving to wrong file)
          if (currentFilePathRef.current === capturedPath) {
            // Save with the current path - saveFile will read latest content from state
            saveFile(capturedPath).catch((error) => {
              console.error('[AutoSave] Failed for', capturedPath, ':', error);
              // Update state with error
              setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Auto-save failed'
              }));
              // Notify callbacks that auto-save failed
              onAfterSave?.(false);
            });
          } else {
            // Log when auto-save is skipped due to file switch
            console.log('[AutoSave] Skipped auto-save for', capturedPath, '- user switched to', currentFilePathRef.current);
          }
        }, autoSaveDelay);
      }
    },
    [enableAutoSave, autoSaveDelay, clearAutoSaveTimer, saveFile, onAfterSave]
  );

  /**
   * Close current file
   */
  const closeFile = useCallback(() => {
    clearAutoSaveTimer();

    setState({
      filePath: null,
      content: '',
      originalContent: '',
      isDirty: false,
      loading: false,
      saving: false,
      error: null,
      metadata: null,
    });
  }, [clearAutoSaveTimer]);

  /**
   * Update original content (for fixing dirty state after round-trip conversion)
   */
  const updateOriginalContent = useCallback((content: string) => {
    setState((prev) => ({
      ...prev,
      originalContent: content,
      isDirty: prev.content !== content,
    }));
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Clean up auto-save timer on unmount
   */
  useEffect(() => {
    return () => {
      clearAutoSaveTimer();
    };
  }, [clearAutoSaveTimer]);

  return {
    ...state,
    loadFile,
    saveFile,
    saveFileSync,
    updateContent,
    updateOriginalContent,
    closeFile,
    clearError,
    clearAutoSaveTimer,
  };
}
