/**
 * Tests for MarkdownEditor component
 *
 * These tests verify:
 * - Cursor jump prevention during typing
 * - External vs internal update handling
 * - isExternalChangeRef flag behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownEditor } from '../components/Editor/MarkdownEditor';

describe('MarkdownEditor', () => {
  let onUpdateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onUpdateMock = vi.fn();
  });

  describe('Cursor Jump Prevention', () => {
    it('should not update localContent when user is typing', () => {
      const { rerender } = render(
        <MarkdownEditor content="Initial content" onUpdate={onUpdateMock} />
      );

      const textarea = screen.getByRole('textbox');

      // User types
      fireEvent.change(textarea, { target: { value: 'User typed content' } });

      // Verify onUpdate was called with new content
      expect(onUpdateMock).toHaveBeenCalledWith('User typed content');

      // Simulate external update while user is typing (echo from auto-save)
      rerender(<MarkdownEditor content="User typed content" onUpdate={onUpdateMock} />);

      // Textarea should maintain user's typed content
      expect(textarea).toHaveValue('User typed content');
    });

    it('should update localContent on true external changes', () => {
      const { rerender } = render(
        <MarkdownEditor content="Initial content" onUpdate={onUpdateMock} />
      );

      const textarea = screen.getByRole('textbox');

      // Initial value
      expect(textarea).toHaveValue('Initial content');

      // External content change (different file loaded)
      rerender(<MarkdownEditor content="New file content" onUpdate={onUpdateMock} />);

      // Should update to new content
      expect(textarea).toHaveValue('New file content');
    });

    it('should reset isExternalChangeRef after each content prop change', () => {
      const { rerender } = render(
        <MarkdownEditor content="Content 1" onUpdate={onUpdateMock} />
      );

      const textarea = screen.getByRole('textbox');

      // User types
      fireEvent.change(textarea, { target: { value: 'User edit' } });

      // External update (echo) - should be ignored because flag is false
      rerender(<MarkdownEditor content="User edit" onUpdate={onUpdateMock} />);

      // Another external update (different content) - should be accepted because flag was reset
      rerender(<MarkdownEditor content="Different content" onUpdate={onUpdateMock} />);

      expect(textarea).toHaveValue('Different content');
    });
  });

  describe('External vs Internal Updates', () => {
    it('should distinguish between user typing and external updates', () => {
      const { rerender } = render(
        <MarkdownEditor content="Initial" onUpdate={onUpdateMock} />
      );

      const textarea = screen.getByRole('textbox');

      // User types (internal update)
      fireEvent.change(textarea, { target: { value: 'User typing...' } });
      expect(onUpdateMock).toHaveBeenCalledWith('User typing...');

      // External update while typing (echo) - should not overwrite
      rerender(<MarkdownEditor content="User typing..." onUpdate={onUpdateMock} />);
      expect(textarea).toHaveValue('User typing...');

      // True external update (different content) - should update
      rerender(<MarkdownEditor content="File reloaded" onUpdate={onUpdateMock} />);
      expect(textarea).toHaveValue('File reloaded');
    });

    it('should not trigger update when external content matches local content', () => {
      const { rerender } = render(
        <MarkdownEditor content="Same content" onUpdate={onUpdateMock} />
      );

      const textarea = screen.getByRole('textbox');

      // Clear the mock to track new calls
      onUpdateMock.mockClear();

      // Re-render with same content
      rerender(<MarkdownEditor content="Same content" onUpdate={onUpdateMock} />);

      // Should not trigger any updates
      expect(onUpdateMock).not.toHaveBeenCalled();
      expect(textarea).toHaveValue('Same content');
    });
  });

  describe('Props and Attributes', () => {
    it('should render with placeholder', () => {
      render(
        <MarkdownEditor
          content=""
          onUpdate={onUpdateMock}
          placeholder="Custom placeholder"
        />
      );

      const textarea = screen.getByPlaceholderText('Custom placeholder');
      expect(textarea).toBeInTheDocument();
    });

    it('should respect editable prop', () => {
      render(
        <MarkdownEditor content="Content" onUpdate={onUpdateMock} editable={false} />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('readonly');
    });

    it('should render as editable by default', () => {
      render(<MarkdownEditor content="Content" onUpdate={onUpdateMock} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveAttribute('readonly');
    });

    it('should have spellCheck disabled', () => {
      render(<MarkdownEditor content="Content" onUpdate={onUpdateMock} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('spellcheck', 'false');
    });
  });

  describe('Content Synchronization', () => {
    it('should sync initial content to textarea', () => {
      const initialContent = 'Initial markdown\n\n\nwith blank lines';

      render(<MarkdownEditor content={initialContent} onUpdate={onUpdateMock} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(initialContent);
    });

    it('should preserve whitespace in content', () => {
      const contentWithWhitespace = 'Line 1\n\n\n\nLine 2';

      render(
        <MarkdownEditor content={contentWithWhitespace} onUpdate={onUpdateMock} />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(contentWithWhitespace);
    });

    it('should call onUpdate immediately when user types', () => {
      render(<MarkdownEditor content="" onUpdate={onUpdateMock} />);

      const textarea = screen.getByRole('textbox');

      fireEvent.change(textarea, { target: { value: 'New content' } });

      expect(onUpdateMock).toHaveBeenCalledTimes(1);
      expect(onUpdateMock).toHaveBeenCalledWith('New content');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const { container } = render(
        <MarkdownEditor content="" onUpdate={onUpdateMock} />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('');
      expect(container).toBeTruthy();
    });

    it('should handle very long content', () => {
      const longContent = 'Line\n'.repeat(1000);

      render(<MarkdownEditor content={longContent} onUpdate={onUpdateMock} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(longContent);
    });

    it('should handle special characters', () => {
      const specialContent = '`Code` **bold** *italic* [link](url)';

      render(<MarkdownEditor content={specialContent} onUpdate={onUpdateMock} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(specialContent);
    });
  });

  describe('Markdown Guide', () => {
    it('should display markdown guide link', () => {
      render(<MarkdownEditor content="" onUpdate={onUpdateMock} />);

      expect(screen.getByText('Markdown Guide')).toBeInTheDocument();
    });

    it('should open markdown guide when link is clicked', () => {
      render(<MarkdownEditor content="" onUpdate={onUpdateMock} />);

      const guideLink = screen.getByText('Markdown Guide');
      fireEvent.click(guideLink);

      // Guide modal should now be visible
      expect(screen.getByText('Markdown Syntax Guide')).toBeInTheDocument();
    });

    it('should close markdown guide when modal close is clicked', () => {
      render(<MarkdownEditor content="" onUpdate={onUpdateMock} />);

      // Open guide
      const guideLink = screen.getByText('Markdown Guide');
      fireEvent.click(guideLink);

      // Close guide
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      // Guide should be closed
      expect(screen.queryByText('Markdown Syntax Guide')).not.toBeInTheDocument();
    });

    it('should render textarea and guide link in same container', () => {
      const { container } = render(
        <MarkdownEditor content="Test" onUpdate={onUpdateMock} />
      );

      const wrapper = container.querySelector('.relative');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('w-full', 'h-full');
    });
  });
});
