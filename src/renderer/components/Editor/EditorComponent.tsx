import { useEffect, useRef, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useEditor } from '../../hooks/useEditor';
import { EditorToolbar } from './EditorToolbar';
import { LinkPopover } from './LinkPopover';
import { MarkdownEditor } from './MarkdownEditor';
import { markdownToJSON, createMarkdownParser, createTurndownService } from '../../utils/markdown';
import type { ViewMode } from '@shared/types/editor';

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

  // Use ref to avoid race conditions in keyboard shortcuts during rapid view switching
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  // Track previous view mode to detect transitions
  const prevViewModeRef = useRef(viewMode);

  // Track previous content to avoid unnecessary syncs
  const prevContentRef = useRef(content);

  const editor = useEditor({
    content,
    onUpdate,
    // Don't use onContentLoaded - we'll handle normalization ourselves based on view mode
    onContentLoaded: undefined,
    placeholder,
    editable,
    // Force toolbar re-render on selection changes
    onSelectionUpdate: () => forceUpdate({}),
  });

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('editor-view-mode', viewMode);
  }, [viewMode]);

  // Sync content when in WYSIWYG mode or switching to it
  // This ensures that changes made in markdown mode are immediately reflected in WYSIWYG mode
  // Only syncs on actual view mode transitions or content changes to prevent infinite loops
  useEffect(() => {
    const isViewModeTransition = viewMode === 'wysiwyg' && prevViewModeRef.current === 'markdown';
    const hasContentChanged = content !== prevContentRef.current;
    const isInitialLoad = prevViewModeRef.current === viewMode && !prevContentRef.current && content;

    if (editor && content && (isViewModeTransition || isInitialLoad || (viewMode === 'wysiwyg' && hasContentChanged))) {
      // When switching from markdown to WYSIWYG or on initial load in WYSIWYG mode, normalize the content first
      // This ensures consistent formatting for TipTap
      let contentToConvert = content;
      if ((isViewModeTransition || (isInitialLoad && viewMode === 'wysiwyg')) && onUpdate && onContentLoaded) {
        try {
          const md = createMarkdownParser();
          const turndown = createTurndownService();
          const html = md.render(content);
          const normalizedMarkdown = turndown.turndown(html);
          // Update the normalized content back to the parent
          if (normalizedMarkdown !== content) {
            // Call onContentLoaded to update the original content (prevents dirty state)
            onContentLoaded(normalizedMarkdown);
            contentToConvert = normalizedMarkdown;
          }
        } catch (error) {
          console.error('Failed to normalize markdown content during view mode switch:', error);
        }
      }

      // Convert markdown to TipTap JSON and set in editor
      const json = markdownToJSON(contentToConvert);
      editor.commands.setContent(json);
    }

    prevViewModeRef.current = viewMode;
    prevContentRef.current = content;
  }, [viewMode, editor, content, onUpdate, onContentLoaded]);

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'wysiwyg' ? 'markdown' : 'wysiwyg'));
  };

  // Set up keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle WYSIWYG shortcuts when in WYSIWYG mode (use ref to avoid stale closures)
      if (viewModeRef.current !== 'wysiwyg') return;

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
  }, [editor]);

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
            onUpdate={onUpdate || (() => { /* noop */ })}
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
