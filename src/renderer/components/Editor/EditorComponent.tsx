import { EditorContent } from '@tiptap/react';
import { useEditor } from '../../hooks/useEditor';
import { EditorToolbar } from './EditorToolbar';
import { useEffect } from 'react';

interface EditorComponentProps {
  content?: string;
  onUpdate?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export const EditorComponent = ({
  content = '',
  onUpdate,
  placeholder = 'Start typing your document...',
  editable = true,
}: EditorComponentProps) => {
  const editor = useEditor({
    content,
    onUpdate,
    placeholder,
    editable,
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Set up keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for link
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const url = window.prompt('Enter URL:');
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      }

      // Cmd/Ctrl + E for inline code (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        editor.chain().focus().toggleCode().run();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  return (
    <div className="flex h-full flex-col bg-base-100">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};
