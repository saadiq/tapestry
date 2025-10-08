/**
 * File name validation utilities
 * Centralized validation logic for filesystem-unsafe characters
 */

/**
 * Regex pattern for filesystem-unsafe characters
 * Rejects: / \ : * ? " < > | and null character
 * These characters can cause filesystem errors or security issues
 */
export const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|\x00]/;

/**
 * Validates a filename for filesystem safety
 *
 * @param filename - The filename to validate (without path)
 * @returns true if filename is safe, false otherwise
 */
export function isValidFilename(filename: string): boolean {
  // Check for empty or whitespace-only names
  if (!filename || !filename.trim()) {
    return false;
  }

  // Check for unsafe characters
  if (UNSAFE_FILENAME_CHARS.test(filename)) {
    return false;
  }

  // Check for path traversal attempts
  if (filename === '..' || filename === '.') {
    return false;
  }

  return true;
}

/**
 * Returns a user-friendly error message for invalid filenames
 *
 * @param filename - The invalid filename
 * @returns Error message describing the validation failure
 */
export function getFilenameValidationError(filename: string): string {
  if (!filename || !filename.trim()) {
    return 'Filename cannot be empty';
  }

  if (UNSAFE_FILENAME_CHARS.test(filename)) {
    return 'Filename contains invalid characters: / \\ : * ? " < > |';
  }

  if (filename === '..' || filename === '.') {
    return 'Filename cannot be "." or ".."';
  }

  return 'Invalid filename';
}
