/**
 * File system watcher for monitoring directory changes
 */

import { FSWatcher, watch } from 'fs';
import { join } from 'path';
import { BrowserWindow } from 'electron';
import type {
  FileWatcherEvent,
  FileWatcherEventType,
  FileOperationResult,
} from '../../shared/types/fileSystem';
import { isMarkdownFile } from './fileHandlers';
import { TIMING_CONFIG } from '../../shared/config/timing';

/**
 * Normalize a file path for cross-platform consistency
 * Converts backslashes to forward slashes (Windows -> Unix-style)
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '');
}

/**
 * Active watchers map (directory path -> FSWatcher)
 */
const watchers = new Map<string, FSWatcher>();

/**
 * Debounce timers map (directory path -> NodeJS.Timeout)
 * Used to debounce file change events since fs.watch fires multiple events per file change
 */
const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * Watch a directory for changes
 */
export function watchDirectory(
  dirPath: string,
  mainWindow: BrowserWindow
): FileOperationResult {
  try {
    // Check if already watching this directory
    if (watchers.has(dirPath)) {
      return {
        success: true,
        path: dirPath,
      };
    }

    // Create watcher
    const watcher = watch(
      dirPath,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;

        // Only watch markdown files
        if (!isMarkdownFile(filename)) return;

        // Debounce file change events - fs.watch fires multiple events for single file change
        const timerId = debounceTimers.get(dirPath);
        if (timerId) {
          clearTimeout(timerId);
        }

        // Use centralized debounce timing to group multiple rapid events into one
        debounceTimers.set(
          dirPath,
          setTimeout(() => {
            debounceTimers.delete(dirPath);

            // Map fs.watch event types to our event types
            let type: FileWatcherEventType;
            if (eventType === 'rename') {
              // 'rename' can mean both created and deleted
              // We'll treat it as 'modified' for simplicity
              type = 'modified';
            } else {
              type = 'modified';
            }

            // Construct absolute path and normalize for cross-platform comparison in renderer
            const absolutePath = normalizePath(join(dirPath, filename));

            const event: FileWatcherEvent = {
              type,
              path: absolutePath,
              timestamp: new Date(),
            };

            // Send event to renderer
            mainWindow.webContents.send('file-watcher-event', event);
          }, TIMING_CONFIG.FILE_WATCHER_DEBOUNCE_MS)
        );
      }
    );

    // Store watcher
    watchers.set(dirPath, watcher);

    return {
      success: true,
      path: dirPath,
    };
  } catch (error: any) {
    return {
      success: false,
      path: dirPath,
      error: `UNKNOWN_ERROR: ${error.message}`,
    };
  }
}

/**
 * Stop watching a directory
 */
export function unwatchDirectory(dirPath: string): FileOperationResult {
  try {
    const watcher = watchers.get(dirPath);

    if (!watcher) {
      return {
        success: false,
        path: dirPath,
        error: 'WATCHER_NOT_FOUND: No watcher found for this directory',
      };
    }

    // Clear any pending debounce timer
    const timerId = debounceTimers.get(dirPath);
    if (timerId) {
      clearTimeout(timerId);
      debounceTimers.delete(dirPath);
    }

    // Close watcher
    watcher.close();
    watchers.delete(dirPath);

    return {
      success: true,
      path: dirPath,
    };
  } catch (error: any) {
    return {
      success: false,
      path: dirPath,
      error: `UNKNOWN_ERROR: ${error.message}`,
    };
  }
}

/**
 * Stop all watchers
 */
export function unwatchAll(): void {
  // Clear all debounce timers
  for (const [dirPath, timerId] of debounceTimers.entries()) {
    clearTimeout(timerId);
    debounceTimers.delete(dirPath);
  }

  // Close all watchers
  for (const [dirPath, watcher] of watchers.entries()) {
    watcher.close();
    watchers.delete(dirPath);
  }
}
