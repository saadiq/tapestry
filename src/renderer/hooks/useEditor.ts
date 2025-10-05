import { useEffect, useRef } from 'react';
import { useEditor as useTipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { createMarkdownParser, createTurndownService } from '../utils/markdown';

/**
 * Clean table HTML to make it compatible with TipTap's table schema
 * - Removes colgroup and col elements (TipTap doesn't support them)
 * - Removes thead and tbody wrappers (TipTap doesn't support them - error confirmed)
 * - Removes colspan/rowspan attributes when value is "1"
 * - Ensures all table cells contain <p> tags (TipTap requires block content in cells)
 */
function cleanTableHTML(html: string): string {
  let cleaned = html;

  // Remove colgroup and col elements entirely
  cleaned = cleaned.replace(/<colgroup>[\s\S]*?<\/colgroup>/gi, '');
  cleaned = cleaned.replace(/<col[^>]*>/gi, '');

  // Remove thead and tbody tags but keep their content
  // TipTap error: "Invalid element found: <tbody>" - confirmed these aren't supported
  // Use global flag and handle any whitespace/attributes in the tags
  cleaned = cleaned.replace(/<\/?thead[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/?tbody[^>]*>/gi, '');

  // Remove colspan="1" and rowspan="1" attributes (they're redundant)
  cleaned = cleaned.replace(/\s+colspan="1"/gi, '');
  cleaned = cleaned.replace(/\s+rowspan="1"/gi, '');

  // TipTap requires paragraph tags inside table cells (th/td)
  // Wrap cell content in <p> tags if not already wrapped
  cleaned = cleaned.replace(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, content) => {
    const trimmedContent = content.trim();

    // Skip if already has <p> tag or is empty
    if (!trimmedContent || trimmedContent.startsWith('<p>') || trimmedContent.startsWith('<div>')) {
      return match;
    }

    // Wrap the content in <p> tags, preserving original spacing
    return `<${tag}${attrs}><p>${trimmedContent}</p></${tag}>`;
  });

  return cleaned;
}

interface UseEditorOptions {
  content?: string;
  onUpdate?: (content: string) => void;
  onContentLoaded?: (convertedContent: string) => void;
  onSelectionUpdate?: () => void;
  placeholder?: string;
  editable?: boolean;
}

// Main hook for useEditor
export const useEditor = ({
  content = '',
  onUpdate,
  onContentLoaded,
  onSelectionUpdate,
  placeholder = 'Start typing your document...',
  editable = true,
}: UseEditorOptions = {}) => {
  const lastContentRef = useRef('');
  const isSettingContentRef = useRef(false);
  const md = useRef(createMarkdownParser());
  const turndown = useRef(createTurndownService());

  // Create lowlight instance with common language grammars
  const lowlight = useRef(createLowlight(common));

  const editor = useTipTapEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        codeBlock: false, // Disable StarterKit's CodeBlock to use CodeBlockLowlight
        link: false, // Disable StarterKit's Link to use custom configuration
      }),
      CodeBlockLowlight.configure({
        lowlight: lowlight.current,
        HTMLAttributes: {
          class: 'hljs',
        },
      }),
      Typography,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      TableKit.configure({
        table: {
          resizable: true,
          HTMLAttributes: {
            class: 'table',
          },
        },
      }),
    ],
    content: '',
    editable,
    onUpdate: ({ editor }) => {
      // Skip onUpdate callback if we're programmatically setting content
      if (isSettingContentRef.current) {
        return;
      }

      if (onUpdate) {
        // Get HTML content from editor and convert to markdown
        const html = editor.getHTML();
        const markdown = turndown.current.turndown(html);
        lastContentRef.current = markdown;
        onUpdate(markdown);
      }
    },
    onSelectionUpdate: () => {
      if (onSelectionUpdate) {
        onSelectionUpdate();
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  // Sync external content into the editor
  useEffect(() => {
    if (!editor) {
      return;
    }

    if (content === undefined || content === null) {
      return;
    }

    // Avoid updating if content hasn't changed
    if (content === lastContentRef.current) {
      return;
    }

    try {
      // Set flag to prevent onUpdate from firing during programmatic setContent
      isSettingContentRef.current = true;

      // Convert markdown to HTML using markdown-it
      let html = md.current.render(content);

      // Clean table HTML to remove elements TipTap doesn't support
      html = cleanTableHTML(html);

      // Debug: log ALL tables to see what we're sending to TipTap
      if (html.includes('<table')) {
        const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi);
        console.log(`=== FOUND ${tableMatches?.length || 0} TABLES ===`);
        tableMatches?.forEach((table, i) => {
          console.log(`--- Table ${i + 1} ---`);
          console.log(table);
          console.log('Has tbody?', table.includes('tbody'));
          console.log('Has thead?', table.includes('thead'));
        });
        console.log('=== END TABLES ===');
      }

      // Set content in editor with parseOptions to prevent browser from adding tbody
      try {
        editor.commands.setContent(html, {
          emitUpdate: false,
          errorOnInvalidContent: true,
          parseOptions: {
            preserveWhitespace: 'full',
          },
        });
      } catch (error) {
        console.error('TipTap setContent error:', error);
        console.error('Attempting fallback without tbody/thead tags might help...');
        // The browser DOM parser automatically adds <tbody> to tables even when we remove it
        // This is a known limitation - tables may not work perfectly with markdown-it HTML
        editor.commands.setContent(html, { emitUpdate: false });
      }
      lastContentRef.current = content;

      // Get the converted markdown after round-trip to use as baseline for dirty checking
      const convertedHtml = editor.getHTML();
      const convertedMarkdown = turndown.current.turndown(convertedHtml);

      // Notify parent of the converted content so it can update originalContent
      if (onContentLoaded) {
        onContentLoaded(convertedMarkdown);
      }

      // Reset flag after a short delay to ensure all events have processed
      setTimeout(() => {
        isSettingContentRef.current = false;
      }, 0);
    } catch (error) {
      console.error('Failed to parse markdown content:', error);
      // Fallback: set as plain text
      editor.commands.setContent(content, false);
      lastContentRef.current = content;

      // Reset flag on error too
      setTimeout(() => {
        isSettingContentRef.current = false;
      }, 0);
    }
  }, [content, editor]);

  return editor;
};
