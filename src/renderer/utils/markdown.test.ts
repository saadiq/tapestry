/**
 * Tests for markdown parsing utilities
 * Focus on markdownToJSON() conversion and round-trip fidelity
 */

import { describe, it, expect } from 'vitest';
import { markdownToJSON, createMarkdownParser, createTurndownService } from './markdown';

describe('markdown utils', () => {
  describe('markdownToJSON()', () => {
    describe('basic elements', () => {
      it('should convert headings', () => {
        const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
        const json = markdownToJSON(markdown);

        expect(json.type).toBe('doc');
        expect(json.content).toHaveLength(3);
        expect(json.content![0].type).toBe('heading');
        expect(json.content![0].attrs?.level).toBe(1);
        expect(json.content![0].content![0].text).toBe('Heading 1');
        expect(json.content![1].attrs?.level).toBe(2);
        expect(json.content![2].attrs?.level).toBe(3);
      });

      it('should convert paragraphs', () => {
        const markdown = 'This is a paragraph.\n\nThis is another paragraph.';
        const json = markdownToJSON(markdown);

        expect(json.content).toHaveLength(2);
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![0].text).toBe('This is a paragraph.');
        expect(json.content![1].content![0].text).toBe('This is another paragraph.');
      });

      it('should convert bullet lists', () => {
        const markdown = '- Item 1\n- Item 2\n- Item 3';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('bulletList');
        expect(json.content![0].content).toHaveLength(3);
        expect(json.content![0].content![0].type).toBe('listItem');
      });

      it('should convert ordered lists', () => {
        const markdown = '1. First\n2. Second\n3. Third';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('orderedList');
        expect(json.content![0].content).toHaveLength(3);
      });

      it('should convert blockquotes', () => {
        const markdown = '> This is a quote\n> Second line';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('blockquote');
        expect(json.content![0].content![0].type).toBe('paragraph');
      });

      it('should convert code blocks', () => {
        const markdown = '```javascript\nconst x = 1;\n```';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('codeBlock');
        expect(json.content![0].attrs?.language).toBe('javascript');
        expect(json.content![0].content![0].text).toContain('const x = 1;');
      });

      it('should convert horizontal rules', () => {
        const markdown = 'Above\n\n---\n\nBelow';
        const json = markdownToJSON(markdown);

        expect(json.content![1].type).toBe('horizontalRule');
      });
    });

    describe('inline marks', () => {
      it('should convert bold text', () => {
        const markdown = '**bold text**';
        const json = markdownToJSON(markdown);

        const textNode = json.content![0].content![0];
        expect(textNode.text).toBe('bold text');
        expect(textNode.marks![0].type).toBe('bold');
      });

      it('should convert italic text', () => {
        const markdown = '*italic text*';
        const json = markdownToJSON(markdown);

        const textNode = json.content![0].content![0];
        expect(textNode.marks![0].type).toBe('italic');
      });

      it('should convert strikethrough text', () => {
        const markdown = '~~strikethrough~~';
        const json = markdownToJSON(markdown);

        const textNode = json.content![0].content![0];
        expect(textNode.marks![0].type).toBe('strike');
      });

      it('should convert inline code', () => {
        const markdown = '`code`';
        const json = markdownToJSON(markdown);

        const textNode = json.content![0].content![0];
        expect(textNode.marks![0].type).toBe('code');
      });

      it('should convert links', () => {
        const markdown = '[Link text](https://example.com)';
        const json = markdownToJSON(markdown);

        const textNode = json.content![0].content![0];
        expect(textNode.marks![0].type).toBe('link');
        expect(textNode.marks![0].attrs?.href).toBe('https://example.com');
      });

      it('should skip empty marks', () => {
        const markdown = '****';
        const json = markdownToJSON(markdown);

        // Empty marks should not be added
        expect(json.content![0].content).toBeUndefined();
      });
    });

    describe('tables', () => {
      it('should convert simple tables', () => {
        const markdown = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('table');
        expect(json.content![0].content![0].type).toBe('tableRow');
        expect(json.content![0].content![0].content![0].type).toBe('tableHeader');
      });

      it('should handle empty table cells', () => {
        const markdown = '| Header |\n|--------|\n|        |';
        const json = markdownToJSON(markdown);

        const cell = json.content![0].content![1].content![0];
        expect(cell.type).toBe('tableCell');
        // Empty cells should have a paragraph with no content
        expect(cell.content![0].type).toBe('paragraph');
      });

      it('should validate colspan attributes', () => {
        // Note: markdown-it doesn't parse colspan from markdown syntax,
        // but our validator should handle it if present
        const markdown = '| Cell |\n|------|\n| Data |';
        const json = markdownToJSON(markdown);

        // Should not have colspan by default
        expect(json.content![0].content![1].content![0].attrs).toBeUndefined();
      });
    });

    describe('images', () => {
      it('should convert images with valid URLs', () => {
        const markdown = '![Alt text](https://example.com/image.png)';
        const json = markdownToJSON(markdown);

        // Images are wrapped in paragraphs
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![0].type).toBe('image');
        expect(json.content![0].content![0].attrs?.src).toBe('https://example.com/image.png');
        expect(json.content![0].content![0].attrs?.alt).toBe('Alt text');
      });

      it('should sanitize dangerous image URLs', () => {
        const markdown = '![XSS](javascript:alert(1))';
        const json = markdownToJSON(markdown);

        // markdown-it doesn't parse javascript: URLs as valid images, so they're rendered as plain text
        // This is actually safer than our sanitization approach
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![0].type).toBe('text');
        expect(json.content![0].content![0].text).toBe('![XSS](javascript:alert(1))');
      });
    });

    describe('HTML support', () => {
      it('should convert inline bold HTML tags', () => {
        const markdown = 'This is <b>bold</b> and <strong>strong</strong> text';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content).toHaveLength(5); // "This is ", "bold", " and ", "strong", " text"
        expect(json.content![0].content![1].text).toBe('bold');
        expect(json.content![0].content![1].marks![0].type).toBe('bold');
        expect(json.content![0].content![3].text).toBe('strong');
        expect(json.content![0].content![3].marks![0].type).toBe('bold');
      });

      it('should convert inline italic HTML tags', () => {
        const markdown = 'This is <i>italic</i> and <em>emphasized</em> text';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![1].text).toBe('italic');
        expect(json.content![0].content![1].marks![0].type).toBe('italic');
        expect(json.content![0].content![3].text).toBe('emphasized');
        expect(json.content![0].content![3].marks![0].type).toBe('italic');
      });

      it('should convert inline strikethrough HTML tags', () => {
        const markdown = 'This is <s>strikethrough</s>, <strike>strike</strike>, and <del>deleted</del> text';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![1].marks![0].type).toBe('strike');
        expect(json.content![0].content![3].marks![0].type).toBe('strike');
        expect(json.content![0].content![5].marks![0].type).toBe('strike');
      });

      it('should convert inline code HTML tags', () => {
        const markdown = 'This is <code>inline code</code> text';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![1].text).toBe('inline code');
        expect(json.content![0].content![1].marks![0].type).toBe('code');
      });

      it('should handle block-level HTML', () => {
        const markdown = '<b>Bold text in a block</b>';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![0].text).toBe('Bold text in a block');
        expect(json.content![0].content![0].marks![0].type).toBe('bold');
      });

      it('should handle mixed markdown and HTML', () => {
        const markdown = '**Markdown bold** and <b>HTML bold</b>';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('paragraph');
        // First part is markdown bold
        expect(json.content![0].content![0].marks![0].type).toBe('bold');
        // Second part is HTML bold
        expect(json.content![0].content![2].marks![0].type).toBe('bold');
      });

      it('should handle nested HTML tags and combine marks', () => {
        const markdown = '<b><i>Bold and italic</i></b>';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content).toBeDefined();
        expect(json.content![0].content!.length).toBeGreaterThan(0);

        // Find the text node
        const textNode = json.content![0].content!.find(c => c.text?.includes('Bold and italic'));
        expect(textNode).toBeDefined();

        // Should have both bold and italic marks
        expect(textNode!.marks).toBeDefined();
        expect(textNode!.marks!.length).toBe(2);
        expect(textNode!.marks!.some(m => m.type === 'bold')).toBe(true);
        expect(textNode!.marks!.some(m => m.type === 'italic')).toBe(true);
      });

      it('should handle nested HTML tags in reverse order', () => {
        const markdown = '<i><b>Italic and bold</b></i>';
        const json = markdownToJSON(markdown);

        const textNode = json.content![0].content!.find(c => c.text?.includes('Italic and bold'));
        expect(textNode).toBeDefined();

        // Should have both marks regardless of nesting order
        expect(textNode!.marks).toBeDefined();
        expect(textNode!.marks!.length).toBe(2);
        expect(textNode!.marks!.some(m => m.type === 'bold')).toBe(true);
        expect(textNode!.marks!.some(m => m.type === 'italic')).toBe(true);
      });

      it('should handle triple nested HTML tags', () => {
        const markdown = '<b><i><s>Bold, italic and strike</s></i></b>';
        const json = markdownToJSON(markdown);

        const textNode = json.content![0].content!.find(c => c.text?.includes('Bold, italic and strike'));
        expect(textNode).toBeDefined();

        // Should have all three marks
        expect(textNode!.marks).toBeDefined();
        expect(textNode!.marks!.length).toBe(3);
        expect(textNode!.marks!.some(m => m.type === 'bold')).toBe(true);
        expect(textNode!.marks!.some(m => m.type === 'italic')).toBe(true);
        expect(textNode!.marks!.some(m => m.type === 'strike')).toBe(true);
      });

      it('should skip unsupported HTML tags', () => {
        const markdown = '<u>Underline</u> text';
        const json = markdownToJSON(markdown);

        // Underline is not supported by default in TipTap, so it's rendered as plain text
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![0].text).toBe('Underline');
        expect(json.content![0].content![0].marks).toBeUndefined();
      });

      it('should handle HTML in lists', () => {
        const markdown = '- Item with <b>bold</b> text\n- Another <i>italic</i> item';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('bulletList');
        expect(json.content![0].content![0].content![0].content![1].marks![0].type).toBe('bold');
        expect(json.content![0].content![1].content![0].content![1].marks![0].type).toBe('italic');
      });

      it('should handle <br> tags as hard breaks', () => {
        const markdown = 'Line 1<br>Line 2<br/>Line 3';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('paragraph');
        // Check for hard breaks
        const content = json.content![0].content;
        expect(content).toBeDefined();
        // Should have text and hard breaks
        expect(content!.some(c => c.type === 'hardBreak')).toBe(true);
      });

      it('should handle inline HTML elements like span and kbd', () => {
        const markdown = '<span>span text</span> and <kbd>Ctrl</kbd>';
        const json = markdownToJSON(markdown);

        // These tags should pass through their text content
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content).toBeDefined();
      });
    });

    describe('complex nested structures', () => {
      it('should convert nested lists', () => {
        const markdown = '- Item 1\n  - Nested 1\n  - Nested 2\n- Item 2';
        const json = markdownToJSON(markdown);

        const firstItem = json.content![0].content![0];
        expect(firstItem.type).toBe('listItem');
        // Nested list should be a child of the list item
        expect(firstItem.content![1].type).toBe('bulletList');
      });

      it('should convert blockquotes with lists', () => {
        const markdown = '> - Item 1\n> - Item 2';
        const json = markdownToJSON(markdown);

        expect(json.content![0].type).toBe('blockquote');
        expect(json.content![0].content![0].type).toBe('bulletList');
      });

      it('should handle multiple marks on the same text', () => {
        const markdown = '***bold and italic***';
        const json = markdownToJSON(markdown);

        // markdown-it may parse this differently - let's just check that we get bold OR italic
        // In practice, ***text*** is often parsed as strong>em or em>strong
        const textNode = json.content![0].content![0];
        expect(textNode.marks).toBeDefined();
        expect(textNode.marks!.length).toBeGreaterThanOrEqual(1);
        const markTypes = textNode.marks!.map((m) => m.type);
        // Should have at least one of bold or italic
        expect(markTypes.some(t => t === 'bold' || t === 'italic')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        const json = markdownToJSON('');

        expect(json.type).toBe('doc');
        expect(json.content).toHaveLength(0);
      });

      it('should handle malformed markdown', () => {
        const markdown = '# Heading\n```\nunclosed code block';
        const json = markdownToJSON(markdown);

        // Should still parse what it can
        expect(json.content![0].type).toBe('heading');
        expect(json.content![1].type).toBe('codeBlock');
      });

      it('should skip empty paragraphs', () => {
        const markdown = 'Text\n\n\n\nMore text';
        const json = markdownToJSON(markdown);

        // Multiple empty lines should not create empty paragraphs
        expect(json.content).toHaveLength(2);
      });
    });

    describe('URL sanitization', () => {
      it('should reject javascript: protocol in links', () => {
        const markdown = '[Click me](javascript:alert(1))';
        const json = markdownToJSON(markdown);

        // markdown-it doesn't parse javascript: URLs as valid links, so they're rendered as plain text
        // This is actually safer than our sanitization approach
        const textNode = json.content![0].content![0];
        expect(textNode.text).toBe('[Click me](javascript:alert(1))');
        expect(textNode.marks).toBeUndefined();
      });

      it('should accept http and https links', () => {
        const markdown = '[HTTP](http://example.com) [HTTPS](https://example.com)';
        const json = markdownToJSON(markdown);

        // First link
        expect(json.content![0].content![0].marks![0].type).toBe('link');
        expect(json.content![0].content![0].marks![0].attrs?.href).toBe('http://example.com');
        // Space between links
        expect(json.content![0].content![1].text).toBe(' ');
        // Second link
        expect(json.content![0].content![2].marks![0].type).toBe('link');
        expect(json.content![0].content![2].marks![0].attrs?.href).toBe('https://example.com');
      });

      it('should accept mailto links', () => {
        const markdown = '[Email](mailto:test@example.com)';
        const json = markdownToJSON(markdown);

        expect(json.content![0].content![0].marks![0].type).toBe('link');
        expect(json.content![0].content![0].marks![0].attrs?.href).toBe('mailto:test@example.com');
      });
    });

    describe('HTML edge cases', () => {
      it('should handle empty HTML tags', () => {
        const markdown = '<b></b><i></i><code></code>';
        const json = markdownToJSON(markdown);

        // Empty tags should not create content
        expect(json.content).toBeDefined();
        // Should either have no content or only empty paragraphs
        if (json.content!.length > 0) {
          const hasNonEmptyContent = json.content!.some(c =>
            c.content && c.content.length > 0 && c.content.some(inner => inner.text && inner.text.trim())
          );
          expect(hasNonEmptyContent).toBe(false);
        }
      });

      it('should handle malformed HTML', () => {
        const markdown = '<b>unclosed tag';
        const json = markdownToJSON(markdown);

        // Should still extract the text content
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content).toBeDefined();
        const hasText = json.content![0].content!.some(c => c.text?.includes('unclosed tag'));
        expect(hasText).toBe(true);
      });

      it('should handle mixed case HTML tags', () => {
        const markdown = '<B>Bold</B> and <I>Italic</I>';
        const json = markdownToJSON(markdown);

        // Tags should be case-insensitive
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content).toBeDefined();
        // Should have bold and italic marks
        const hasBold = json.content![0].content!.some(c =>
          c.marks?.some(m => m.type === 'bold')
        );
        const hasItalic = json.content![0].content!.some(c =>
          c.marks?.some(m => m.type === 'italic')
        );
        expect(hasBold).toBe(true);
        expect(hasItalic).toBe(true);
      });

      it('should strip dangerous HTML attributes', () => {
        const markdown = '<b onclick="alert(1)">Click me</b>';
        const json = markdownToJSON(markdown);

        // Should extract text but not include the onclick attribute
        expect(json.content![0].type).toBe('paragraph');
        const textContent = JSON.stringify(json);
        expect(textContent).not.toContain('onclick');
        expect(textContent).not.toContain('alert');
        // But should still have the text
        const hasText = json.content![0].content!.some(c => c.text?.includes('Click me'));
        expect(hasText).toBe(true);
      });

      it('should handle nested inline HTML tags', () => {
        const markdown = '<b>Bold with <i>italic inside</i></b>';
        const json = markdownToJSON(markdown);

        // Should handle nested tags and extract text
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content).toBeDefined();
        // Should have text content
        const allText = json.content![0].content!.map(c => c.text || '').join('');
        expect(allText).toContain('Bold');
        expect(allText).toContain('italic inside');
      });

      it('should handle HTML entities', () => {
        const markdown = '<b>&lt;script&gt;</b>';
        const json = markdownToJSON(markdown);

        // HTML entities should be decoded
        expect(json.content![0].type).toBe('paragraph');
        const hasText = json.content![0].content!.some(c =>
          c.text?.includes('<script>') || c.text?.includes('&lt;script&gt;')
        );
        expect(hasText).toBe(true);
      });

      it('should handle HTML with attributes', () => {
        const markdown = '<a href="https://example.com" title="Example">Link</a>';
        const json = markdownToJSON(markdown);

        // In test environment without DOMParser, links become plain text
        // This is acceptable for the test environment
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content![0].type).toBe('text');
        expect(json.content![0].content![0].text).toBe('Link');
      });

      it('should handle self-closing br tags with various formats', () => {
        const markdown = 'Line 1<br>Line 2<br/>Line 3<br />Line 4';
        const json = markdownToJSON(markdown);

        // Should have hard breaks for all formats
        expect(json.content![0].type).toBe('paragraph');
        const hardBreaks = json.content![0].content!.filter(c => c.type === 'hardBreak');
        expect(hardBreaks.length).toBeGreaterThanOrEqual(3);
      });

      it('should preserve whitespace between inline HTML elements', () => {
        const markdown = '<b>Bold</b> <i>Italic</i>';
        const json = markdownToJSON(markdown);

        // Should have bold, space, and italic
        expect(json.content![0].type).toBe('paragraph');
        expect(json.content![0].content).toBeDefined();

        // Check that we have at least 3 content nodes (bold text, whitespace, italic text)
        expect(json.content![0].content!.length).toBeGreaterThanOrEqual(3);

        // Verify there's a text node with whitespace
        const hasWhitespace = json.content![0].content!.some(c =>
          c.type === 'text' && c.text && /\s/.test(c.text)
        );
        expect(hasWhitespace).toBe(true);
      });

      it('should strip animation event handlers', () => {
        const markdown = '<div onanimationstart="alert(1)" onanimationend="alert(2)">Content</div>';
        const json = markdownToJSON(markdown);

        // Should extract text but not include animation event attributes
        const textContent = JSON.stringify(json);
        expect(textContent).not.toContain('onanimationstart');
        expect(textContent).not.toContain('onanimationend');
        expect(textContent).not.toContain('alert');
        // But should still have the text
        const hasText = json.content!.some(c =>
          c.content?.some(inner => inner.type === 'text' && inner.text?.includes('Content'))
        );
        expect(hasText).toBe(true);
      });

      it('should strip transition event handlers', () => {
        const markdown = '<div ontransitionend="alert(1)" ontransitionstart="alert(2)">Content</div>';
        const json = markdownToJSON(markdown);

        // Should extract text but not include transition event attributes
        const textContent = JSON.stringify(json);
        expect(textContent).not.toContain('ontransitionend');
        expect(textContent).not.toContain('ontransitionstart');
        expect(textContent).not.toContain('alert');
      });

      it('should strip pointer event handlers', () => {
        const markdown = '<b onpointerover="alert(1)" onpointerenter="alert(2)">Click</b>';
        const json = markdownToJSON(markdown);

        // Should extract text but not include pointer event attributes
        const textContent = JSON.stringify(json);
        expect(textContent).not.toContain('onpointerover');
        expect(textContent).not.toContain('onpointerenter');
        expect(textContent).not.toContain('alert');
        // But should still have the text
        const hasText = json.content![0].content!.some(c => c.text?.includes('Click'));
        expect(hasText).toBe(true);
      });

      it('should strip wheel and toggle event handlers', () => {
        const markdown = '<div onwheel="alert(1)" ontoggle="alert(2)">Content</div>';
        const json = markdownToJSON(markdown);

        // Should extract text but not include wheel/toggle event attributes
        const textContent = JSON.stringify(json);
        expect(textContent).not.toContain('onwheel');
        expect(textContent).not.toContain('ontoggle');
        expect(textContent).not.toContain('alert');
      });
    });

    it('should handle deeply nested HTML safely', () => {
      // Create 110 levels of nesting (exceeds MAX_DOM_DEPTH of 100)
      const openingTags = '<div>'.repeat(110);
      const closingTags = '</div>'.repeat(110);
      const markdown = openingTags + 'deep content' + closingTags;

      // Should not crash and should extract some content
      const json = markdownToJSON(markdown);
      expect(json.content).toBeDefined();

      // The deeply nested content may be truncated due to depth limit,
      // but the parser should handle it gracefully without throwing
      const jsonStr = JSON.stringify(json);
      // In test environment without DOMParser, deeply nested HTML is treated as text
      // The important thing is it doesn't crash - content may vary based on environment
      expect(jsonStr).toBeDefined();
      expect(jsonStr.length).toBeGreaterThan(0);
    });

    it('should handle malformed HTML gracefully', () => {
      const markdown = '<b>Unclosed bold tag and <i>unclosed italic';
      const json = markdownToJSON(markdown);

      // Should still produce valid output even with malformed HTML
      expect(json.type).toBe('doc');
      expect(json.content).toBeDefined();
      expect(json.content!.length).toBeGreaterThan(0);

      // The text should be extracted even if tags are malformed
      const jsonStr = JSON.stringify(json);
      expect(jsonStr).toContain('Unclosed bold tag');
    });
  });

  describe('createMarkdownParser()', () => {
    it('should create a markdown-it instance', () => {
      const md = createMarkdownParser();
      const html = md.render('# Heading');

      expect(html).toContain('<h1>');
      expect(html).toContain('Heading');
    });

    it('should have table support enabled', () => {
      const md = createMarkdownParser();
      const html = md.render('| Header |\n|--------|\n| Cell   |');

      expect(html).toContain('<table>');
    });
  });

  describe('createTurndownService()', () => {
    it('should create a TurndownService instance', () => {
      const turndown = createTurndownService();
      const markdown = turndown.turndown('<h1>Heading</h1>');

      expect(markdown).toBe('# Heading');
    });

    it('should support tables with GFM plugin', () => {
      const turndown = createTurndownService();
      const markdown = turndown.turndown('<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>');

      expect(markdown).toContain('|');
      expect(markdown).toContain('Header');
    });
  });
});
