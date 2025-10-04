/**
 * Shared markdown parsing utilities
 * Ensures consistent markdown-it and turndown configuration across the application
 */

import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';

/**
 * Create a configured markdown-it parser instance
 * Configuration:
 * - 'default' preset with standard markdown features
 * - html: false - Disables raw HTML for security (prevents XSS)
 * - breaks: true - Converts line breaks to <br> tags
 */
export const createMarkdownParser = (): MarkdownIt => {
  return new MarkdownIt('default', {
    html: false,
    breaks: true,
  });
};

/**
 * Create a configured TurndownService instance for HTML to markdown conversion
 * Configuration:
 * - headingStyle: 'atx' - Uses # syntax for headings (e.g., ## Heading)
 * - codeBlockStyle: 'fenced' - Uses ``` for code blocks instead of indentation
 */
export const createTurndownService = (): TurndownService => {
  return new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });
};
