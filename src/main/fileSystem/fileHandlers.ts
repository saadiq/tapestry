/**
 * File system operations handlers for the main process
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  FileContent,
  FileOperationResult,
  FileMetadata,
  FileSystemErrorCode,
} from '../../shared/types/fileSystem';

/**
 * Allowed markdown file extensions
 */
const ALLOWED_EXTENSIONS = ['.md', '.markdown'];

/**
 * Check if a file is a markdown file
 */
export function isMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Get file metadata
 */
async function getFileMetadata(filePath: string): Promise<FileMetadata> {
  const stats = await fs.stat(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    modified: stats.mtime,
    isDirectory: stats.isDirectory(),
    extension: path.extname(filePath),
  };
}

/**
 * Create a file system error result
 */
function createErrorResult(
  code: FileSystemErrorCode,
  message: string,
  filePath?: string
): FileOperationResult {
  return {
    success: false,
    path: filePath,
    error: `${code}: ${message}`,
  };
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<FileContent> {
  try {
    // Check if file exists
    await fs.access(filePath);

    // Validate file type
    if (!isMarkdownFile(filePath)) {
      throw new Error('INVALID_FILE_TYPE: Only markdown files are supported');
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = await getFileMetadata(filePath);

    return {
      path: filePath,
      content,
      metadata,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('FILE_NOT_FOUND: File does not exist');
    }
    if (error.code === 'EACCES') {
      throw new Error('PERMISSION_DENIED: Permission denied');
    }
    throw error;
  }
}

/**
 * Write file content
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<FileOperationResult> {
  try {
    // Validate file type
    if (!isMarkdownFile(filePath)) {
      return createErrorResult(
        'INVALID_FILE_TYPE' as FileSystemErrorCode,
        'Only markdown files are supported',
        filePath
      );
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      success: true,
      path: filePath,
    };
  } catch (error: any) {
    if (error.code === 'EACCES') {
      return createErrorResult(
        'PERMISSION_DENIED' as FileSystemErrorCode,
        'Permission denied',
        filePath
      );
    }
    return createErrorResult(
      'UNKNOWN_ERROR' as FileSystemErrorCode,
      error.message,
      filePath
    );
  }
}

/**
 * Create a new file
 */
export async function createFile(
  filePath: string,
  content = ''
): Promise<FileOperationResult> {
  try {
    // Validate file type
    if (!isMarkdownFile(filePath)) {
      return createErrorResult(
        'INVALID_FILE_TYPE' as FileSystemErrorCode,
        'Only markdown files are supported',
        filePath
      );
    }

    // Check if file already exists
    try {
      await fs.access(filePath);
      return createErrorResult(
        'FILE_ALREADY_EXISTS' as FileSystemErrorCode,
        'File already exists',
        filePath
      );
    } catch (error: any) {
      // File doesn't exist, continue with creation
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Create file
    await fs.writeFile(filePath, content, 'utf-8');

    return {
      success: true,
      path: filePath,
    };
  } catch (error: any) {
    if (error.code === 'EACCES') {
      return createErrorResult(
        'PERMISSION_DENIED' as FileSystemErrorCode,
        'Permission denied',
        filePath
      );
    }
    return createErrorResult(
      'UNKNOWN_ERROR' as FileSystemErrorCode,
      error.message,
      filePath
    );
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<FileOperationResult> {
  try {
    // Check if file exists
    await fs.access(filePath);

    // Delete file
    await fs.unlink(filePath);

    return {
      success: true,
      path: filePath,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return createErrorResult(
        'FILE_NOT_FOUND' as FileSystemErrorCode,
        'File does not exist',
        filePath
      );
    }
    if (error.code === 'EACCES') {
      return createErrorResult(
        'PERMISSION_DENIED' as FileSystemErrorCode,
        'Permission denied',
        filePath
      );
    }
    return createErrorResult(
      'UNKNOWN_ERROR' as FileSystemErrorCode,
      error.message,
      filePath
    );
  }
}

/**
 * Rename or move a file
 */
export async function renameFile(
  oldPath: string,
  newPath: string
): Promise<FileOperationResult> {
  try {
    // Check if source file exists
    await fs.access(oldPath);

    // Validate new file type
    if (!isMarkdownFile(newPath)) {
      return createErrorResult(
        'INVALID_FILE_TYPE' as FileSystemErrorCode,
        'Only markdown files are supported',
        newPath
      );
    }

    // Check if destination already exists
    try {
      await fs.access(newPath);
      return createErrorResult(
        'FILE_ALREADY_EXISTS' as FileSystemErrorCode,
        'Destination file already exists',
        newPath
      );
    } catch (error: any) {
      // Destination doesn't exist, continue
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Ensure destination directory exists
    const dir = path.dirname(newPath);
    await fs.mkdir(dir, { recursive: true });

    // Rename file
    await fs.rename(oldPath, newPath);

    return {
      success: true,
      path: newPath,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return createErrorResult(
        'FILE_NOT_FOUND' as FileSystemErrorCode,
        'Source file does not exist',
        oldPath
      );
    }
    if (error.code === 'EACCES') {
      return createErrorResult(
        'PERMISSION_DENIED' as FileSystemErrorCode,
        'Permission denied',
        oldPath
      );
    }
    return createErrorResult(
      'UNKNOWN_ERROR' as FileSystemErrorCode,
      error.message,
      oldPath
    );
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
