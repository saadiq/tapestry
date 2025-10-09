import { useEffect, useRef, useState } from 'react';
import { MarkdownGuide } from './MarkdownGuide';

interface MarkdownEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export const MarkdownEditor = ({
  content,
  onUpdate,
  placeholder = 'Start typing your document...',
  editable = true,
}: MarkdownEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(content);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Track whether content change is from external source or user typing
  // This prevents cursor jumps when external updates come in during typing
  const isExternalChangeRef = useRef(true);

  // Store current localContent in ref to avoid stale closures in effect
  const localContentRef = useRef(localContent);
  localContentRef.current = localContent;

  // Sync external content changes to local state
  // Only update if this is an external change AND content actually differs
  useEffect(() => {
    if (isExternalChangeRef.current && content !== localContentRef.current) {
      setLocalContent(content);
    }
    // Reset flag after each content prop change
    isExternalChangeRef.current = true;
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Mark this as a user-initiated change to prevent external updates from overwriting
    isExternalChangeRef.current = false;
    const newValue = e.target.value;
    setLocalContent(newValue);
    // Send raw markdown exactly as typed - no normalization
    onUpdate(newValue);
  };

  return (
    <div className="relative w-full h-full">
      <textarea
        ref={textareaRef}
        className="markdown-editor"
        value={localContent}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={!editable}
        spellCheck="false"
        aria-label={placeholder}
        tabIndex={0}
      />

      {/* Markdown Guide Link */}
      <button
        onClick={() => setIsGuideOpen(true)}
        className="absolute bottom-4 right-4 text-sm link link-primary"
      >
        Markdown Guide
      </button>

      {/* Markdown Guide Modal */}
      <MarkdownGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
