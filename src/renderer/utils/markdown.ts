/**
 * Shared markdown parsing utilities
 * Ensures consistent markdown-it and turndown configuration across the application
 */

import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * Create a configured markdown-it parser instance
 * Configuration:
 * - 'default' preset with standard markdown features
 * - html: false - Disables raw HTML for security (prevents XSS)
 * - breaks: true - Converts line breaks to <br> tags
 * - Table support enabled for GFM tables
 * Note: Syntax highlighting is handled by TipTap's CodeBlockLowlight, not markdown-it
 */
export const createMarkdownParser = (): MarkdownIt => {
  const md = new MarkdownIt('default', {
    html: false,
    breaks: true,
  });

  // Enable table support (GFM tables)
  md.enable('table');

  return md;
};

/**
 * Create a configured TurndownService instance for HTML to markdown conversion
 * Configuration:
 * - headingStyle: 'atx' - Uses # syntax for headings (e.g., ## Heading)
 * - codeBlockStyle: 'fenced' - Uses ``` for code blocks instead of indentation
 * - gfm plugin - Adds support for tables, strikethrough, and other GFM features
 */
export const createTurndownService = (): TurndownService => {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  // Add GFM plugin for table support
  turndown.use(gfm);

  return turndown;
};
