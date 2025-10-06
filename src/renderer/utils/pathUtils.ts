/**
 * Path utility functions for cross-platform path handling
 */

/**
 * Normalize a file path for consistent comparison and display
 * - Converts backslashes to forward slashes (Windows -> Unix-style)
 * - Removes trailing slashes
 *
 * @param path - The file path to normalize
 * @returns Normalized path
 * @throws {Error} If path is null, undefined, or empty
 *
 * @example
 * normalizePath('C:\\Users\\file.md') // 'C:/Users/file.md'
 * normalizePath('/path/to/dir/') // '/path/to/dir'
 */
export function normalizePath(path: string): string {
  if (path == null || path === '') {
    throw new Error('Path cannot be null, undefined, or empty');
  }
  return path.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Get the directory path from a file path
 * Handles edge cases like Windows drive letters
 *
 * @param filePath - The file path
 * @returns Directory path or null if invalid or root
 * @throws {Error} If filePath is null, undefined, or empty
 *
 * @example
 * getDirectoryPath('/path/to/file.md') // '/path/to'
 * getDirectoryPath('C:/Users/file.md') // 'C:/Users'
 * getDirectoryPath('C:/file.md') // 'C:/'
 * getDirectoryPath('/file.md') // null (already at root)
 */
export function getDirectoryPath(filePath: string): string | null {
  if (filePath == null || filePath === '') {
    throw new Error('File path cannot be null, undefined, or empty');
  }

  const normalizedPath = normalizePath(filePath);
  const trimmedPath = normalizedPath.replace(/\/+$/, '');
  const lastSlashIndex = trimmedPath.lastIndexOf('/');

  if (lastSlashIndex <= 0) {
    // Either no slash found or slash at position 0 (root directory)
    console.warn(`Cannot extract directory from path: ${filePath} (already at root or invalid)`);
    return null;
  }

  let directoryPath = trimmedPath.slice(0, lastSlashIndex);

  // Handle Windows drive letters (e.g., 'C:' -> 'C:/')
  if (/^[A-Za-z]:$/.test(directoryPath)) {
    directoryPath = `${directoryPath}/`;
  }

  return directoryPath;
}

/**
 * Check if a child path is within a parent directory
 *
 * @param childPath - The path to check
 * @param parentPath - The parent directory path
 * @returns True if childPath is within parentPath
 * @throws {Error} If childPath or parentPath is null, undefined, or empty
 *
 * @example
 * isPathWithinDirectory('/parent/child/file.md', '/parent') // true
 * isPathWithinDirectory('/other/file.md', '/parent') // false
 */
export function isPathWithinDirectory(childPath: string, parentPath: string): boolean {
  if (childPath == null || childPath === '') {
    throw new Error('Child path cannot be null, undefined, or empty');
  }
  if (parentPath == null || parentPath === '') {
    throw new Error('Parent path cannot be null, undefined, or empty');
  }

  const normalizedChild = normalizePath(childPath);
  const normalizedParent = normalizePath(parentPath);

  return normalizedChild.startsWith(normalizedParent);
}
