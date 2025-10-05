import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useEditor } from '../../hooks/useEditor';
import { EditorToolbar } from './EditorToolbar';
import { LinkPopover } from './LinkPopover';
import { MarkdownEditor } from './MarkdownEditor';
import { markdownToJSON } from '../../utils/markdown';
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

  // Track if user has made edits in WYSIWYG mode (reset when content changes from parent)
  const hasWysiwygEditsRef = useRef(false);

  // Store raw (unnormalized) content for restoration when switching back to markdown
  const rawContentRef = useRef(content);

  // Track if content change was self-triggered (from normalization) to avoid overwriting rawContentRef
  const selfTriggeredChangeRef = useRef(false);

  // Create stable callback refs to avoid dependency issues
  const onUpdateRef = useRef(onUpdate);
  const onContentLoadedRef = useRef(onContentLoaded);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onContentLoadedRef.current = onContentLoaded;
  }, [onUpdate, onContentLoaded]);

  // Create a wrapped onUpdate that tracks WYSIWYG edits
  const wrappedOnUpdate = useCallback((newContent: string) => {
    // Track that user made edits in WYSIWYG mode
    if (viewModeRef.current === 'wysiwyg') {
      hasWysiwygEditsRef.current = true;
    }
    onUpdateRef.current?.(newContent);
  }, []);

  // Create a wrapped onContentLoaded that is conditional on view mode
  const wrappedOnContentLoaded = useCallback((convertedContent: string) => {
    // Only call parent's onContentLoaded when in WYSIWYG mode
    // This allows normalization to happen when needed
    if (viewModeRef.current === 'wysiwyg') {
      // Mark this as a self-triggered change to prevent overwriting rawContentRef
      selfTriggeredChangeRef.current = true;
      onContentLoadedRef.current?.(convertedContent);
    }
  }, []);

  const editor = useEditor({
    content,
    onUpdate: wrappedOnUpdate,
    onContentLoaded: wrappedOnContentLoaded,
    placeholder,
    editable,
    // Force toolbar re-render on selection changes
    onSelectionUpdate: () => forceUpdate({}),
  });

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('editor-view-mode', viewMode);
  }, [viewMode]);

  // Handler for markdown → WYSIWYG transition
  const handleMarkdownToWysiwyg = useCallback(() => {
    if (!editor || !content) return;
    const json = markdownToJSON(content);
    editor.commands.setContent(json);
  }, [editor, content]);

  // Handler for WYSIWYG → markdown transition
  const handleWysiwygToMarkdown = useCallback(() => {
    if (!hasWysiwygEditsRef.current && onUpdateRef.current) {
      // No edits in WYSIWYG - restore raw unnormalized content
      onUpdateRef.current(rawContentRef.current);
    }
    // If there were edits, keep the current content (it's already normalized)
  }, []);

  // Handler for content changes while in WYSIWYG mode
  const handleContentChangeInWysiwyg = useCallback(() => {
    if (!editor || !content) return;
    const json = markdownToJSON(content);
    editor.commands.setContent(json);
  }, [editor, content]);

  // Sync content when switching view modes or when content changes from parent
  useEffect(() => {
    const isViewModeTransition = viewMode !== prevViewModeRef.current;
    const hasContentChanged = content !== prevContentRef.current;

    // When content changes from parent, reset edit tracking and store new raw content
    // ONLY if this is NOT a self-triggered change from normalization
    if (hasContentChanged) {
      hasWysiwygEditsRef.current = false;

      if (!selfTriggeredChangeRef.current) {
        // External content change (file load) - store raw content
        rawContentRef.current = content;
      }

      // Reset the self-triggered flag for next update
      selfTriggeredChangeRef.current = false;
    }

    if (editor && content) {
      // Switching from markdown → WYSIWYG: always sync to editor
      if (viewMode === 'wysiwyg' && prevViewModeRef.current === 'markdown') {
        handleMarkdownToWysiwyg();
      }
      // Switching from WYSIWYG → markdown: restore raw content if no edits were made
      else if (viewMode === 'markdown' && prevViewModeRef.current === 'wysiwyg') {
        handleWysiwygToMarkdown();
      }
      // Content changed while in WYSIWYG mode: sync to editor
      else if (viewMode === 'wysiwyg' && hasContentChanged) {
        handleContentChangeInWysiwyg();
      }
    }

    prevViewModeRef.current = viewMode;
    prevContentRef.current = content;
  }, [viewMode, editor, content, handleMarkdownToWysiwyg, handleWysiwygToMarkdown, handleContentChangeInWysiwyg]);

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
