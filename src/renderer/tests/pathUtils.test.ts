/**
 * Unit tests for path utility functions
 */

import { describe, it, expect } from 'vitest';
import { normalizePath, getDirectoryPath, isPathWithinDirectory, isChildPath } from '../utils/pathUtils';

describe('pathUtils', () => {
  describe('normalizePath', () => {
    it('should normalize forward slashes', () => {
      expect(normalizePath('/Users/test/file.md')).toBe('/Users/test/file.md');
    });

    it('should convert backslashes to forward slashes', () => {
      expect(normalizePath('C:\\Users\\test\\file.md')).toBe('C:/Users/test/file.md');
    });

    it('should handle mixed slashes', () => {
      expect(normalizePath('C:\\Users/test\\file.md')).toBe('C:/Users/test/file.md');
    });

    it('should remove trailing slashes', () => {
      expect(normalizePath('/Users/test/')).toBe('/Users/test');
      expect(normalizePath('/Users/test//')).toBe('/Users/test');
    });

    it('should return empty string for empty input', () => {
      expect(normalizePath('')).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(normalizePath(null as any)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(normalizePath(undefined as any)).toBe('');
    });

    it('should handle single slash', () => {
      // Single slash should be preserved as root directory
      expect(normalizePath('/')).toBe('/');
    });

    it('should preserve relative paths', () => {
      expect(normalizePath('./test/file.md')).toBe('./test/file.md');
      expect(normalizePath('../test/file.md')).toBe('../test/file.md');
    });

    it('should collapse multiple consecutive slashes', () => {
      expect(normalizePath('/Users//test///file.md')).toBe('/Users/test/file.md');
      expect(normalizePath('C://Users//test//file.md')).toBe('C:/Users/test/file.md');
      expect(normalizePath('/path//to///file.md')).toBe('/path/to/file.md');
    });
  });

  describe('getDirectoryPath', () => {
    it('should extract directory from Unix file path', () => {
      expect(getDirectoryPath('/Users/test/file.md')).toBe('/Users/test');
    });

    it('should extract directory from Windows file path', () => {
      expect(getDirectoryPath('C:\\Users\\test\\file.md')).toBe('C:/Users/test');
    });

    it('should handle nested directories', () => {
      expect(getDirectoryPath('/Users/test/deep/nested/file.md')).toBe('/Users/test/deep/nested');
    });

    it('should return null for root directory', () => {
      expect(getDirectoryPath('/')).toBeNull();
    });

    it('should return null for single file name', () => {
      expect(getDirectoryPath('file.md')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getDirectoryPath('')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(getDirectoryPath(null as any)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(getDirectoryPath(undefined as any)).toBeNull();
    });

    it('should handle Windows drive root', () => {
      expect(getDirectoryPath('C:\\')).toBeNull();
      expect(getDirectoryPath('C:/')).toBeNull();
    });

    it('should handle file in root directory', () => {
      // For root-level files, lastSlashIndex is 0, which returns null (by design)
      expect(getDirectoryPath('/file.md')).toBeNull();
    });
  });

  describe('isPathWithinDirectory', () => {
    it('should return true for direct child file', () => {
      expect(isPathWithinDirectory('/Users/test/file.md', '/Users/test')).toBe(true);
    });

    it('should return true for nested child file', () => {
      expect(isPathWithinDirectory('/Users/test/deep/nested/file.md', '/Users/test')).toBe(true);
    });

    it('should return false for file outside directory', () => {
      expect(isPathWithinDirectory('/Users/other/file.md', '/Users/test')).toBe(false);
    });

    it('should return false for parent directory', () => {
      expect(isPathWithinDirectory('/Users/file.md', '/Users/test')).toBe(false);
    });

    it('should handle trailing slashes in directory', () => {
      expect(isPathWithinDirectory('/Users/test/file.md', '/Users/test/')).toBe(true);
    });

    it('should handle Windows paths', () => {
      expect(isPathWithinDirectory('C:\\Users\\test\\file.md', 'C:\\Users\\test')).toBe(true);
      expect(isPathWithinDirectory('C:\\Users\\other\\file.md', 'C:\\Users\\test')).toBe(false);
    });

    it('should handle mixed slashes', () => {
      expect(isPathWithinDirectory('C:/Users/test/file.md', 'C:\\Users\\test')).toBe(true);
    });

    it('should return true for same path (simple startsWith check)', () => {
      // The implementation uses simple startsWith, so identical paths return true
      expect(isPathWithinDirectory('/Users/test', '/Users/test')).toBe(true);
    });

    it('should return true for directory within directory', () => {
      expect(isPathWithinDirectory('/Users/test/subdir', '/Users/test')).toBe(true);
    });

    it('should handle case-sensitive paths correctly', () => {
      // Unix-like systems are case-sensitive
      expect(isPathWithinDirectory('/Users/Test/file.md', '/Users/test')).toBe(false);
    });

    it('should return false for empty child path', () => {
      expect(isPathWithinDirectory('', '/Users/test')).toBe(false);
    });

    it('should return false for empty parent path', () => {
      expect(isPathWithinDirectory('/Users/test/file.md', '')).toBe(false);
    });

    it('should return false for null child path', () => {
      expect(isPathWithinDirectory(null as any, '/Users/test')).toBe(false);
    });

    it('should return false for null parent path', () => {
      expect(isPathWithinDirectory('/Users/test/file.md', null as any)).toBe(false);
    });

    it('should use simple string matching (no path resolution)', () => {
      // The implementation uses simple startsWith, not path.resolve
      // So /Users/test/../other still starts with /Users/test
      // This is a limitation of the current implementation
      expect(isPathWithinDirectory('/Users/test/../other/file.md', '/Users/test')).toBe(true);
    });

    it('should handle root directory', () => {
      // Root path '/' is now preserved, so paths starting with '/' should match
      expect(isPathWithinDirectory('/Users/test/file.md', '/')).toBe(true);
      expect(isPathWithinDirectory('/file.md', '/')).toBe(true);
    });
  });

  describe('isChildPath', () => {
    it('should return true for direct child file', () => {
      expect(isChildPath('/parent/child/file.md', '/parent')).toBe(true);
    });

    it('should return true for direct child directory', () => {
      expect(isChildPath('/parent/child', '/parent')).toBe(true);
    });

    it('should return true for nested child file', () => {
      expect(isChildPath('/parent/child/deep/file.md', '/parent')).toBe(true);
    });

    it('should return false for same path', () => {
      expect(isChildPath('/parent', '/parent')).toBe(false);
    });

    it('should return false for file outside directory', () => {
      expect(isChildPath('/other/file.md', '/parent')).toBe(false);
    });

    it('should prevent false positives with similar names', () => {
      // Critical edge case: /parent vs /parentfoo
      expect(isChildPath('/parentfoo/file.md', '/parent')).toBe(false);
      expect(isChildPath('/Users/foo/file.md', '/Users/foobar')).toBe(false);
    });

    it('should handle trailing slashes correctly', () => {
      expect(isChildPath('/parent/child/file.md', '/parent/')).toBe(true);
      expect(isChildPath('/parent/child/', '/parent')).toBe(true);
    });

    it('should handle Windows paths', () => {
      expect(isChildPath('C:\\Users\\test\\file.md', 'C:\\Users\\test')).toBe(true);
      expect(isChildPath('C:\\Users\\other\\file.md', 'C:\\Users\\test')).toBe(false);
    });

    it('should handle mixed slashes', () => {
      expect(isChildPath('C:/Users/test/file.md', 'C:\\Users\\test')).toBe(true);
    });

    it('should return false for empty paths', () => {
      expect(isChildPath('', '/parent')).toBe(false);
      expect(isChildPath('/child', '')).toBe(false);
      expect(isChildPath('', '')).toBe(false);
    });

    it('should return false for null/undefined paths', () => {
      expect(isChildPath(null as any, '/parent')).toBe(false);
      expect(isChildPath('/child', null as any)).toBe(false);
      expect(isChildPath(undefined as any, '/parent')).toBe(false);
      expect(isChildPath('/child', undefined as any)).toBe(false);
    });

    it('should handle case-sensitive paths correctly', () => {
      expect(isChildPath('/Parent/child/file.md', '/parent')).toBe(false);
    });

    it('should handle root directory correctly', () => {
      expect(isChildPath('/Users/test/file.md', '/')).toBe(true);
      expect(isChildPath('/', '/')).toBe(false); // Same path
    });

    it('should validate the critical bug fix scenario', () => {
      // The exact scenario from the bug: deleting /test/parent should not affect /test/parentfoo
      expect(isChildPath('/test/parentfoo/file.md', '/test/parent')).toBe(false);
      expect(isChildPath('/test/parent/file.md', '/test/parent')).toBe(true);
    });
  });
});
