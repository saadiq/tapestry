/**
 * Shared markdown parsing utilities
 * Ensures consistent markdown-it and turndown configuration across the application
 */

import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { sanitizeLinkUrl, sanitizeImageUrl } from './urlSanitizer';

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

  // Add custom rule to handle TipTap's table structure with <p> tags in cells
  // This must come after the GFM plugin to override its table handling
  turndown.addRule('tiptapTable', {
    filter: (node) => {
      // Check if this is a table with the TipTap structure (has <p> tags in cells)
      if (node.nodeName === 'TABLE') {
        const firstCell = node.querySelector('td, th');
        return firstCell?.querySelector('p') !== null;
      }
      return false;
    },
    replacement: (content, node) => {
      const element = node as HTMLTableElement;
      const rows: string[][] = [];
      const alignment: string[] = [];
      let hasHeader = false;

      // Process each row
      const tableRows = Array.from(element.querySelectorAll('tr'));
      tableRows.forEach((row, rowIndex) => {
        const cells: string[] = [];
        const cellElements = Array.from(row.querySelectorAll('th, td'));

        cellElements.forEach((cell) => {
          // Extract text from paragraph tags or direct text content
          const paragraphs = cell.querySelectorAll('p');
          let cellText = '';
          if (paragraphs.length > 0) {
            cellText = Array.from(paragraphs).map(p => p.textContent || '').join(' ');
          } else {
            cellText = cell.textContent || '';
          }
          cells.push(cellText.trim());
        });

        if (cellElements.length > 0 && cellElements[0].tagName === 'TH') {
          hasHeader = true;
        }

        if (cells.length > 0) {
          rows.push(cells);
        }
      });

      if (rows.length === 0) {
        return '';
      }

      // Build markdown table
      let markdown = '';

      rows.forEach((row, rowIndex) => {
        markdown += '| ' + row.join(' | ') + ' |\n';

        // Add separator after header row
        if (rowIndex === 0 && hasHeader) {
          const separator = row.map(() => '---').join(' | ');
          markdown += '| ' + separator + ' |\n';
        } else if (rowIndex === 0 && !hasHeader) {
          // If no header, add separator after first row
          const separator = row.map(() => '---').join(' | ');
          markdown += '| ' + separator + ' |\n';
        }
      });

      return '\n\n' + markdown + '\n\n';
    }
  });

  return turndown;
};

/**
 * Token offset constants for predictable token sequences
 * These represent the number of tokens consumed by a structure
 */
const TOKEN_OFFSET = {
  /** heading_open, inline, heading_close */
  HEADING: 3,
  /** paragraph_open, inline, paragraph_close */
  PARAGRAPH: 3,
  /** list_item_open, content..., list_item_close */
  LIST_ITEM: 1,
} as const;

/**
 * Validation constants for table attributes
 */
const TABLE_LIMITS = {
  /** Maximum colspan value */
  MAX_COLSPAN: 100,
  /** Maximum rowspan value */
  MAX_ROWSPAN: 100,
} as const;

/**
 * Supported node types in TipTap
 */
type NodeType =
  | 'doc'
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'listItem'
  | 'blockquote'
  | 'codeBlock'
  | 'horizontalRule'
  | 'table'
  | 'tableRow'
  | 'tableCell'
  | 'tableHeader'
  | 'image'
  | 'text'
  | 'hardBreak';

/**
 * Supported mark types in TipTap
 */
type MarkType = 'bold' | 'italic' | 'strike' | 'code' | 'link';

/**
 * Mark structure with optional attributes
 */
interface Mark {
  type: MarkType;
  attrs?: {
    href?: string;
    title?: string | null;
    [key: string]: unknown;
  };
}

/**
 * Type-safe TipTap JSON node structure
 */
interface JSONContent {
  type: NodeType;
  attrs?: {
    level?: number; // for headings
    src?: string; // for images
    alt?: string; // for images
    title?: string | null; // for images
    language?: string | null; // for code blocks
    colspan?: number; // for table cells
    rowspan?: number; // for table cells
    [key: string]: unknown;
  };
  content?: JSONContent[];
  text?: string;
  marks?: Mark[];
}

/**
 * Convert markdown to TipTap JSON format
 * This bypasses the HTML → DOM parser → TipTap pipeline which causes issues with tables
 * (browser's DOM parser automatically adds tbody/thead which TipTap's schema rejects)
 */
export const markdownToJSON = (markdown: string): JSONContent => {
  const md = createMarkdownParser();
  const tokens = md.parse(markdown, {});

  const result: JSONContent = {
    type: 'doc',
    content: [],
  };

  let i = 0;
  while (i < tokens.length) {
    const node = parseToken(tokens, i);
    if (node.content) {
      result.content!.push(node.content);
      i = node.nextIndex;
    } else {
      i++;
    }
  }

  return result;
};

/**
 * Parse a single token and its children into TipTap JSON
 */
function parseToken(
  tokens: Token[],
  index: number
): { content: JSONContent | null; nextIndex: number } {
  const token = tokens[index];

  // Handle different token types
  switch (token.type) {
    case 'heading_open': {
      const level = parseInt(token.tag.slice(1)); // h1 -> 1, h2 -> 2, etc.
      const inlineToken = tokens[index + 1];
      const content = inlineToken ? parseInlineContent(inlineToken) : [];
      return {
        content: {
          type: 'heading',
          attrs: { level },
          ...(content.length > 0 && { content }),
        },
        nextIndex: index + TOKEN_OFFSET.HEADING,
      };
    }

    case 'paragraph_open': {
      const inlineToken = tokens[index + 1];
      const content = inlineToken ? parseInlineContent(inlineToken) : [];
      return {
        content: {
          type: 'paragraph',
          ...(content.length > 0 && { content }),
        },
        nextIndex: index + TOKEN_OFFSET.PARAGRAPH,
      };
    }

    case 'bullet_list_open':
    case 'ordered_list_open': {
      const listType = token.type === 'bullet_list_open' ? 'bulletList' : 'orderedList';
      const listContent: JSONContent[] = [];
      let i = index + 1;

      while (i < tokens.length && tokens[i].type !== `${token.type.replace('_open', '_close')}`) {
        if (tokens[i].type === 'list_item_open') {
          const itemResult = parseListItem(tokens, i);
          listContent.push(itemResult.content!);
          i = itemResult.nextIndex;
        } else {
          i++;
        }
      }

      return {
        content: {
          type: listType,
          content: listContent,
        },
        nextIndex: i + 1,
      };
    }

    case 'blockquote_open': {
      const blockquoteContent: JSONContent[] = [];
      let i = index + 1;

      while (i < tokens.length && tokens[i].type !== 'blockquote_close') {
        const nodeResult = parseToken(tokens, i);
        if (nodeResult.content) {
          blockquoteContent.push(nodeResult.content);
          i = nodeResult.nextIndex;
        } else {
          i++;
        }
      }

      return {
        content: {
          type: 'blockquote',
          content: blockquoteContent,
        },
        nextIndex: i + 1,
      };
    }

    case 'code_block':
    case 'fence': {
      const language = token.info || null;
      return {
        content: {
          type: 'codeBlock',
          attrs: language ? { language } : {},
          ...(token.content && {
            content: [
              {
                type: 'text',
                text: token.content,
              },
            ],
          }),
        },
        nextIndex: index + 1,
      };
    }

    case 'hr': {
      return {
        content: {
          type: 'horizontalRule',
        },
        nextIndex: index + 1,
      };
    }

    case 'table_open': {
      return parseTable(tokens, index);
    }

    default:
      return { content: null, nextIndex: index + 1 };
  }
}

/**
 * Parse inline content (text with marks like bold, italic, code, links)
 */
function parseInlineContent(token: Token): JSONContent[] {
  const content: JSONContent[] = [];

  if (!token.children) {
    return content;
  }

  // Use indexed loop to allow skipping processed tokens
  let childIndex = 0;
  while (childIndex < token.children.length) {
    const child = token.children[childIndex];

    switch (child.type) {
      case 'text': {
        // Skip empty text nodes - TipTap doesn't allow them
        if (child.content) {
          content.push({
            type: 'text',
            text: child.content,
          });
        }
        break;
      }

      case 'code_inline': {
        // Skip empty code nodes
        if (child.content) {
          content.push({
            type: 'text',
            text: child.content,
            marks: [{ type: 'code' }],
          });
        }
        break;
      }

      case 'strong_open': {
        // Find matching strong_close and collect content between
        const strongContent: JSONContent[] = [];
        let i = childIndex + 1;
        while (i < token.children.length && token.children[i].type !== 'strong_close') {
          // Skip empty text nodes - TipTap doesn't allow them
          if (token.children[i].type === 'text' && token.children[i].content) {
            strongContent.push({
              type: 'text',
              text: token.children[i].content,
              marks: [{ type: 'bold' }],
            });
          }
          i++;
        }
        // Only add if we have content
        if (strongContent.length > 0) {
          content.push(...strongContent);
        }
        // Skip past the tokens we just processed
        childIndex = i; // Will be incremented at end of loop
        break;
      }

      case 'em_open': {
        // Find matching em_close and collect content between
        const emContent: JSONContent[] = [];
        let i = childIndex + 1;
        while (i < token.children.length && token.children[i].type !== 'em_close') {
          // Skip empty text nodes - TipTap doesn't allow them
          if (token.children[i].type === 'text' && token.children[i].content) {
            emContent.push({
              type: 'text',
              text: token.children[i].content,
              marks: [{ type: 'italic' }],
            });
          }
          i++;
        }
        // Only add if we have content
        if (emContent.length > 0) {
          content.push(...emContent);
        }
        // Skip past the tokens we just processed
        childIndex = i;
        break;
      }

      case 's_open': {
        // Strikethrough
        const strikeContent: JSONContent[] = [];
        let i = childIndex + 1;
        while (i < token.children.length && token.children[i].type !== 's_close') {
          // Skip empty text nodes - TipTap doesn't allow them
          if (token.children[i].type === 'text' && token.children[i].content) {
            strikeContent.push({
              type: 'text',
              text: token.children[i].content,
              marks: [{ type: 'strike' }],
            });
          }
          i++;
        }
        // Only add if we have content
        if (strikeContent.length > 0) {
          content.push(...strikeContent);
        }
        // Skip past the tokens we just processed
        childIndex = i;
        break;
      }

      case 'link_open': {
        const href = child.attrGet('href') || '';
        const sanitizedHref = sanitizeLinkUrl(href);
        let i = childIndex + 1;

        // If URL is invalid/dangerous, render as plain text instead
        if (!sanitizedHref) {
          while (i < token.children.length && token.children[i].type !== 'link_close') {
            if (token.children[i].type === 'text' && token.children[i].content) {
              content.push({
                type: 'text',
                text: token.children[i].content,
              });
            }
            i++;
          }
          // Skip past the tokens we just processed
          childIndex = i;
          break;
        }

        const title = child.attrGet('title') || null;
        const linkContent: JSONContent[] = [];
        while (i < token.children.length && token.children[i].type !== 'link_close') {
          // Skip empty text nodes - TipTap doesn't allow them
          if (token.children[i].type === 'text' && token.children[i].content) {
            linkContent.push({
              type: 'text',
              text: token.children[i].content,
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: sanitizedHref,
                    ...(title && { title }),
                  },
                },
              ],
            });
          }
          i++;
        }
        // Only add if we have content
        if (linkContent.length > 0) {
          content.push(...linkContent);
        }
        // Skip past the tokens we just processed
        childIndex = i;
        break;
      }

      case 'softbreak':
      case 'hardbreak': {
        content.push({
          type: 'hardBreak',
        });
        break;
      }

      case 'image': {
        const src = child.attrGet('src') || '';
        const sanitizedSrc = sanitizeImageUrl(src);

        // Skip image if URL is invalid/dangerous
        if (!sanitizedSrc) {
          break;
        }

        const alt = child.content || '';
        const title = child.attrGet('title') || null;
        content.push({
          type: 'image',
          attrs: {
            src: sanitizedSrc,
            alt,
            ...(title && { title }),
          },
        });
        break;
      }

      default:
        // Skip close tags and other tokens (em_close, strong_close, link_close, etc.)
        break;
    }

    // Move to next child token
    childIndex++;
  }

  return content;
}

/**
 * Parse list item
 */
function parseListItem(
  tokens: Token[],
  index: number
): { content: JSONContent; nextIndex: number } {
  const itemContent: JSONContent[] = [];
  let i = index + 1;

  while (i < tokens.length && tokens[i].type !== 'list_item_close') {
    const nodeResult = parseToken(tokens, i);
    if (nodeResult.content) {
      itemContent.push(nodeResult.content);
      i = nodeResult.nextIndex;
    } else {
      i++;
    }
  }

  return {
    content: {
      type: 'listItem',
      content: itemContent,
    },
    nextIndex: i + 1,
  };
}

/**
 * Parse table into TipTap JSON format
 * TipTap table structure: table → tableRow → tableCell/tableHeader → paragraph → text
 */
function parseTable(
  tokens: Token[],
  index: number
): { content: JSONContent; nextIndex: number } {
  const tableRows: JSONContent[] = [];
  let i = index + 1;

  while (i < tokens.length && tokens[i].type !== 'table_close') {
    // Skip thead_open, tbody_open, thead_close, tbody_close
    if (
      tokens[i].type === 'thead_open' ||
      tokens[i].type === 'tbody_open' ||
      tokens[i].type === 'thead_close' ||
      tokens[i].type === 'tbody_close'
    ) {
      i++;
      continue;
    }

    if (tokens[i].type === 'tr_open') {
      const rowResult = parseTableRow(tokens, i);
      tableRows.push(rowResult.content);
      i = rowResult.nextIndex;
    } else {
      i++;
    }
  }

  return {
    content: {
      type: 'table',
      content: tableRows,
    },
    nextIndex: i + 1,
  };
}

/**
 * Parse table row
 */
function parseTableRow(
  tokens: Token[],
  index: number
): { content: JSONContent; nextIndex: number } {
  const cells: JSONContent[] = [];
  let i = index + 1;
  let isHeaderRow = false;

  while (i < tokens.length && tokens[i].type !== 'tr_close') {
    if (tokens[i].type === 'th_open') {
      isHeaderRow = true;
      const cellResult = parseTableCell(tokens, i, true);
      cells.push(cellResult.content);
      i = cellResult.nextIndex;
    } else if (tokens[i].type === 'td_open') {
      const cellResult = parseTableCell(tokens, i, false);
      cells.push(cellResult.content);
      i = cellResult.nextIndex;
    } else {
      i++;
    }
  }

  return {
    content: {
      type: 'tableRow',
      content: cells,
    },
    nextIndex: i + 1,
  };
}

/**
 * Parse table cell (th or td)
 */
function parseTableCell(
  tokens: Token[],
  index: number,
  isHeader: boolean
): { content: JSONContent; nextIndex: number } {
  const token = tokens[index];
  const closeType = isHeader ? 'th_close' : 'td_close';
  let i = index + 1;

  // Get the inline content
  const inlineToken = tokens[i];
  const cellContent = inlineToken && inlineToken.type === 'inline' ? parseInlineContent(inlineToken) : [];

  // TipTap requires cells to contain paragraphs
  // Empty paragraphs should have no content array (or empty array), NOT empty text nodes
  const paragraph: JSONContent = {
    type: 'paragraph',
    ...(cellContent.length > 0 && { content: cellContent }),
  };

  // Find the close tag
  while (i < tokens.length && tokens[i].type !== closeType) {
    i++;
  }

  // Get colspan and rowspan attributes if they exist
  // Validate that they are positive integers
  const attrs: Record<string, unknown> = {};
  const colspan = token.attrGet('colspan');
  const rowspan = token.attrGet('rowspan');

  if (colspan) {
    const colspanNum = parseInt(colspan, 10);
    if (!isNaN(colspanNum) && colspanNum > 0 && colspanNum <= TABLE_LIMITS.MAX_COLSPAN) {
      attrs.colspan = colspanNum;
    }
  }

  if (rowspan) {
    const rowspanNum = parseInt(rowspan, 10);
    if (!isNaN(rowspanNum) && rowspanNum > 0 && rowspanNum <= TABLE_LIMITS.MAX_ROWSPAN) {
      attrs.rowspan = rowspanNum;
    }
  }

  return {
    content: {
      type: isHeader ? 'tableHeader' : 'tableCell',
      attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
      content: [paragraph],
    },
    nextIndex: i + 1,
  };
}
