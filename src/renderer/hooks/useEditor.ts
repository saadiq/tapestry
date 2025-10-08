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
import { markdownToJSON, createTurndownService } from '../utils/markdown';

/**
 * Create a shared lowlight instance with common languages
 * This is defined at module scope to be shared across all editor instances
 * and avoid recreating it on every hook call
 *
 * Note: Using 'common' provides a reasonable balance between features and bundle size
 * Includes: JavaScript, TypeScript, Python, XML/HTML, CSS, Markdown, Bash, JSON, and more
 */
const sharedLowlight = createLowlight(common);

interface UseEditorOptions {
  content?: string;
  onUpdate?: (content: string) => void;
  onContentLoaded?: (convertedContent: string) => void;
  onSelectionUpdate?: () => void;
  placeholder?: string;
  editable?: boolean;
}

/**
 * Simple string hash function (DJB2 algorithm)
 * Used to quickly compare content without string comparisons
 * Exported for use in other components to avoid unnecessary re-renders
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
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
  const lastContentHashRef = useRef(0);
  const isSettingContentRef = useRef(false);
  const turndown = useRef(createTurndownService());

  // Stable reference to onContentLoaded callback
  const onContentLoadedRef = useRef(onContentLoaded);
  useEffect(() => {
    onContentLoadedRef.current = onContentLoaded;
  }, [onContentLoaded]);

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
        lowlight: sharedLowlight,
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
        tableRow: {},
        tableCell: {},
        tableHeader: {},
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

    // Avoid updating if content hasn't changed (use hash for performance)
    const contentHash = hashString(content);
    if (contentHash === lastContentHashRef.current) {
      return;
    }

    try {
      // Set flag to prevent onUpdate from firing during programmatic setContent
      isSettingContentRef.current = true;

      // Convert markdown to TipTap JSON (bypasses HTML → DOM parser → TipTap pipeline)
      // Note: We can't use useMemo here because we're inside useEffect,
      // but the hash comparison above provides similar optimization
      const json = markdownToJSON(content);

      // Set content in editor using JSON format
      editor.commands.setContent(json, {
        emitUpdate: false,
      });

      // Get the converted markdown after round-trip to use as baseline for dirty checking
      const convertedHtml = editor.getHTML();
      const convertedMarkdown = turndown.current.turndown(convertedHtml);

      // Store the CONVERTED markdown (not original) to prevent infinite loop
      // When parent receives convertedMarkdown via onContentLoaded and passes it back,
      // we need to recognize it as the same content
      lastContentRef.current = convertedMarkdown;
      lastContentHashRef.current = hashString(convertedMarkdown);

      // Notify parent of the converted content so it can update originalContent
      if (onContentLoadedRef.current) {
        onContentLoadedRef.current(convertedMarkdown);
      }

      // Reset flag after a short delay to ensure all events have processed
      setTimeout(() => {
        isSettingContentRef.current = false;
      }, 0);
    } catch (error) {
      console.error('Failed to parse markdown content:', error);
      // Fallback: set as plain text
      editor.commands.setContent(content, { emitUpdate: false });
      lastContentRef.current = content;
      lastContentHashRef.current = contentHash;

      // Reset flag on error too
      setTimeout(() => {
        isSettingContentRef.current = false;
      }, 0);
    }
  }, [content, editor]);

  return editor;
};
