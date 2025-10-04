import { useEffect, useRef } from 'react';

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

  // Update textarea when content changes externally
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== content) {
      textareaRef.current.value = content;
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(e.target.value);
  };

  return (
    <textarea
      ref={textareaRef}
      className="markdown-editor"
      defaultValue={content}
      onChange={handleChange}
      placeholder={placeholder}
      readOnly={!editable}
      spellCheck="false"
    />
  );
};
