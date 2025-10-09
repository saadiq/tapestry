import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownGuide } from './MarkdownGuide';

describe('MarkdownGuide', () => {
  const noop = () => {
    /* intentionally empty */
  };

  test('does not render when isOpen is false', () => {
    render(<MarkdownGuide isOpen={false} onClose={noop} />);

    expect(screen.queryByText('Markdown Syntax Guide')).not.toBeInTheDocument();
  });

  test('renders guide when isOpen is true', () => {
    render(<MarkdownGuide isOpen={true} onClose={noop} />);

    expect(screen.getByText('Markdown Syntax Guide')).toBeInTheDocument();
  });

  test('displays all section headings', () => {
    render(<MarkdownGuide isOpen={true} onClose={noop} />);

    expect(screen.getByText('Text Formatting')).toBeInTheDocument();
    expect(screen.getByText('Headings')).toBeInTheDocument();
    expect(screen.getByText('Lists')).toBeInTheDocument();
    expect(screen.getByText('Links & Images')).toBeInTheDocument();
    expect(screen.getByText('Code Blocks')).toBeInTheDocument();
    expect(screen.getByText('Blockquotes')).toBeInTheDocument();
    expect(screen.getByText('Tables')).toBeInTheDocument();
    expect(screen.getByText('Other Elements')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    let closeCalled = false;
    const handleClose = () => {
      closeCalled = true;
    };

    render(<MarkdownGuide isOpen={true} onClose={handleClose} />);

    const closeButton = screen.getByLabelText('Close markdown guide');
    fireEvent.click(closeButton);

    expect(closeCalled).toBe(true);
  });

  test('calls onClose when footer Close button is clicked', () => {
    let closeCalled = false;
    const handleClose = () => {
      closeCalled = true;
    };

    render(<MarkdownGuide isOpen={true} onClose={handleClose} />);

    // Get the primary Close button in the footer (not the backdrop close button)
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(closeCalled).toBe(true);
  });

  test('displays markdown syntax examples', () => {
    render(<MarkdownGuide isOpen={true} onClose={noop} />);

    // Check for some example syntax
    expect(screen.getByText('**bold text**')).toBeInTheDocument();
    expect(screen.getByText('*italic text*')).toBeInTheDocument();
    expect(screen.getByText('# Heading 1')).toBeInTheDocument();
  });
});
