/**
 * Tests for FileTreeItem - Inline Rename functionality
 *
 * These tests verify:
 * - Double-click behavior on active vs inactive files
 * - Keyboard shortcuts (Enter/Escape)
 * - Empty value handling
 * - Unchanged value detection
 * - Blur (click outside) behavior
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTreeItem } from '../components/FileTree/FileTreeItem';
import type { FileNode } from '../../shared/types/fileTree';

describe('FileTreeItem - Inline Rename', () => {
  const mockNode: FileNode = {
    id: '1',
    name: 'test.md',
    path: '/test/test.md',
    type: 'file',
    extension: '.md',
    depth: 0,
  };

  const mockProps = {
    node: mockNode,
    depth: 0,
    onToggle: vi.fn(),
    onSelect: vi.fn(),
    onOpen: vi.fn(),
    onContextMenu: vi.fn(),
    onRename: vi.fn(),
    isSelected: false,
    isActive: true, // Must be active for double-click rename
    isDirty: false,
  };

  it('enters rename mode on double-click when active', () => {
    const { container } = render(<FileTreeItem {...mockProps} />);

    const nameSpan = screen.getByText('test.md');
    fireEvent.doubleClick(nameSpan);

    // Input should appear
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('test.md');
  });

  it('does not enter rename mode when not active', () => {
    const { container } = render(<FileTreeItem {...mockProps} isActive={false} />);

    const nameSpan = screen.getByText('test.md');
    fireEvent.doubleClick(nameSpan);

    // Input should NOT appear
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeFalsy();
  });

  it('does not enter rename mode for directories', () => {
    const dirNode: FileNode = {
      ...mockNode,
      type: 'directory',
      name: 'test-dir',
    };
    const { container } = render(<FileTreeItem {...mockProps} node={dirNode} />);

    const nameSpan = screen.getByText('test-dir');
    fireEvent.doubleClick(nameSpan);

    // Input should NOT appear
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeFalsy();
  });

  it('submits rename on Enter key', () => {
    const onRename = vi.fn();
    const { container } = render(<FileTreeItem {...mockProps} onRename={onRename} />);

    // Enter rename mode
    const nameSpan = screen.getByText('test.md');
    fireEvent.doubleClick(nameSpan);

    // Type new name
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'renamed.md' } });

    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    // Should call onRename with new name
    expect(onRename).toHaveBeenCalledWith('/test/test.md', 'renamed.md');
  });

  it('cancels rename on Escape key', () => {
    const onRename = vi.fn();
    const { container } = render(<FileTreeItem {...mockProps} onRename={onRename} />);

    // Enter rename mode
    fireEvent.doubleClick(screen.getByText('test.md'));

    // Type new name
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'renamed.md' } });

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });

    // Should NOT call onRename
    expect(onRename).not.toHaveBeenCalled();

    // Should exit rename mode
    expect(container.querySelector('input[type="text"]')).toBeFalsy();
  });

  it('submits rename on blur (clicking outside)', () => {
    const onRename = vi.fn();
    const { container } = render(<FileTreeItem {...mockProps} onRename={onRename} />);

    // Enter rename mode
    fireEvent.doubleClick(screen.getByText('test.md'));

    // Type new name
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'renamed.md' } });

    // Blur (click outside)
    fireEvent.blur(input);

    // Should call onRename
    expect(onRename).toHaveBeenCalledWith('/test/test.md', 'renamed.md');
  });

  it('does not rename when value is empty', () => {
    const onRename = vi.fn();
    const { container } = render(<FileTreeItem {...mockProps} onRename={onRename} />);

    fireEvent.doubleClick(screen.getByText('test.md'));

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } }); // Whitespace
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRename).not.toHaveBeenCalled();
  });

  it('does not rename when value is unchanged', () => {
    const onRename = vi.fn();
    const { container } = render(<FileTreeItem {...mockProps} onRename={onRename} />);

    fireEvent.doubleClick(screen.getByText('test.md'));

    // Keep same name
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRename).not.toHaveBeenCalled();
  });

  it('trims whitespace before submitting', () => {
    const onRename = vi.fn();
    const { container } = render(<FileTreeItem {...mockProps} onRename={onRename} />);

    fireEvent.doubleClick(screen.getByText('test.md'));

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  renamed.md  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Should trim and submit
    expect(onRename).toHaveBeenCalledWith('/test/test.md', 'renamed.md');
  });

  it('exits rename mode after successful submit', () => {
    const onRename = vi.fn();
    const { container } = render(<FileTreeItem {...mockProps} onRename={onRename} />);

    fireEvent.doubleClick(screen.getByText('test.md'));

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'renamed.md' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Should exit rename mode
    expect(container.querySelector('input[type="text"]')).toBeFalsy();
  });

  it('resets input value to original name on cancel', () => {
    const { container } = render(<FileTreeItem {...mockProps} />);

    // Enter rename mode
    fireEvent.doubleClick(screen.getByText('test.md'));

    // Type new name
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'renamed.md' } });

    // Cancel
    fireEvent.keyDown(input, { key: 'Escape' });

    // Re-enter rename mode
    fireEvent.doubleClick(screen.getByText('test.md'));

    // Input should have original name
    const newInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(newInput.value).toBe('test.md');
  });
});
