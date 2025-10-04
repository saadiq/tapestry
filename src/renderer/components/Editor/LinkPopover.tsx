import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react';
import { useToast } from '../Notifications/ToastContainer';

interface LinkPopoverProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

// Constants for magic numbers
const POPOVER_OFFSET = 8;
const FOCUS_DELAY = 50;
const POPOVER_MIN_WIDTH = 320; // 80 * 4 (min-w-80 in Tailwind)
const POPOVER_HEIGHT_ESTIMATE = 200;

export const LinkPopover = ({ editor, isOpen, onClose }: LinkPopoverProps) => {
  const [url, setUrl] = useState('');
  const [currentLink, setCurrentLink] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { showError } = useToast();

  // Get current link URL if cursor is on a link
  useEffect(() => {
    if (!editor || !isOpen) return;

    const linkAttrs = editor.getAttributes('link');
    const href = linkAttrs.href || '';
    setUrl(href);
    setCurrentLink(href);
  }, [editor, isOpen]);

  // Calculate position based on selection with viewport boundary detection and focus management
  useEffect(() => {
    if (!editor || !isOpen) return;

    const { from, to } = editor.state.selection;

    // Get coordinates from TipTap's coordinate system
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);

    // Position popover below the selection with viewport boundary detection
    const topPosition = Math.max(start.bottom, end.bottom) + POPOVER_OFFSET;
    const leftPosition = start.left;

    // Constrain position to viewport bounds (prevent negative positions and off-screen rendering)
    setPosition({
      top: Math.max(0, Math.min(topPosition, window.innerHeight - POPOVER_HEIGHT_ESTIMATE)),
      left: Math.max(0, Math.min(leftPosition, window.innerWidth - POPOVER_MIN_WIDTH)),
    });

    // Focus input after a short delay to ensure it's rendered
    const timeoutId = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY);
    return () => clearTimeout(timeoutId);
  }, [editor, isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!editor || !isOpen) {
    return null;
  }

  const handleSetLink = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      return;
    }

    // Add protocol if missing
    let finalUrl = url.trim();
    if (!/^(https?|mailto):/i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: finalUrl })
      .run();

    onClose();
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
    onClose();
  };

  const handleOpenLink = async () => {
    if (currentLink) {
      const result = await window.electronAPI.openExternal(currentLink);
      if (!result.success) {
        showError(result.error || 'Failed to open link');
      }
    }
  };

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg p-3 min-w-80"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <form onSubmit={handleSetLink} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-base-content/50" />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL..."
            className="input input-sm input-bordered flex-1"
          />
        </div>

        <div className="flex gap-2 justify-end">
          {currentLink && (
            <>
              <button
                type="button"
                onClick={handleOpenLink}
                className="btn btn-sm btn-ghost"
                title="Open link in browser"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRemoveLink}
                className="btn btn-sm btn-ghost text-error"
                title="Remove link"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={!url.trim()}
          >
            {currentLink ? 'Update' : 'Set Link'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};
