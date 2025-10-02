/**
 * File system types shared between main and renderer processes
 */

/**
 * File metadata
 */
export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
  extension?: string;
}

/**
 * Directory entry (file or folder)
 */
export interface DirectoryEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  extension?: string;
  children?: DirectoryEntry[]; // For recursive directory reading
}

/**
 * File content response
 */
export interface FileContent {
  path: string;
  content: string;
  metadata: FileMetadata;
}

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Directory picker result
 */
export interface DirectoryPickerResult {
  success: boolean;
  path?: string;
  canceled: boolean;
  error?: string;
}

/**
 * File watcher event types
 */
export type FileWatcherEventType = 'created' | 'modified' | 'deleted';

/**
 * File watcher event
 */
export interface FileWatcherEvent {
  type: FileWatcherEventType;
  path: string;
  timestamp: Date;
}

/**
 * File system error codes
 */
export enum FileSystemErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * File system error
 */
export interface FileSystemError {
  code: FileSystemErrorCode;
  message: string;
  path?: string;
}
