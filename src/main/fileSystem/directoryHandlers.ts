/**
 * Directory operations handlers for the main process
 */

import { dialog } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import type {
  DirectoryPickerResult,
  DirectoryEntry,
  FileSystemErrorCode,
} from '../../shared/types/fileSystem';
import { isMarkdownFile } from './fileHandlers';

/**
 * Open directory picker dialog
 */
export async function openDirectory(): Promise<DirectoryPickerResult> {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select a directory',
    });

    if (result.canceled) {
      return {
        success: false,
        canceled: true,
      };
    }

    const dirPath = result.filePaths[0];
    return {
      success: true,
      path: dirPath,
      canceled: false,
    };
  } catch (error: any) {
    return {
      success: false,
      canceled: false,
      error: `UNKNOWN_ERROR: ${error.message}`,
    };
  }
}

/**
 * Read directory contents recursively
 */
export async function readDirectory(
  dirPath: string,
  recursive = false
): Promise<DirectoryEntry[]> {
  try {
    // Check if directory exists
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error('DIRECTORY_NOT_FOUND: Path is not a directory');
    }

    return await readDirectoryRecursive(dirPath, recursive);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('DIRECTORY_NOT_FOUND: Directory does not exist');
    }
    if (error.code === 'EACCES') {
      throw new Error('PERMISSION_DENIED: Permission denied');
    }
    throw error;
  }
}

/**
 * Helper function to recursively read directory contents
 */
async function readDirectoryRecursive(
  dirPath: string,
  recursive: boolean
): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    const isDirectory = item.isDirectory();

    // Skip hidden files and directories (starting with .)
    if (item.name.startsWith('.')) {
      continue;
    }

    // For files, only include markdown files
    if (!isDirectory && !isMarkdownFile(item.name)) {
      continue;
    }

    const entry: DirectoryEntry = {
      path: fullPath,
      name: item.name,
      isDirectory,
      extension: isDirectory ? undefined : path.extname(item.name),
    };

    // Recursively read subdirectories if requested
    if (isDirectory && recursive) {
      try {
        entry.children = await readDirectoryRecursive(fullPath, true);
      } catch (error) {
        // Skip directories that can't be read (permission issues, etc.)
        console.error(`Error reading directory ${fullPath}:`, error);
        entry.children = [];
      }
    }

    entries.push(entry);
  }

  // Sort: directories first, then files, both alphabetically
  return entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}
