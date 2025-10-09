import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Hash,
} from 'lucide-react';
import type { ViewMode } from '@shared/types/editor';

interface EditorToolbarProps {
  editor: Editor | null;
  viewMode?: ViewMode;
  onToggleViewMode?: () => void;
}

export const EditorToolbar = ({
  editor,
  viewMode = 'wysiwyg',
  onToggleViewMode,
}: EditorToolbarProps) => {
  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    active = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="border-b border-base-300 bg-base-100 p-2 flex-shrink-0">
      <div className="flex flex-wrap gap-1 items-center justify-between">
        <div className="flex flex-wrap gap-1">
        {/* Undo/Redo */}
        <div className="join">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Cmd+Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="divider divider-horizontal mx-0"></div>

        {/* Text Formatting */}
        <div className="join">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Cmd+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (Cmd+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="divider divider-horizontal mx-0"></div>

        {/* Headings */}
        <div className="join">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="divider divider-horizontal mx-0"></div>

        {/* Lists */}
        <div className="join">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </div>

        </div>

        {/* View Mode Toggle */}
        {onToggleViewMode && (
          <ToolbarButton
            onClick={onToggleViewMode}
            active={viewMode === 'markdown'}
            title={viewMode === 'wysiwyg' ? 'Switch to Markdown' : 'Switch to WYSIWYG'}
          >
            <Hash className="h-4 w-4" />
          </ToolbarButton>
        )}
      </div>
    </div>
  );
};
