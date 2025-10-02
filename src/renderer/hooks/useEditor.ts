import { useEditor as useTipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

interface UseEditorOptions {
  content?: string;
  onUpdate?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export const useEditor = ({
  content = '',
  onUpdate,
  placeholder = 'Start typing your document...',
  editable = true,
}: UseEditorOptions = {}) => {
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
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        const markdown = editor.getHTML();
        onUpdate(markdown);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-full p-8',
      },
    },
  });

  return editor;
};
