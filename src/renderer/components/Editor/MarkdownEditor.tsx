import { useEffect, useRef, useState } from 'react';

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

  // Sync external content changes to local state
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalContent(newValue);
    // Send raw markdown exactly as typed - no normalization
    onUpdate(newValue);
  };

  return (
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
  );
};
