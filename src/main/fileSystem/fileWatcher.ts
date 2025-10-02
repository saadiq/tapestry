/**
 * File system watcher for monitoring directory changes
 */

import { FSWatcher, watch } from 'fs';
import { BrowserWindow } from 'electron';
import type {
  FileWatcherEvent,
  FileWatcherEventType,
  FileOperationResult,
} from '../../shared/types/fileSystem';
import { isMarkdownFile } from './fileHandlers';

/**
 * Active watchers map (directory path -> FSWatcher)
 */
const watchers = new Map<string, FSWatcher>();

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

        // Map fs.watch event types to our event types
        let type: FileWatcherEventType;
        if (eventType === 'rename') {
          // 'rename' can mean both created and deleted
          // We'll treat it as 'modified' for simplicity
          type = 'modified';
        } else {
          type = 'modified';
        }

        const event: FileWatcherEvent = {
          type,
          path: filename,
          timestamp: new Date(),
        };

        // Send event to renderer
        mainWindow.webContents.send('file-watcher-event', event);
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
  for (const [dirPath, watcher] of watchers.entries()) {
    watcher.close();
    watchers.delete(dirPath);
  }
}
