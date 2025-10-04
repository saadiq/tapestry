import { useEffect, useRef, useState } from 'react';
import { createMarkdownParser, createTurndownService } from '../../utils/markdown';

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

  // Create stable references to markdown-it and turndown for normalization
  const md = useRef(createMarkdownParser());
  const turndown = useRef(createTurndownService());

  // Sync external content changes to local state
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalContent(newValue);
    // Send raw markdown immediately for responsive typing
    onUpdate(newValue);
  };

  const handleBlur = () => {
    // Normalize content through markdown-it/turndown pipeline on blur
    // This ensures consistency with WYSIWYG mode while maintaining typing performance
    try {
      const html = md.current.render(localContent);
      const normalizedMarkdown = turndown.current.turndown(html);
      // Only update if normalization changed the content
      if (normalizedMarkdown !== localContent) {
        onUpdate(normalizedMarkdown);
        setLocalContent(normalizedMarkdown);
      }
    } catch (error) {
      console.error('Failed to normalize markdown content:', error);
      // Keep current content on error
    }
  };

  return (
    <textarea
      ref={textareaRef}
      className="markdown-editor"
      value={localContent}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      readOnly={!editable}
      spellCheck="false"
      aria-label={placeholder}
      tabIndex={0}
    />
  );
};
