import { useEffect, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useEditor } from '../../hooks/useEditor';
import { EditorToolbar } from './EditorToolbar';
import { LinkPopover } from './LinkPopover';
import { MarkdownEditor } from './MarkdownEditor';

type ViewMode = 'wysiwyg' | 'markdown';

interface EditorComponentProps {
  content?: string;
  onUpdate?: (content: string) => void;
  onContentLoaded?: (convertedContent: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export const EditorComponent = ({
  content = '',
  onUpdate,
  onContentLoaded,
  placeholder = 'Start typing your document...',
  editable = true,
}: EditorComponentProps) => {
  const [, forceUpdate] = useState({});
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('editor-view-mode');
    return (saved === 'markdown' ? 'markdown' : 'wysiwyg') as ViewMode;
  });

  const editor = useEditor({
    content,
    onUpdate,
    onContentLoaded,
    placeholder,
    editable,
    // Force toolbar re-render on selection changes
    onSelectionUpdate: () => forceUpdate({}),
  });

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('editor-view-mode', viewMode);
  }, [viewMode]);

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'wysiwyg' ? 'markdown' : 'wysiwyg'));
  };

  // Set up keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle WYSIWYG shortcuts when in WYSIWYG mode
      if (viewMode !== 'wysiwyg') return;

      // Cmd/Ctrl + K for link popover
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsLinkPopoverOpen(true);
      }

      // Cmd/Ctrl + E for inline code (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        editor.chain().focus().toggleCode().run();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, viewMode]);

  return (
    <div className="flex h-full flex-col bg-base-100">
      <EditorToolbar
        editor={editor}
        onOpenLinkPopover={() => setIsLinkPopoverOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={toggleViewMode}
      />
      <div className="flex-1 overflow-auto">
        {viewMode === 'wysiwyg' ? (
          <EditorContent editor={editor} />
        ) : (
          <MarkdownEditor
            content={content}
            onUpdate={onUpdate || (() => {})}
            placeholder={placeholder}
            editable={editable}
          />
        )}
      </div>
      <LinkPopover
        editor={editor}
        isOpen={isLinkPopoverOpen}
        onClose={() => setIsLinkPopoverOpen(false)}
      />
    </div>
  );
};
