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
 * - html: true - Enables raw HTML parsing (with sanitization in conversion)
 * - breaks: true - Converts line breaks to <br> tags
 * - Table support enabled for GFM tables
 * Note: Syntax highlighting is handled by TipTap's CodeBlockLowlight, not markdown-it
 */
export const createMarkdownParser = (): MarkdownIt => {
  const md = new MarkdownIt('default', {
    html: true,
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
 * Parse HTML string to TipTap JSON using DOM parser
 * This handles complex HTML structures safely
 */
function parseHTMLToJSON(html: string): JSONContent[] {
  // For simple inline HTML tags that come from markdown-it inline tokens
  // We'll use a simpler approach since they're already split
  if (!html.includes('<div') && !html.includes('<p>') && !html.includes('<h')) {
    return parseSimpleHTMLToJSON(html);
  }

  // For complex HTML blocks, we need to parse them properly
  // Check if DOMParser is available (it should be in the renderer process)
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Convert DOM nodes to TipTap JSON
    return domNodesToJSON(doc.body.childNodes);
  } else {
    // Fallback for Node/test environments - just extract text content
    // This won't preserve all formatting but is better than nothing
    return parseSimpleHTMLToJSON(html);
  }
}

/**
 * Parse simple inline HTML tags (for backward compatibility)
 */
function parseSimpleHTMLToJSON(html: string): JSONContent[] {
  const result: JSONContent[] = [];

  // Basic HTML tag patterns for inline elements
  const patterns = [
    { regex: /<b>(.*?)<\/b>/gi, mark: 'bold' },
    { regex: /<strong>(.*?)<\/strong>/gi, mark: 'bold' },
    { regex: /<i>(.*?)<\/i>/gi, mark: 'italic' },
    { regex: /<em>(.*?)<\/em>/gi, mark: 'italic' },
    { regex: /<s>(.*?)<\/s>/gi, mark: 'strike' },
    { regex: /<strike>(.*?)<\/strike>/gi, mark: 'strike' },
    { regex: /<del>(.*?)<\/del>/gi, mark: 'strike' },
    { regex: /<code>(.*?)<\/code>/gi, mark: 'code' },
    { regex: /<u>(.*?)<\/u>/gi, mark: 'underline' },
  ];

  // Process HTML string segment by segment
  let remaining = html;

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; content: string; mark: string } | null = null;
    let earliestIndex = Infinity;

    // Find the earliest matching HTML tag
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0; // Reset regex
      const match = pattern.regex.exec(remaining);
      if (match && match.index < earliestIndex) {
        earliestIndex = match.index;
        earliestMatch = {
          index: match.index,
          length: match[0].length,
          content: match[1],
          mark: pattern.mark,
        };
      }
    }

    if (earliestMatch) {
      // Add plain text before the match
      if (earliestMatch.index > 0) {
        const plainText = remaining.substring(0, earliestMatch.index);
        if (plainText.trim()) {
          result.push({
            type: 'text',
            text: plainText,
          });
        }
      }

      // Add the marked text (skip underline as TipTap doesn't have it by default)
      if (earliestMatch.content && earliestMatch.mark !== 'underline') {
        result.push({
          type: 'text',
          text: earliestMatch.content,
          marks: [{ type: earliestMatch.mark as MarkType }],
        });
      } else if (earliestMatch.content) {
        // For underline or unsupported marks, just add as plain text
        result.push({
          type: 'text',
          text: earliestMatch.content,
        });
      }

      // Move past this match
      remaining = remaining.substring(earliestMatch.index + earliestMatch.length);
    } else {
      // No more matches, add remaining text
      if (remaining.trim()) {
        result.push({
          type: 'text',
          text: remaining,
        });
      }
      break;
    }
  }

  return result;
}

/**
 * Convert DOM nodes to TipTap JSON format
 */
function domNodesToJSON(nodes: NodeListOf<ChildNode>): JSONContent[] {
  // Check if we're in a browser environment
  if (typeof Node === 'undefined') {
    return [];
  }

  const result: JSONContent[] = [];

  for (const node of Array.from(nodes)) {
    const jsonNode = domNodeToJSON(node);
    if (jsonNode) {
      if (Array.isArray(jsonNode)) {
        result.push(...jsonNode);
      } else {
        result.push(jsonNode);
      }
    }
  }

  return result;
}

/**
 * Convert a single DOM node to TipTap JSON
 */
function domNodeToJSON(node: Node): JSONContent | JSONContent[] | null {
  // Check if we're in a browser environment
  if (typeof Node === 'undefined') {
    return null;
  }

  // Text nodes
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text.trim()) return null;

    return {
      type: 'text',
      text: text,
    };
  }

  // Element nodes
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Handle different HTML elements
    switch (tagName) {
      case 'p': {
        const content = domNodesToJSON(element.childNodes);
        if (content.length === 0) return null;
        return {
          type: 'paragraph',
          content,
        };
      }

      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const level = parseInt(tagName.slice(1));
        const content = domNodesToJSON(element.childNodes);
        if (content.length === 0) return null;
        return {
          type: 'heading',
          attrs: { level },
          content,
        };
      }

      case 'ul': {
        const items = Array.from(element.children)
          .filter(child => child.tagName.toLowerCase() === 'li')
          .map(li => ({
            type: 'listItem' as NodeType,
            content: [
              {
                type: 'paragraph' as NodeType,
                content: domNodesToJSON(li.childNodes),
              },
            ],
          }));

        if (items.length === 0) return null;
        return {
          type: 'bulletList',
          content: items,
        };
      }

      case 'ol': {
        const items = Array.from(element.children)
          .filter(child => child.tagName.toLowerCase() === 'li')
          .map(li => ({
            type: 'listItem' as NodeType,
            content: [
              {
                type: 'paragraph' as NodeType,
                content: domNodesToJSON(li.childNodes),
              },
            ],
          }));

        if (items.length === 0) return null;
        return {
          type: 'orderedList',
          content: items,
        };
      }

      case 'blockquote': {
        const content = domNodesToJSON(element.childNodes);
        if (content.length === 0) return null;
        return {
          type: 'blockquote',
          content: content.map(c =>
            c.type === 'text' ? { type: 'paragraph' as NodeType, content: [c] } : c
          ),
        };
      }

      case 'code': {
        const text = element.textContent || '';
        return {
          type: 'text',
          text,
          marks: [{ type: 'code' }],
        };
      }

      case 'strong':
      case 'b': {
        const content = domNodesToJSON(element.childNodes);
        return content.map(c => {
          if (c.type === 'text') {
            return {
              ...c,
              marks: [...(c.marks || []), { type: 'bold' as MarkType }],
            };
          }
          return c;
        });
      }

      case 'em':
      case 'i': {
        const content = domNodesToJSON(element.childNodes);
        return content.map(c => {
          if (c.type === 'text') {
            return {
              ...c,
              marks: [...(c.marks || []), { type: 'italic' as MarkType }],
            };
          }
          return c;
        });
      }

      case 's':
      case 'strike':
      case 'del': {
        const content = domNodesToJSON(element.childNodes);
        return content.map(c => {
          if (c.type === 'text') {
            return {
              ...c,
              marks: [...(c.marks || []), { type: 'strike' as MarkType }],
            };
          }
          return c;
        });
      }

      case 'br': {
        return {
          type: 'hardBreak',
        };
      }

      case 'hr': {
        return {
          type: 'horizontalRule',
        };
      }

      case 'a': {
        const href = element.getAttribute('href') || '';
        const sanitizedHref = sanitizeLinkUrl(href);
        if (!sanitizedHref) {
          // If link is unsafe, just return the text content
          return domNodesToJSON(element.childNodes);
        }

        const content = domNodesToJSON(element.childNodes);
        return content.map(c => {
          if (c.type === 'text') {
            return {
              ...c,
              marks: [...(c.marks || []), {
                type: 'link' as MarkType,
                attrs: { href: sanitizedHref }
              }],
            };
          }
          return c;
        });
      }

      case 'img': {
        const src = element.getAttribute('src') || '';
        const sanitizedSrc = sanitizeImageUrl(src);
        if (!sanitizedSrc) return null;

        const alt = element.getAttribute('alt') || '';
        return {
          type: 'image',
          attrs: {
            src: sanitizedSrc,
            alt,
          },
        };
      }

      case 'div':
      case 'span':
      case 'details':
      case 'summary':
      case 'abbr':
      case 'sub':
      case 'sup':
      case 'kbd':
      default: {
        // For unsupported block elements, try to extract their content
        // Wrap in paragraph if needed
        const content = domNodesToJSON(element.childNodes);
        if (content.length === 0) return null;

        // If it's a block-level element and contains only text/inline content,
        // wrap it in a paragraph
        if (['div', 'details', 'summary'].includes(tagName)) {
          const needsParagraph = content.every(c =>
            c.type === 'text' || c.type === 'hardBreak' ||
            (c.type === 'image')
          );

          if (needsParagraph && content.length > 0) {
            return {
              type: 'paragraph',
              content,
            };
          }
        }

        // Otherwise, return the content directly
        return content;
      }
    }
  }

  return null;
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
      // Handle both single nodes and arrays of nodes
      if (Array.isArray(node.content)) {
        result.content!.push(...node.content);
      } else {
        result.content!.push(node.content);
      }
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
): { content: JSONContent | JSONContent[] | null; nextIndex: number } {
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

    case 'html_block': {
      // Parse block-level HTML - might return multiple blocks
      const htmlContent = parseHTMLToJSON(token.content);

      if (htmlContent.length === 0) {
        return { content: null, nextIndex: index + 1 };
      }

      // If single block, return it directly
      if (htmlContent.length === 1) {
        return {
          content: htmlContent[0],
          nextIndex: index + 1,
        };
      }

      // If multiple blocks, return them as an array
      // The caller will handle flattening them
      return {
        content: htmlContent,
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

      case 'html_inline': {
        // Handle HTML tags - they come as separate open/close tokens
        const tagContent = child.content.toLowerCase();

        // Check if it's an opening tag
        if (tagContent.match(/^<(b|strong|i|em|s|strike|del|code|u)>$/)) {
          const tagName = tagContent.slice(1, -1);

          // Find the matching closing tag and collect content between
          let markType: MarkType | null = null;
          switch (tagName) {
            case 'b':
            case 'strong':
              markType = 'bold';
              break;
            case 'i':
            case 'em':
              markType = 'italic';
              break;
            case 's':
            case 'strike':
            case 'del':
              markType = 'strike';
              break;
            case 'code':
              markType = 'code';
              break;
            // Skip 'u' as TipTap doesn't support underline by default
          }

          if (markType) {
            // Look for content until closing tag
            let i = childIndex + 1;
            const markedContent: JSONContent[] = [];
            while (i < token.children.length) {
              const nextChild = token.children[i];

              // Check if we hit the closing tag
              if (nextChild.type === 'html_inline' &&
                  nextChild.content.toLowerCase() === `</${tagName}>`) {
                // Found closing tag - add all collected content with marks
                if (markedContent.length > 0) {
                  content.push(...markedContent);
                }
                childIndex = i; // Skip past the closing tag
                break;
              }

              // Collect text content
              if (nextChild.type === 'text' && nextChild.content) {
                markedContent.push({
                  type: 'text',
                  text: nextChild.content,
                  marks: [{ type: markType }],
                });
              }

              i++;
            }
          } else if (tagName === 'u') {
            // For unsupported tags like underline, collect text without marks
            let i = childIndex + 1;
            while (i < token.children.length) {
              const nextChild = token.children[i];

              if (nextChild.type === 'html_inline' &&
                  nextChild.content.toLowerCase() === `</${tagName}>`) {
                childIndex = i;
                break;
              }

              if (nextChild.type === 'text' && nextChild.content) {
                content.push({
                  type: 'text',
                  text: nextChild.content,
                });
              }

              i++;
            }
          }
        }
        // Skip closing tags as they're handled above
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
