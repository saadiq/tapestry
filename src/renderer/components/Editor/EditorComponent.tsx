import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useEditor, hashString } from '../../hooks/useEditor';
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

/**
 * EditorComponent - Dual-mode editor with markdown and WYSIWYG views
 *
 * Content Flow & State Management:
 * ================================
 *
 * This component manages complex state transitions between markdown and WYSIWYG modes
 * while preserving user intent and avoiding destructive normalization.
 *
 * Key Refs and Their Purpose:
 * ---------------------------
 * 1. rawContentRef: Stores the original, unnormalized content from file load
 *    - Updated on: External content changes (file loads) that are NOT self-triggered
 *    - Purpose: Allows restoration of original formatting when switching back from WYSIWYG
 *              if user didn't make any edits
 *
 * 2. hasWysiwygEditsRef: Tracks whether user has edited content in WYSIWYG mode
 *    - Set to true: When user types/edits in WYSIWYG mode
 *    - Reset to false: When new content loads from parent (file change)
 *    - Purpose: Determines if we should restore rawContentRef or keep normalized content
 *              when switching from WYSIWYG → markdown
 *
 * 3. selfTriggeredChangeRef: Prevents overwriting rawContentRef during normalization
 *    - Set to true: Before calling onContentLoaded (which normalizes content)
 *    - Reset to false: After processing content change in effect
 *    - Purpose: Distinguishes between external content changes (file loads) and
 *              self-triggered changes (normalization), preventing raw content from
 *              being overwritten by normalized version
 *
 * 4. prevViewModeRef: Tracks previous view mode to detect transitions
 *    - Purpose: Enables detection of markdown → WYSIWYG and WYSIWYG → markdown transitions
 *
 * 5. prevContentRef: Tracks previous content to detect changes
 *    - Purpose: Avoids unnecessary re-rendering and processing when content hasn't changed
 *
 * State Flow Scenarios:
 * --------------------
 *
 * Scenario 1: File Load
 * - content prop changes → hasContentChanged = true
 * - selfTriggeredChangeRef = false (external change)
 * - rawContentRef = new content (stores original)
 * - hasWysiwygEditsRef = false (reset edit tracking)
 * - If in WYSIWYG mode: content displayed via TipTap
 * - If in markdown mode: content displayed as-is
 *
 * Scenario 2: Markdown Mode Editing
 * - User types in MarkdownEditor
 * - onUpdate called with new content
 * - rawContentRef unchanged (already has raw content)
 * - No normalization occurs
 *
 * Scenario 3: Switch Markdown → WYSIWYG (No Prior Edits)
 * - handleMarkdownToWysiwyg() called
 * - Content converted to TipTap JSON via markdownToJSON
 * - wrappedOnContentLoaded may be called by useEditor
 * - selfTriggeredChangeRef = true (prevents rawContentRef overwrite)
 * - Content displayed in WYSIWYG, but rawContentRef preserved
 *
 * Scenario 4: Editing in WYSIWYG Mode
 * - User types in TipTap editor
 * - wrappedOnUpdate called → hasWysiwygEditsRef = true
 * - Content normalized through TipTap HTML → markdown conversion
 * - Edit flag indicates user has modified content
 *
 * Scenario 5: Switch WYSIWYG → Markdown (With Edits)
 * - handleWysiwygToMarkdown() called
 * - hasWysiwygEditsRef = true
 * - Keep current (normalized) content
 * - Do NOT restore rawContentRef
 *
 * Scenario 6: Switch WYSIWYG → Markdown (No Edits)
 * - handleWysiwygToMarkdown() called
 * - hasWysiwygEditsRef = false
 * - Restore rawContentRef via onUpdate
 * - Original formatting preserved
 *
 * Scenario 7: Content Change While in WYSIWYG
 * - content prop changes (e.g., file reload)
 * - hasWysiwygEditsRef reset to false
 * - rawContentRef updated (if not self-triggered)
 * - Content synced to TipTap editor
 *
 * Race Conditions Handled:
 * ------------------------
 * - Rapid view mode switching: viewModeRef ensures keyboard shortcuts use current mode
 * - Echo updates: selfTriggeredChangeRef prevents self-triggered updates from overwriting raw content
 * - Concurrent edits and mode switches: hasWysiwygEditsRef tracks user intent
 *
 * Key Design Decisions:
 * --------------------
 * - Viewing in WYSIWYG is non-destructive (no normalization on view)
 * - Normalization only occurs when user explicitly edits in WYSIWYG mode
 * - Original formatting preserved when possible (no edits in WYSIWYG)
 * - User intent (edits) takes precedence over format preservation
 */
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
  // Standard pattern: update refs on every render (no useEffect needed)
  const onUpdateRef = useRef(onUpdate);
  const onContentLoadedRef = useRef(onContentLoaded);
  onUpdateRef.current = onUpdate;
  onContentLoadedRef.current = onContentLoaded;

  // Ref to track if we're in the middle of a user edit (prevents circular updates)
  const isUserEditingRef = useRef(false);

  // Create a wrapped onUpdate that tracks WYSIWYG edits
  const wrappedOnUpdate = useCallback((newContent: string) => {
    // Track that user made edits in WYSIWYG mode
    if (viewModeRef.current === 'wysiwyg') {
      hasWysiwygEditsRef.current = true;
    }

    // Mark that we're processing a user edit to prevent useEffect from calling setContent
    isUserEditingRef.current = true;
    onUpdateRef.current?.(newContent);
    // Reset flag after a brief delay to allow React state updates to propagate
    setTimeout(() => {
      isUserEditingRef.current = false;
    }, 10);
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

  // Sync content when switching view modes or when content changes from parent
  useEffect(() => {
    const isViewModeTransition = viewMode !== prevViewModeRef.current;
    const hasContentChanged = content !== prevContentRef.current;

    console.log('[EditorComponent] useEffect triggered');
    console.log('[EditorComponent]   isViewModeTransition:', isViewModeTransition);
    console.log('[EditorComponent]   hasContentChanged:', hasContentChanged);
    console.log('[EditorComponent]   viewMode:', viewMode);
    console.log('[EditorComponent]   prevViewMode:', prevViewModeRef.current);
    console.log('[EditorComponent]   content length:', content?.length || 0);
    console.log('[EditorComponent]   prev content length:', prevContentRef.current?.length || 0);

    // When content changes from parent, reset edit tracking and store new raw content
    // ONLY if this is NOT a self-triggered change from normalization
    if (hasContentChanged) {
      console.log('[EditorComponent] Content changed, resetting edit tracking');
      hasWysiwygEditsRef.current = false;

      if (!selfTriggeredChangeRef.current) {
        // External content change (file load) - store raw content
        rawContentRef.current = content;
      }

      // Reset the self-triggered flag for next update
      selfTriggeredChangeRef.current = false;
    }

    // Don't sync content if nothing has changed - prevents cursor jumps from spurious re-renders
    if (!editor || !content || (!isViewModeTransition && !hasContentChanged)) {
      console.log('[EditorComponent] EARLY RETURN - No sync needed');
      console.log('[EditorComponent]   editor:', !!editor);
      console.log('[EditorComponent]   content:', !!content);
      // Update refs even if we skip sync
      prevViewModeRef.current = viewMode;
      prevContentRef.current = content;
      return;
    }

    // Don't sync content back to editor if change came from user typing
    // This prevents circular updates: user types → onUpdate → parent state → useEffect → setContent
    if (isUserEditingRef.current && viewMode === 'wysiwyg' && hasContentChanged) {
      console.log('[EditorComponent] EARLY RETURN - User is editing, skipping setContent');
      // Update refs to track that we processed this content change
      prevViewModeRef.current = viewMode;
      prevContentRef.current = content;
      return;
    }

    console.log('[EditorComponent] Proceeding with content sync...');

    if (editor && content) {
      // Switching from markdown → WYSIWYG: always sync to editor
      if (viewMode === 'wysiwyg' && prevViewModeRef.current === 'markdown') {
        console.log('[EditorComponent] Syncing markdown → WYSIWYG');
        try {
          const json = markdownToJSON(content);
          console.log('[EditorComponent] CALLING setContent (markdown→WYSIWYG)');
          console.trace();
          editor.commands.setContent(json);
        } catch (error) {
          console.error('Failed to convert markdown to JSON:', error);
          // Fallback: set as plain text to prevent complete failure
          console.log('[EditorComponent] CALLING setContent (fallback, markdown→WYSIWYG)');
          console.trace();
          editor.commands.setContent(content);
        }
      }
      // Switching from WYSIWYG → markdown: restore raw content if no edits were made
      else if (viewMode === 'markdown' && prevViewModeRef.current === 'wysiwyg') {
        if (!hasWysiwygEditsRef.current && onUpdateRef.current) {
          // No edits in WYSIWYG - restore raw unnormalized content
          onUpdateRef.current(rawContentRef.current);
        }
        // If there were edits, keep the current content (it's already normalized)
      }
      // Content changed while in WYSIWYG mode: sync to editor
      else if (viewMode === 'wysiwyg' && hasContentChanged) {
        console.log('[EditorComponent] Content changed in WYSIWYG mode');
        // Check if editor's current content already matches new content to avoid cursor jumps
        // This happens during auto-save when originalContent is updated but content hasn't changed
        const currentEditorMarkdown = editor.storage.markdown?.getMarkdown?.() || editor.getHTML();
        const currentHash = hashString(currentEditorMarkdown);
        const newHash = hashString(content);

        console.log('[EditorComponent]   Current editor hash:', currentHash);
        console.log('[EditorComponent]   New content hash:', newHash);

        // Only call setContent if content is actually different
        if (currentHash !== newHash) {
          console.log('[EditorComponent] Hashes differ, syncing editor content');
          try {
            const json = markdownToJSON(content);
            console.log('[EditorComponent] CALLING setContent (WYSIWYG content change)');
            console.trace();
            editor.commands.setContent(json);
          } catch (error) {
            console.error('Failed to convert markdown to JSON:', error);
            // Fallback: set as plain text to prevent complete failure
            console.log('[EditorComponent] CALLING setContent (fallback, WYSIWYG content change)');
            console.trace();
            editor.commands.setContent(content);
          }
        } else {
          console.log('[EditorComponent] Hashes match, skipping setContent');
        }
      }
    }

    prevViewModeRef.current = viewMode;
    prevContentRef.current = content;
  }, [viewMode, editor, content]);

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
