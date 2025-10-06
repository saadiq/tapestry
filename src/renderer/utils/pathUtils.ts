/**
 * Path utility functions for cross-platform path handling
 */

/**
 * Normalize a file path for consistent comparison and display
 * - Converts backslashes to forward slashes (Windows -> Unix-style)
 * - Removes trailing slashes
 * - Returns empty string for invalid inputs instead of throwing
 *
 * @param path - The file path to normalize
 * @returns Normalized path, or empty string if invalid
 *
 * @example
 * normalizePath('C:\\Users\\file.md') // 'C:/Users/file.md'
 * normalizePath('/path/to/dir/') // '/path/to/dir'
 * normalizePath('') // ''
 * normalizePath(null) // ''
 */
export function normalizePath(path: string): string {
  if (path == null || path === '') {
    console.warn('normalizePath: received null, undefined, or empty path');
    return '';
  }
  return path.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Get the directory path from a file path
 * Handles edge cases like Windows drive letters
 * Returns null for invalid inputs instead of throwing
 *
 * @param filePath - The file path
 * @returns Directory path or null if invalid or root
 *
 * @example
 * getDirectoryPath('/path/to/file.md') // '/path/to'
 * getDirectoryPath('C:/Users/file.md') // 'C:/Users'
 * getDirectoryPath('C:/file.md') // 'C:/'
 * getDirectoryPath('/file.md') // null (already at root)
 * getDirectoryPath('') // null
 */
export function getDirectoryPath(filePath: string): string | null {
  if (filePath == null || filePath === '') {
    console.warn('getDirectoryPath: received null, undefined, or empty path');
    return null;
  }

  const normalizedPath = normalizePath(filePath);
  if (normalizedPath === '') {
    return null;
  }

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
 * Returns false for invalid inputs instead of throwing
 *
 * @param childPath - The path to check
 * @param parentPath - The parent directory path
 * @returns True if childPath is within parentPath, false if invalid
 *
 * @example
 * isPathWithinDirectory('/parent/child/file.md', '/parent') // true
 * isPathWithinDirectory('/other/file.md', '/parent') // false
 * isPathWithinDirectory('', '/parent') // false
 */
export function isPathWithinDirectory(childPath: string, parentPath: string): boolean {
  if (childPath == null || childPath === '') {
    console.warn('isPathWithinDirectory: received null, undefined, or empty child path');
    return false;
  }
  if (parentPath == null || parentPath === '') {
    console.warn('isPathWithinDirectory: received null, undefined, or empty parent path');
    return false;
  }

  const normalizedChild = normalizePath(childPath);
  const normalizedParent = normalizePath(parentPath);

  // If normalization returned empty strings, return false
  if (normalizedChild === '' || normalizedParent === '') {
    return false;
  }

  return normalizedChild.startsWith(normalizedParent);
}
