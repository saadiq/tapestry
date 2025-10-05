/**
 * Shared markdown parsing utilities
 * Ensures consistent markdown-it and turndown configuration across the application
 */

import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token';
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

/**
 * TipTap JSON node structure
 */
interface JSONContent {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
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
        nextIndex: index + 3, // heading_open, inline, heading_close
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
        nextIndex: index + 3, // paragraph_open, inline, paragraph_close
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

    case 'image': {
      const src = token.attrGet('src') || '';
      const alt = token.content || '';
      const title = token.attrGet('title') || null;
      return {
        content: {
          type: 'image',
          attrs: {
            src,
            alt,
            ...(title && { title }),
          },
        },
        nextIndex: index + 1,
      };
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

  for (const child of token.children) {
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
        let i = token.children.indexOf(child) + 1;
        while (i < token.children.length && token.children[i].type !== 'strong_close') {
          if (token.children[i].type === 'text' && token.children[i].content) {
            strongContent.push({
              type: 'text',
              text: token.children[i].content,
              marks: [{ type: 'bold' }],
            });
          }
          i++;
        }
        content.push(...strongContent);
        break;
      }

      case 'em_open': {
        // Find matching em_close and collect content between
        const emContent: JSONContent[] = [];
        let i = token.children.indexOf(child) + 1;
        while (i < token.children.length && token.children[i].type !== 'em_close') {
          if (token.children[i].type === 'text' && token.children[i].content) {
            emContent.push({
              type: 'text',
              text: token.children[i].content,
              marks: [{ type: 'italic' }],
            });
          }
          i++;
        }
        content.push(...emContent);
        break;
      }

      case 's_open': {
        // Strikethrough
        const strikeContent: JSONContent[] = [];
        let i = token.children.indexOf(child) + 1;
        while (i < token.children.length && token.children[i].type !== 's_close') {
          if (token.children[i].type === 'text' && token.children[i].content) {
            strikeContent.push({
              type: 'text',
              text: token.children[i].content,
              marks: [{ type: 'strike' }],
            });
          }
          i++;
        }
        content.push(...strikeContent);
        break;
      }

      case 'link_open': {
        const href = child.attrGet('href') || '';
        const title = child.attrGet('title') || null;
        const linkContent: JSONContent[] = [];
        let i = token.children.indexOf(child) + 1;
        while (i < token.children.length && token.children[i].type !== 'link_close') {
          if (token.children[i].type === 'text' && token.children[i].content) {
            linkContent.push({
              type: 'text',
              text: token.children[i].content,
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href,
                    ...(title && { title }),
                  },
                },
              ],
            });
          }
          i++;
        }
        content.push(...linkContent);
        break;
      }

      case 'softbreak':
      case 'hardbreak': {
        content.push({
          type: 'hardBreak',
        });
        break;
      }

      default:
        // Skip close tags and other tokens
        break;
    }
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
  const attrs: Record<string, unknown> = {};
  const colspan = token.attrGet('colspan');
  const rowspan = token.attrGet('rowspan');
  if (colspan) attrs.colspan = parseInt(colspan);
  if (rowspan) attrs.rowspan = parseInt(rowspan);

  return {
    content: {
      type: isHeader ? 'tableHeader' : 'tableCell',
      attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
      content: [paragraph],
    },
    nextIndex: i + 1,
  };
}
