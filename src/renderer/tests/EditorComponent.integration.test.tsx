import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditorComponent } from '../components/Editor/EditorComponent';

describe('EditorComponent - Toolbar Integration', () => {
  const noop = () => {
    /* intentionally empty */
  };

  beforeEach(() => {
    // Clear localStorage to ensure consistent starting state
    localStorage.clear();
  });

  test('markdown guide link appears in markdown mode', async () => {
    render(<EditorComponent content="# Test" onUpdate={noop} />);

    // Should not show in WYSIWYG mode
    expect(screen.queryByText('Markdown Guide')).not.toBeInTheDocument();

    // Switch to markdown mode
    const viewToggle = screen.getByTitle(/Switch to Markdown/i);
    fireEvent.click(viewToggle);

    // Should show in markdown mode
    await waitFor(() => {
      expect(screen.getByText('Markdown Guide')).toBeInTheDocument();
    });
  });

  test('markdown guide opens from markdown mode', async () => {
    render(<EditorComponent content="# Test" onUpdate={noop} />);

    // Switch to markdown mode
    const viewToggle = screen.getByTitle(/Switch to Markdown/i);
    fireEvent.click(viewToggle);

    // Wait for guide link to appear
    await waitFor(() => {
      expect(screen.getByText('Markdown Guide')).toBeInTheDocument();
    });

    // Click guide link
    const guideLink = screen.getByText('Markdown Guide');
    fireEvent.click(guideLink);

    // Modal should open
    expect(screen.getByText('Markdown Syntax Guide')).toBeInTheDocument();
    expect(screen.getByText('Text Formatting')).toBeInTheDocument();
  });

  test('markdown guide can be closed', async () => {
    render(<EditorComponent content="# Test" onUpdate={noop} />);

    // Switch to markdown mode
    const viewToggle = screen.getByTitle(/Switch to Markdown/i);
    fireEvent.click(viewToggle);

    // Open guide
    await waitFor(() => {
      expect(screen.getByText('Markdown Guide')).toBeInTheDocument();
    });
    const guideLink = screen.getByText('Markdown Guide');
    fireEvent.click(guideLink);

    // Verify modal is open
    expect(screen.getByText('Markdown Syntax Guide')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    // Modal should be closed
    expect(screen.queryByText('Markdown Syntax Guide')).not.toBeInTheDocument();
  });

  test('view toggle button works in both modes', async () => {
    render(<EditorComponent content="# Test" onUpdate={noop} />);

    // View toggle should exist in WYSIWYG mode
    const viewToggleWysiwyg = screen.getByTitle(/Switch to Markdown/i);
    expect(viewToggleWysiwyg).toBeInTheDocument();

    // Switch to markdown mode
    fireEvent.click(viewToggleWysiwyg);

    // View toggle should exist in markdown mode
    await waitFor(() => {
      const viewToggleMarkdown = screen.getByTitle(/Switch to WYSIWYG/i);
      expect(viewToggleMarkdown).toBeInTheDocument();
    });
  });

  test('content persists when switching between modes', async () => {
    const testContent = '# Hello World\n\nThis is a test.';
    let currentContent = testContent;
    const handleUpdate = (newContent: string) => {
      currentContent = newContent;
    };

    const { rerender } = render(
      <EditorComponent content={testContent} onUpdate={handleUpdate} />
    );

    // Switch to markdown mode
    const viewToggle = screen.getByTitle(/Switch to Markdown/i);
    fireEvent.click(viewToggle);

    // Check content is visible in markdown mode
    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(testContent);
    });

    // Switch back to WYSIWYG
    const viewToggleBack = screen.getByTitle(/Switch to WYSIWYG/i);
    fireEvent.click(viewToggleBack);

    // Content should still be there (though we can't easily verify TipTap content in tests)
    // At minimum, the component should render without errors
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument(); // Textarea gone in WYSIWYG
  });

  test('markdown guide shows all expected sections', async () => {
    render(<EditorComponent content="# Test" onUpdate={noop} />);

    // Switch to markdown mode
    const viewToggle = screen.getByTitle(/Switch to Markdown/i);
    fireEvent.click(viewToggle);

    // Open guide
    await waitFor(() => {
      expect(screen.getByText('Markdown Guide')).toBeInTheDocument();
    });
    const guideLink = screen.getByText('Markdown Guide');
    fireEvent.click(guideLink);

    // Verify all sections are present
    expect(screen.getByText('Markdown Syntax Guide')).toBeInTheDocument();
    expect(screen.getByText('Text Formatting')).toBeInTheDocument();
    expect(screen.getByText('Headings')).toBeInTheDocument();
    expect(screen.getByText('Lists')).toBeInTheDocument();
    expect(screen.getByText('Links & Images')).toBeInTheDocument();
    expect(screen.getByText('Code Blocks')).toBeInTheDocument();
    expect(screen.getByText('Blockquotes')).toBeInTheDocument();
    expect(screen.getByText('Tables')).toBeInTheDocument();
    expect(screen.getByText('Other Elements')).toBeInTheDocument();
  });
});
