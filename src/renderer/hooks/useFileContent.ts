/**
 * React hook for managing file content with auto-save
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fileSystemService } from '../services/fileSystemService';
import type { FileContent } from '../../shared/types/fileSystem';

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
  onBeforeSave?: () => void; // Called before save starts (both auto and manual)
  onAfterSave?: (success: boolean) => void; // Called after save completes (both auto and manual)
}

interface UseFileContentReturn extends UseFileContentState {
  // File operations
  loadFile: (filePath: string) => Promise<void>;
  saveFile: () => Promise<boolean>;
  updateContent: (newContent: string) => void;
  updateOriginalContent: (content: string) => void;
  closeFile: () => void;

  // State management
  clearError: () => void;
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
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load file',
      }));
    }
  }, []);

  /**
   * Save file content
   */
  const saveFile = useCallback(async (): Promise<boolean> => {
    if (!state.filePath) {
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

    try {
      const result = await fileSystemService.writeFile(
        state.filePath,
        state.content
      );

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
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: error.message || 'Failed to save file',
      }));
      onAfterSave?.(false);
      return false;
    }
  }, [state.filePath, state.content, state.isDirty, onBeforeSave, onAfterSave]);

  /**
   * Update file content with cache-aware auto-save
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
      if (enableAutoSave && state.filePath) {
        // Capture the file path when setting the timer to validate before saving
        const capturedPath = state.filePath;
        autoSaveTimerRef.current = setTimeout(() => {
          // Only save if still on the same file (prevents saving cached content to wrong file)
          if (state.filePath === capturedPath) {
            saveFile();
          }
        }, autoSaveDelay);
      }
    },
    [enableAutoSave, autoSaveDelay, clearAutoSaveTimer, saveFile, state.filePath]
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
    updateContent,
    updateOriginalContent,
    closeFile,
    clearError,
  };
}
