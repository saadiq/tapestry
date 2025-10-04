import { useEffect, useRef } from 'react';
import { useEditor as useTipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import MarkdownIt from 'markdown-it';
import TurndownService from 'turndown';

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
  const md = useRef(new MarkdownIt('commonmark', { html: false, breaks: true }));
  const turndown = useRef(new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  }));

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
      const html = md.current.render(content);

      // Set content in editor
      editor.commands.setContent(html, false);
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
