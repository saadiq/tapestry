/**
 * Unit tests for file validation utilities
 */

import { describe, it, expect } from 'vitest';
import { isValidFilename, getFilenameValidationError, UNSAFE_FILENAME_CHARS } from './fileValidation';

describe('fileValidation', () => {
  describe('UNSAFE_FILENAME_CHARS', () => {
    it('should match forward slash', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file/name')).toBe(true);
    });

    it('should match backslash', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file\\name')).toBe(true);
    });

    it('should match colon', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file:name')).toBe(true);
    });

    it('should match asterisk', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file*name')).toBe(true);
    });

    it('should match question mark', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file?name')).toBe(true);
    });

    it('should match double quote', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file"name')).toBe(true);
    });

    it('should match less than', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file<name')).toBe(true);
    });

    it('should match greater than', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file>name')).toBe(true);
    });

    it('should match pipe', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file|name')).toBe(true);
    });

    it('should match null character', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file\x00name')).toBe(true);
    });

    it('should not match safe characters', () => {
      expect(UNSAFE_FILENAME_CHARS.test('file-name.md')).toBe(false);
      expect(UNSAFE_FILENAME_CHARS.test('file_name.md')).toBe(false);
      expect(UNSAFE_FILENAME_CHARS.test('file name.md')).toBe(false);
      expect(UNSAFE_FILENAME_CHARS.test('file.name.md')).toBe(false);
    });
  });

  describe('isValidFilename', () => {
    it('should accept valid filenames', () => {
      expect(isValidFilename('notes.md')).toBe(true);
      expect(isValidFilename('file-name.md')).toBe(true);
      expect(isValidFilename('file_name.md')).toBe(true);
      expect(isValidFilename('file name.md')).toBe(true);
      expect(isValidFilename('file.name.md')).toBe(true);
      expect(isValidFilename('123.md')).toBe(true);
      expect(isValidFilename('日本語.md')).toBe(true);
    });

    it('should reject empty filename', () => {
      expect(isValidFilename('')).toBe(false);
    });

    it('should reject whitespace-only filename', () => {
      expect(isValidFilename('   ')).toBe(false);
      expect(isValidFilename('\t')).toBe(false);
      expect(isValidFilename('\n')).toBe(false);
    });

    it('should reject filename with forward slash', () => {
      expect(isValidFilename('path/to/file.md')).toBe(false);
      expect(isValidFilename('file/name.md')).toBe(false);
    });

    it('should reject filename with backslash', () => {
      expect(isValidFilename('path\\to\\file.md')).toBe(false);
      expect(isValidFilename('file\\name.md')).toBe(false);
    });

    it('should reject filename with colon', () => {
      expect(isValidFilename('file:name.md')).toBe(false);
    });

    it('should reject filename with asterisk', () => {
      expect(isValidFilename('file*.md')).toBe(false);
    });

    it('should reject filename with question mark', () => {
      expect(isValidFilename('file?.md')).toBe(false);
    });

    it('should reject filename with double quote', () => {
      expect(isValidFilename('file"name.md')).toBe(false);
    });

    it('should reject filename with less than', () => {
      expect(isValidFilename('file<name.md')).toBe(false);
    });

    it('should reject filename with greater than', () => {
      expect(isValidFilename('file>name.md')).toBe(false);
    });

    it('should reject filename with pipe', () => {
      expect(isValidFilename('file|name.md')).toBe(false);
    });

    it('should reject filename with null character', () => {
      expect(isValidFilename('file\x00name.md')).toBe(false);
    });

    it('should reject dot dot (path traversal)', () => {
      expect(isValidFilename('..')).toBe(false);
    });

    it('should reject single dot', () => {
      expect(isValidFilename('.')).toBe(false);
    });

    it('should accept filenames starting with dot (hidden files)', () => {
      expect(isValidFilename('.gitkeep')).toBe(true);
      expect(isValidFilename('.env')).toBe(true);
    });
  });

  describe('getFilenameValidationError', () => {
    it('should return error for empty filename', () => {
      expect(getFilenameValidationError('')).toBe('Filename cannot be empty');
    });

    it('should return error for whitespace-only filename', () => {
      expect(getFilenameValidationError('   ')).toBe('Filename cannot be empty');
    });

    it('should return error for unsafe characters', () => {
      const error = getFilenameValidationError('file/name.md');
      expect(error).toContain('invalid characters');
      expect(error).toContain('/');
    });

    it('should return error for dot dot', () => {
      expect(getFilenameValidationError('..')).toBe('Filename cannot be "." or ".."');
    });

    it('should return error for single dot', () => {
      expect(getFilenameValidationError('.')).toBe('Filename cannot be "." or ".."');
    });

    it('should handle multiple unsafe characters in error message', () => {
      const error = getFilenameValidationError('file/name\\with*invalid?chars');
      expect(error).toContain('invalid characters');
      // Should list the characters (/, \, :, *, ?, ", <, >, |)
      expect(error).toContain('/');
      expect(error).toContain('\\');
      expect(error).toContain('*');
      expect(error).toContain('?');
    });
  });
});
