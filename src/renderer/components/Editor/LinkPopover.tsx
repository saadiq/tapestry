import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react';

interface LinkPopoverProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LinkPopover = ({ editor, isOpen, onClose }: LinkPopoverProps) => {
  const [url, setUrl] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Get current link URL if cursor is on a link
  useEffect(() => {
    if (!editor || !isOpen) return;

    const linkAttrs = editor.getAttributes('link');
    setUrl(linkAttrs.href || '');
  }, [editor, isOpen]);

  // Calculate position based on selection
  useEffect(() => {
    if (!editor || !isOpen) return;

    const { from } = editor.state.selection;
    const domNode = editor.view.domAtPos(from);
    const rect = (domNode.node as Element).getBoundingClientRect?.() ||
                 editor.view.dom.getBoundingClientRect();

    // Position popover below the selection
    setPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
    });

    // Focus input after a short delay to ensure it's rendered
    setTimeout(() => inputRef.current?.focus(), 50);
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

  const currentLink = editor.getAttributes('link').href;

  const handleSetLink = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      return;
    }

    // Add protocol if missing
    let finalUrl = url.trim();
    if (!finalUrl.match(/^https?:\/\//i) && !finalUrl.match(/^mailto:/i)) {
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

  const handleOpenLink = () => {
    if (currentLink) {
      window.electronAPI.openExternal(currentLink);
    }
  };

  return (
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
    </div>
  );
};
