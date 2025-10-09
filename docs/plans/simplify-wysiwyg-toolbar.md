# Implementation Plan: Simplify WYSIWYG Toolbar

## Overview

This plan outlines the steps to simplify the WYSIWYG editor toolbar by removing advanced formatting features and adding a markdown guide for users who need those features in raw markdown mode.

## Goals

1. **Simplify the toolbar** - Keep only essential formatting: undo/redo, bold, italic, headings (H1-H3), and lists
2. **Remove advanced features** - Remove strikethrough, inline code, blockquotes, code blocks, links, and images from toolbar
3. **Disable buttons in markdown mode** - Show toolbar buttons but disable them when viewing raw markdown
4. **Add markdown guide** - Provide a comprehensive markdown syntax reference accessible from markdown mode

## Context for New Developers

### Tech Stack
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **TipTap** - Rich text editor (WYSIWYG mode)
- **Lucide React** - Icon library
- **DaisyUI** - Component library (built on Tailwind CSS)
- **Bun** - Package manager and test runner

### Key Concepts

**Dual-Mode Editor**: The app has two view modes:
- **WYSIWYG mode**: Rich text editing via TipTap (like Google Docs)
- **Markdown mode**: Raw markdown text editing (like Notepad)

**Editor Architecture**:
- `EditorComponent.tsx` - Parent component managing both modes
- `EditorToolbar.tsx` - Formatting buttons (only affects TipTap/WYSIWYG)
- `MarkdownEditor.tsx` - Plain textarea for raw markdown
- `useEditor.ts` - Hook wrapping TipTap editor

**Important**: Toolbar buttons execute TipTap commands which only work in WYSIWYG mode. In markdown mode, users type markdown syntax manually (e.g., `**bold**`).

### Testing Philosophy

This project uses **Bun's test runner** (not Jest or Vitest, despite some imports saying `vitest` for IDE compatibility).

**Test Commands**:
```bash
bun test              # Run all tests
bun test:ui          # Run tests with UI
bun test:coverage    # Run with coverage report
```

**Test Environment**:
- DOM testing uses `@happy-dom/global-registrator`
- `@testing-library/react` for component testing
- Jest-DOM matchers manually extended to bun:test's expect

**Good Test Design**:
1. **Arrange** - Set up component/state
2. **Act** - Trigger user interaction
3. **Assert** - Verify expected outcome
4. Test user-visible behavior, not implementation details
5. Use semantic queries (`getByRole`, `getByLabelText`) over `getByTestId`

### Project Structure
```
src/
├── renderer/
│   ├── components/
│   │   └── Editor/
│   │       ├── EditorComponent.tsx      # Main editor container
│   │       ├── EditorToolbar.tsx        # Formatting toolbar
│   │       ├── MarkdownEditor.tsx       # Raw markdown view
│   │       ├── LinkPopover.tsx          # (to be removed)
│   │       └── useEditor.ts             # TipTap hook
│   └── ...
├── shared/
│   └── types/
│       └── editor.ts                     # Shared types
└── ...
```

## Development Workflow

### Before Starting

**IMPORTANT: Verify Current State First**
Before implementing any tasks, examine the current codebase to verify that the file structure and code matches what's described in this plan. Report any discrepancies before proceeding.

```bash
# Ensure dependencies are installed
bun install

# Start dev server (hot reload enabled)
bun start
```

### During Development
1. Make changes to files
2. Check running app (DevTools open by default)
3. **Write tests as you implement each feature (TDD approach)** - Write test first when possible, then implement to make it pass
4. Run tests: `bun test`
5. Lint: `bun run lint`
6. Commit after each major task with descriptive messages

### Commit Convention
Follow conventional commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code changes without behavior change
- `test:` - Adding/updating tests
- `docs:` - Documentation only

Example: `feat: add markdown guide modal`

### Execution Notes
- **Task Assignment**: Tasks will be assigned individually. Wait for assignment before executing.
- **Commit Frequency**: Commit after each major task as outlined in the plan.
- **Testing Approach**: Create and run tests as you implement each feature (TDD). This catches issues earlier.
- **Manual Testing**: Create manual test checklist files but don't execute manual tests - those will be handled separately.

## Task Breakdown

---

### Task 1: Update EditorToolbar - Remove Unused Imports and Functions

**Objective**: Clean up code by removing imports and functions for features we're removing.

**Files to modify**:
- `src/renderer/components/Editor/EditorToolbar.tsx`

**Steps**:

1. **Remove unused icon imports** (lines 1-18):
   - Keep: `Bold`, `Italic`, `List`, `ListOrdered`, `Heading1`, `Heading2`, `Heading3`, `Undo`, `Redo`
   - Remove: `Strikethrough`, `Code`, `Quote`, `LinkIcon`, `ImageIcon`, `Code2`
   - Add: `Hash` (for view mode toggle)

   **Before**:
   ```typescript
   import {
     Bold,
     Italic,
     Strikethrough,
     Code,
     List,
     ListOrdered,
     Quote,
     Heading1,
     Heading2,
     Heading3,
     Link as LinkIcon,
     Image as ImageIcon,
     Undo,
     Redo,
     Code2,
   } from 'lucide-react';
   ```

   **After**:
   ```typescript
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
   ```

2. **Remove the `addImage` function** (lines 38-43):
   - Delete entire function - we're removing image insertion feature

3. **Remove `onOpenLinkPopover` from props interface** (lines 21-26):

   **Before**:
   ```typescript
   interface EditorToolbarProps {
     editor: Editor | null;
     onOpenLinkPopover: () => void;
     viewMode?: ViewMode;
     onToggleViewMode?: () => void;
   }
   ```

   **After**:
   ```typescript
   interface EditorToolbarProps {
     editor: Editor | null;
     viewMode?: ViewMode;
     onToggleViewMode?: () => void;
   }
   ```

4. **Update component destructuring** (lines 28-33):

   **Before**:
   ```typescript
   export const EditorToolbar = ({
     editor,
     onOpenLinkPopover,
     viewMode = 'wysiwyg',
     onToggleViewMode,
   }: EditorToolbarProps) => {
   ```

   **After**:
   ```typescript
   export const EditorToolbar = ({
     editor,
     viewMode = 'wysiwyg',
     onToggleViewMode,
   }: EditorToolbarProps) => {
   ```

**Testing**:
- No tests needed for this task - just removing unused code
- Verify TypeScript has no errors: `bun run lint`

**Commit**: `refactor: remove unused toolbar icons and functions`

---

### Task 2: Update EditorToolbar - Disable Buttons in Markdown Mode

**Note**: The original Task 2 (Modify ToolbarButton Component) is skipped because the ToolbarButton component already supports the disabled state we need. No changes required.

**Objective**: Make all formatting buttons disabled when in markdown mode, keeping only the view toggle active.

**Files to modify**:
- `src/renderer/components/Editor/EditorToolbar.tsx`

**Steps**:

1. **Understand the requirement**:
   - When `viewMode === 'markdown'`, all formatting buttons should be disabled
   - When `viewMode === 'wysiwyg'`, buttons work normally
   - View toggle button is always enabled

2. **Create a helper variable** at the start of the component body (after the early return check):

   ```typescript
   export const EditorToolbar = ({
     editor,
     viewMode = 'wysiwyg',
     onToggleViewMode,
   }: EditorToolbarProps) => {
     if (!editor) {
       return null;
     }

     // Add this line:
     const isMarkdownMode = viewMode === 'markdown';

     const ToolbarButton = ({ ... }) => { ... };

     return (
       // ... rest of component
     );
   };
   ```

3. **Apply `disabled` prop to all formatting buttons**:
   - Add `disabled={isMarkdownMode || !editor.can().undo()}` to Undo button
   - Add `disabled={isMarkdownMode || !editor.can().redo()}` to Redo button
   - Add `disabled={isMarkdownMode}` to all other formatting buttons (Bold, Italic, Headings, Lists)
   - Do NOT add disabled to the view toggle button

**Example for Undo/Redo** (lines 74-87):

**Before**:
```typescript
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
```

**After**:
```typescript
<ToolbarButton
  onClick={() => editor.chain().focus().undo().run()}
  disabled={isMarkdownMode || !editor.can().undo()}
  title="Undo (Cmd+Z)"
>
  <Undo className="h-4 w-4" />
</ToolbarButton>
<ToolbarButton
  onClick={() => editor.chain().focus().redo().run()}
  disabled={isMarkdownMode || !editor.can().redo()}
  title="Redo (Cmd+Shift+Z)"
>
  <Redo className="h-4 w-4" />
</ToolbarButton>
```

**Example for Bold** (lines 94-100):

**Before**:
```typescript
<ToolbarButton
  onClick={() => editor.chain().focus().toggleBold().run()}
  active={editor.isActive('bold')}
  title="Bold (Cmd+B)"
>
  <Bold className="h-4 w-4" />
</ToolbarButton>
```

**After**:
```typescript
<ToolbarButton
  onClick={() => editor.chain().focus().toggleBold().run()}
  active={editor.isActive('bold')}
  disabled={isMarkdownMode}
  title="Bold (Cmd+B)"
>
  <Bold className="h-4 w-4" />
</ToolbarButton>
```

4. **Apply same pattern to**:
   - Italic button
   - All three Heading buttons (H1, H2, H3)
   - Bullet List button
   - Ordered List button

**Testing**:
```bash
# Manual testing in running app:
1. Start app: bun start
2. Open a markdown file
3. Verify toolbar buttons are enabled in WYSIWYG mode
4. Click view toggle (Hash icon) to switch to markdown mode
5. Verify all formatting buttons appear grayed/disabled
6. Verify view toggle button remains enabled
7. Switch back to WYSIWYG mode
8. Verify buttons are enabled again
```

**Commit**: `feat: disable toolbar buttons in markdown mode`

---

### Task 3: Update EditorToolbar - Remove Button Groups

**Objective**: Remove toolbar button groups for features we no longer support.

**Files to modify**:
- `src/renderer/components/Editor/EditorToolbar.tsx`

**Steps**:

1. **Identify sections to remove** in the return JSX (lines 68-220):
   - Keep: Undo/Redo group
   - Keep: Text Formatting group (but remove strikethrough and inline code buttons)
   - Keep: Headings group
   - Keep: Lists group
   - Keep: View toggle button
   - Remove: Block Elements group (blockquote, code block)
   - Remove: Links & Images group

2. **Remove Strikethrough button** from Text Formatting group (lines 108-114):

   **Before** (lines 93-122):
   ```typescript
   {/* Text Formatting */}
   <div className="join">
     <ToolbarButton
       onClick={() => editor.chain().focus().toggleBold().run()}
       active={editor.isActive('bold')}
       disabled={isMarkdownMode}
       title="Bold (Cmd+B)"
     >
       <Bold className="h-4 w-4" />
     </ToolbarButton>
     <ToolbarButton
       onClick={() => editor.chain().focus().toggleItalic().run()}
       active={editor.isActive('italic')}
       disabled={isMarkdownMode}
       title="Italic (Cmd+I)"
     >
       <Italic className="h-4 w-4" />
     </ToolbarButton>
     <ToolbarButton
       onClick={() => editor.chain().focus().toggleStrike().run()}
       active={editor.isActive('strike')}
       disabled={isMarkdownMode}
       title="Strikethrough"
     >
       <Strikethrough className="h-4 w-4" />
     </ToolbarButton>
     <ToolbarButton
       onClick={() => editor.chain().focus().toggleCode().run()}
       active={editor.isActive('code')}
       disabled={isMarkdownMode}
       title="Inline Code (Cmd+E)"
     >
       <Code className="h-4 w-4" />
     </ToolbarButton>
   </div>
   ```

   **After**:
   ```typescript
   {/* Text Formatting */}
   <div className="join">
     <ToolbarButton
       onClick={() => editor.chain().focus().toggleBold().run()}
       active={editor.isActive('bold')}
       disabled={isMarkdownMode}
       title="Bold (Cmd+B)"
     >
       <Bold className="h-4 w-4" />
     </ToolbarButton>
     <ToolbarButton
       onClick={() => editor.chain().focus().toggleItalic().run()}
       active={editor.isActive('italic')}
       disabled={isMarkdownMode}
       title="Italic (Cmd+I)"
     >
       <Italic className="h-4 w-4" />
     </ToolbarButton>
   </div>
   ```

3. **Keep Headings group unchanged** (already has H1, H2, H3 - exactly what we want)

4. **Keep Lists group unchanged** (already has Bullet and Ordered lists - exactly what we want)

5. **Remove entire Block Elements group** (lines 173-189):
   - Delete the divider before it
   - Delete the entire `<div className="join">` containing Blockquote and Code Block buttons
   - Delete the comment `{/* Block Elements */}`

6. **Remove entire Links & Images group** (lines 193-205):
   - Delete the divider before it
   - Delete the entire `<div className="join">` containing Link and Image buttons
   - Delete the comment `{/* Links & Images */}`

7. **Update View Mode Toggle button** (lines 208-217):
   - Change icon from `Code2` to `Hash`
   - This button should remain outside the main flex wrapper (already is)
   - Should NOT have `disabled={isMarkdownMode}` - it's always enabled

   **Before**:
   ```typescript
   {/* View Mode Toggle */}
   {onToggleViewMode && (
     <ToolbarButton
       onClick={onToggleViewMode}
       active={viewMode === 'markdown'}
       title={viewMode === 'wysiwyg' ? 'Switch to Markdown' : 'Switch to WYSIWYG'}
     >
       <Code2 className="h-4 w-4" />
     </ToolbarButton>
   )}
   ```

   **After**:
   ```typescript
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
   ```

8. **Verify divider count**: Should have exactly 4 dividers total:
   - After Undo/Redo group
   - After Text Formatting group
   - After Headings group
   - After Lists group

**Final structure** should look like:
```typescript
<div className="flex flex-wrap gap-1 items-center justify-between">
  <div className="flex flex-wrap gap-1">
    {/* Undo/Redo */}
    <div className="join">...</div>

    <div className="divider divider-horizontal mx-0"></div>

    {/* Text Formatting */}
    <div className="join">...</div>

    <div className="divider divider-horizontal mx-0"></div>

    {/* Headings */}
    <div className="join">...</div>

    <div className="divider divider-horizontal mx-0"></div>

    {/* Lists */}
    <div className="join">...</div>
  </div>

  {/* View Mode Toggle */}
  {onToggleViewMode && (
    <ToolbarButton ...>
      <Hash className="h-4 w-4" />
    </ToolbarButton>
  )}
</div>
```

**Testing**:
```bash
# Visual verification:
1. Start app: bun start
2. Open a file
3. Count toolbar button groups: should see 4 groups + view toggle
4. Verify no blockquote, code block, link, or image buttons
5. Verify Hash icon on view toggle button
6. Verify proper spacing between groups
```

**Commit**: `refactor: remove advanced formatting buttons from toolbar`

---

### Task 4: Update EditorComponent - Remove LinkPopover

**Objective**: Remove the LinkPopover component and associated state/handlers since we removed the link button.

**Files to modify**:
- `src/renderer/components/Editor/EditorComponent.tsx`

**Steps**:

1. **Remove LinkPopover import** (line 5):

   **Before**:
   ```typescript
   import { EditorContent } from '@tiptap/react';
   import { useEditor, hashString } from '../../hooks/useEditor';
   import { EditorToolbar } from './EditorToolbar';
   import { LinkPopover } from './LinkPopover';
   import { MarkdownEditor } from './MarkdownEditor';
   import { markdownToJSON } from '../../utils/markdown';
   import type { ViewMode } from '@shared/types/editor';
   ```

   **After**:
   ```typescript
   import { EditorContent } from '@tiptap/react';
   import { useEditor, hashString } from '../../hooks/useEditor';
   import { EditorToolbar } from './EditorToolbar';
   import { MarkdownEditor } from './MarkdownEditor';
   import { markdownToJSON } from '../../utils/markdown';
   import type { ViewMode } from '@shared/types/editor';
   ```

2. **Remove `isLinkPopoverOpen` state** (line 122):

   **Before**:
   ```typescript
   const [, forceUpdate] = useState({});
   const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

   // View mode state with localStorage persistence
   ```

   **After**:
   ```typescript
   const [, forceUpdate] = useState({});

   // View mode state with localStorage persistence
   ```

3. **Remove Cmd+K keyboard shortcut** from handleKeyDown (lines 292-296):

   **Before**:
   ```typescript
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
   ```

   **After**:
   ```typescript
   const handleKeyDown = (e: KeyboardEvent) => {
     // Only handle WYSIWYG shortcuts when in WYSIWYG mode (use ref to avoid stale closures)
     if (viewModeRef.current !== 'wysiwyg') return;

     // No shortcuts currently defined
     // This handler can be removed if no shortcuts are needed in the future
   };
   ```

   **Action Required**: Since we removed both shortcuts, **DELETE the entire useEffect that sets up keyboard shortcuts** (lines 285-307). Keeping an empty handler violates YAGNI (You Aren't Gonna Need It). We can always add it back from git history if needed in the future.

4. **Remove `onOpenLinkPopover` prop from EditorToolbar** (line 313):

   **Before**:
   ```typescript
   <EditorToolbar
     editor={editor}
     onOpenLinkPopover={() => setIsLinkPopoverOpen(true)}
     viewMode={viewMode}
     onToggleViewMode={toggleViewMode}
   />
   ```

   **After**:
   ```typescript
   <EditorToolbar
     editor={editor}
     viewMode={viewMode}
     onToggleViewMode={toggleViewMode}
   />
   ```

5. **Remove LinkPopover component** from JSX (lines 329-333):

   **Before**:
   ```typescript
   return (
     <div className="flex h-full flex-col bg-base-100">
       <EditorToolbar ... />
       <div className="flex-1 overflow-auto">
         {viewMode === 'wysiwyg' ? (
           <EditorContent editor={editor} />
         ) : (
           <MarkdownEditor ... />
         )}
       </div>
       <LinkPopover
         editor={editor}
         isOpen={isLinkPopoverOpen}
         onClose={() => setIsLinkPopoverOpen(false)}
       />
     </div>
   );
   ```

   **After**:
   ```typescript
   return (
     <div className="flex h-full flex-col bg-base-100">
       <EditorToolbar ... />
       <div className="flex-1 overflow-auto">
         {viewMode === 'wysiwyg' ? (
           <EditorContent editor={editor} />
         ) : (
           <MarkdownEditor ... />
         )}
       </div>
     </div>
   );
   ```

**Testing**:
```bash
# Manual testing:
1. Start app: bun start
2. Open a file in WYSIWYG mode
3. Try Cmd+K (Mac) or Ctrl+K (Windows/Linux) - should do nothing
4. Try Cmd+E or Ctrl+E - should do nothing
5. Verify no link popover appears
6. Check browser console for errors - should be none

# TypeScript verification:
bun run lint
```

5. **Delete the LinkPopover.tsx file entirely**:

```bash
rm src/renderer/components/Editor/LinkPopover.tsx
```

We can always recover it from git history if needed. Keeping unused files violates YAGNI.

**Commit**: `refactor: remove link popover and keyboard shortcuts`

---

### Task 5: Create MarkdownGuide Modal Component

**Objective**: Create a reusable modal component that displays a comprehensive markdown syntax cheat sheet in a two-column format.

**Files to create**:
- `src/renderer/components/Editor/MarkdownGuide.tsx`

**Steps**:

1. **Create the file** `src/renderer/components/Editor/MarkdownGuide.tsx`

2. **Understand DaisyUI modal structure**:
   - DaisyUI provides modal components: `dialog` element with `modal` class
   - Open/close controlled by `open` prop on dialog element
   - Click outside (backdrop) closes modal by default
   - Modal content goes inside `<div className="modal-box">`

3. **Write the component**:

```typescript
import { X } from 'lucide-react';

interface MarkdownGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarkdownGuide = ({ isOpen, onClose }: MarkdownGuideProps) => {
  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Markdown Syntax Guide</h2>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cheat sheet content - two column layout */}
        <div className="space-y-6">
          {/* Text Formatting */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Text Formatting</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm">**bold text**</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <p className="text-sm"><strong>bold text</strong></p>
              </div>

              <div>
                <code className="text-sm">*italic text*</code>
              </div>
              <div>
                <p className="text-sm"><em>italic text</em></p>
              </div>

              <div>
                <code className="text-sm">***bold and italic***</code>
              </div>
              <div>
                <p className="text-sm"><strong><em>bold and italic</em></strong></p>
              </div>

              <div>
                <code className="text-sm">~~strikethrough~~</code>
              </div>
              <div>
                <p className="text-sm"><s>strikethrough</s></p>
              </div>

              <div>
                <code className="text-sm">`inline code`</code>
              </div>
              <div>
                <p className="text-sm"><code>inline code</code></p>
              </div>
            </div>
          </section>

          {/* Headings */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Headings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm"># Heading 1</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <p className="text-sm font-bold text-2xl">Heading 1</p>
              </div>

              <div>
                <code className="text-sm">## Heading 2</code>
              </div>
              <div>
                <p className="text-sm font-bold text-xl">Heading 2</p>
              </div>

              <div>
                <code className="text-sm">### Heading 3</code>
              </div>
              <div>
                <p className="text-sm font-bold text-lg">Heading 3</p>
              </div>

              <div>
                <code className="text-sm">#### Heading 4</code>
              </div>
              <div>
                <p className="text-sm font-bold text-base">Heading 4</p>
              </div>

              <div>
                <code className="text-sm">##### Heading 5</code>
              </div>
              <div>
                <p className="text-sm font-bold text-sm">Heading 5</p>
              </div>

              <div>
                <code className="text-sm">###### Heading 6</code>
              </div>
              <div>
                <p className="text-sm font-bold text-xs">Heading 6</p>
              </div>
            </div>
          </section>

          {/* Lists */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Lists</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <pre className="text-sm">
{`- Item 1
- Item 2
  - Nested item`}
                </pre>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <ul className="text-sm list-disc list-inside">
                  <li>Item 1</li>
                  <li>Item 2
                    <ul className="list-disc list-inside ml-4">
                      <li>Nested item</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div>
                <pre className="text-sm">
{`1. First item
2. Second item
3. Third item`}
                </pre>
              </div>
              <div>
                <ol className="text-sm list-decimal list-inside">
                  <li>First item</li>
                  <li>Second item</li>
                  <li>Third item</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Links & Images */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Links & Images</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm break-all">[Link text](https://example.com)</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <p className="text-sm"><a href="#" className="link">Link text</a></p>
              </div>

              <div>
                <code className="text-sm break-all">[Link](https://example.com "Title")</code>
              </div>
              <div>
                <p className="text-sm"><a href="#" className="link" title="Title">Link with title</a></p>
              </div>

              <div>
                <code className="text-sm break-all">![Alt text](image.png)</code>
              </div>
              <div>
                <p className="text-sm">Image with alt text</p>
              </div>
            </div>
          </section>

          {/* Code */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Code Blocks</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <pre className="text-sm">
{`\`\`\`javascript
const x = 1;
console.log(x);
\`\`\``}
                </pre>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <p className="text-sm">Code block with syntax highlighting</p>
              </div>

              <div>
                <pre className="text-sm">
{`\`\`\`
Plain code block
\`\`\``}
                </pre>
              </div>
              <div>
                <p className="text-sm">Code block without language</p>
              </div>
            </div>
          </section>

          {/* Blockquotes */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Blockquotes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm">&gt; Blockquote text</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <blockquote className="text-sm border-l-4 border-base-300 pl-4">
                  Blockquote text
                </blockquote>
              </div>

              <div>
                <pre className="text-sm">
{`> First level
>> Nested quote`}
                </pre>
              </div>
              <div>
                <blockquote className="text-sm border-l-4 border-base-300 pl-4">
                  First level
                  <blockquote className="border-l-4 border-base-300 pl-4 ml-2">
                    Nested quote
                  </blockquote>
                </blockquote>
              </div>
            </div>
          </section>

          {/* Tables */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Tables</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <pre className="text-sm">
{`| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`}
                </pre>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <table className="table table-sm table-zebra">
                  <thead>
                    <tr>
                      <th>Header 1</th>
                      <th>Header 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cell 1</td>
                      <td>Cell 2</td>
                    </tr>
                    <tr>
                      <td>Cell 3</td>
                      <td>Cell 4</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <pre className="text-sm">
{`| Left | Center | Right |
|:-----|:------:|------:|
| L    | C      | R     |`}
                </pre>
              </div>
              <div>
                <p className="text-sm">Table with alignment (left, center, right)</p>
              </div>
            </div>
          </section>

          {/* Other */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Other Elements</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm">---</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <hr className="my-2" />
                <p className="text-sm">Horizontal rule</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>

      {/* Backdrop - click to close */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};
```

**Key implementation notes**:

- **Conditional rendering**: Component returns `null` when `isOpen` is false for performance
- **DaisyUI modal**: Uses `dialog` element with `modal` and `modal-open` classes
- **Two-column grid**: Uses Tailwind's `grid grid-cols-2` for syntax/result columns
- **Scrollable**: Content will scroll if it exceeds viewport height
- **Accessible**: Includes close button with aria-label, backdrop click to close
- **Responsive**: `max-w-4xl` ensures modal doesn't get too wide
- **Icons**: Uses Lucide's `X` icon for close button

**Testing**:

Create a test file: `src/renderer/components/Editor/MarkdownGuide.test.tsx`

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MarkdownGuide } from './MarkdownGuide';

describe('MarkdownGuide', () => {
  test('does not render when isOpen is false', () => {
    render(<MarkdownGuide isOpen={false} onClose={() => {}} />);

    expect(screen.queryByText('Markdown Syntax Guide')).not.toBeInTheDocument();
  });

  test('renders guide when isOpen is true', () => {
    render(<MarkdownGuide isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Markdown Syntax Guide')).toBeInTheDocument();
  });

  test('displays all section headings', () => {
    render(<MarkdownGuide isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Text Formatting')).toBeInTheDocument();
    expect(screen.getByText('Headings')).toBeInTheDocument();
    expect(screen.getByText('Lists')).toBeInTheDocument();
    expect(screen.getByText('Links & Images')).toBeInTheDocument();
    expect(screen.getByText('Code Blocks')).toBeInTheDocument();
    expect(screen.getByText('Blockquotes')).toBeInTheDocument();
    expect(screen.getByText('Tables')).toBeInTheDocument();
    expect(screen.getByText('Other Elements')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    let closeCalled = false;
    const handleClose = () => { closeCalled = true; };

    render(<MarkdownGuide isOpen={true} onClose={handleClose} />);

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(closeCalled).toBe(true);
  });

  test('calls onClose when Close button is clicked', async () => {
    const user = userEvent.setup();
    let closeCalled = false;
    const handleClose = () => { closeCalled = true; };

    render(<MarkdownGuide isOpen={true} onClose={handleClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(closeCalled).toBe(true);
  });

  test('displays markdown syntax examples', () => {
    render(<MarkdownGuide isOpen={true} onClose={() => {}} />);

    // Check for some example syntax
    expect(screen.getByText('**bold text**')).toBeInTheDocument();
    expect(screen.getByText('*italic text*')).toBeInTheDocument();
    expect(screen.getByText('# Heading 1')).toBeInTheDocument();
  });
});
```

**Run tests**:
```bash
bun test MarkdownGuide.test.tsx
```

**Commit**: `feat: add markdown syntax guide modal component`

---

### Task 6: Update MarkdownEditor - Add Guide Link

**Objective**: Add a "Markdown Guide" link in the bottom-right corner of the markdown editor that opens the MarkdownGuide modal.

**Files to modify**:
- `src/renderer/components/Editor/MarkdownEditor.tsx`

**Steps**:

1. **Read the current MarkdownEditor implementation** to understand structure:

```bash
# Review the file first
cat src/renderer/components/Editor/MarkdownEditor.tsx
```

Expected structure:
- Simple textarea component
- Takes `content`, `onUpdate`, `placeholder`, `editable` props
- Handles user typing with onChange

2. **Add state and import for MarkdownGuide**:

Add at the top:
```typescript
import { useState } from 'react';
import { MarkdownGuide } from './MarkdownGuide';
```

3. **Add state for modal**:

Inside the component:
```typescript
export const MarkdownEditor = ({
  content,
  onUpdate,
  placeholder,
  editable = true,
}: MarkdownEditorProps) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // ... rest of component
};
```

4. **Update the return JSX** to wrap textarea in a container and add the link:

**Before** (assuming current implementation):
```typescript
return (
  <textarea
    value={content}
    onChange={(e) => onUpdate(e.target.value)}
    placeholder={placeholder}
    disabled={!editable}
    className="w-full h-full p-4 bg-base-100 text-base-content resize-none focus:outline-none font-mono"
  />
);
```

**After**:
```typescript
return (
  <div className="relative w-full h-full">
    <textarea
      value={content}
      onChange={(e) => onUpdate(e.target.value)}
      placeholder={placeholder}
      disabled={!editable}
      className="w-full h-full p-4 bg-base-100 text-base-content resize-none focus:outline-none font-mono"
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
```

**Key implementation notes**:
- **Relative positioning**: Wrapper div has `relative` to position link absolutely
- **Link styling**: Uses DaisyUI's `link link-primary` for styled text link
- **Positioning**: `absolute bottom-4 right-4` places link in bottom-right with padding
- **Button vs anchor**: Using button for accessibility (no href, pure click action)

5. **Adjust textarea padding** (optional):
   - Consider adding `pb-12` to textarea to prevent text from being obscured by the link
   - Or keep as-is since link is small and non-obtrusive

**Updated textarea** (with padding adjustment):
```typescript
<textarea
  value={content}
  onChange={(e) => onUpdate(e.target.value)}
  placeholder={placeholder}
  disabled={!editable}
  className="w-full h-full p-4 pb-12 bg-base-100 text-base-content resize-none focus:outline-none font-mono"
/>
```

**Testing**:

Create test file: `src/renderer/components/Editor/MarkdownEditor.test.tsx`

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor', () => {
  test('renders textarea with content', () => {
    const content = '# Hello World';
    render(
      <MarkdownEditor
        content={content}
        onUpdate={() => {}}
        placeholder="Type here..."
        editable={true}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(content);
  });

  test('calls onUpdate when content changes', async () => {
    const user = userEvent.setup();
    let updatedContent = '';
    const handleUpdate = (newContent: string) => {
      updatedContent = newContent;
    };

    render(
      <MarkdownEditor
        content=""
        onUpdate={handleUpdate}
        placeholder="Type here..."
        editable={true}
      />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');

    expect(updatedContent).toBe('Hello');
  });

  test('displays markdown guide link', () => {
    render(
      <MarkdownEditor
        content=""
        onUpdate={() => {}}
        placeholder="Type here..."
        editable={true}
      />
    );

    expect(screen.getByText('Markdown Guide')).toBeInTheDocument();
  });

  test('opens markdown guide when link is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MarkdownEditor
        content=""
        onUpdate={() => {}}
        placeholder="Type here..."
        editable={true}
      />
    );

    const guideLink = screen.getByText('Markdown Guide');
    await user.click(guideLink);

    // Guide modal should now be visible
    expect(screen.getByText('Markdown Syntax Guide')).toBeInTheDocument();
  });

  test('closes markdown guide when modal close is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MarkdownEditor
        content=""
        onUpdate={() => {}}
        placeholder="Type here..."
        editable={true}
      />
    );

    // Open guide
    const guideLink = screen.getByText('Markdown Guide');
    await user.click(guideLink);

    // Close guide
    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    // Guide should be closed
    expect(screen.queryByText('Markdown Syntax Guide')).not.toBeInTheDocument();
  });

  test('disables textarea when editable is false', () => {
    render(
      <MarkdownEditor
        content="Test"
        onUpdate={() => {}}
        placeholder="Type here..."
        editable={false}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });
});
```

**Run tests**:
```bash
bun test MarkdownEditor.test.tsx
```

**Manual testing**:
```bash
# In running app:
1. Start app: bun start
2. Open a file
3. Switch to markdown mode (Hash icon)
4. Look for "Markdown Guide" link in bottom-right
5. Click link - modal should open
6. Verify modal shows all sections
7. Click close button - modal should close
8. Click backdrop - modal should close
```

**Commit**: `feat: add markdown guide link to markdown editor`

---

### Task 7: Integration Testing

**Objective**: Test the complete toolbar simplification workflow to ensure all pieces work together correctly.

**Files to test**:
- All modified components working together

**Steps**:

1. **Create integration test file**: `src/renderer/components/Editor/EditorComponent.integration.test.tsx`

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { EditorComponent } from './EditorComponent';

describe('EditorComponent - Toolbar Integration', () => {
  test('toolbar buttons are enabled in WYSIWYG mode', () => {
    render(<EditorComponent content="# Test" onUpdate={() => {}} />);

    // Check that formatting buttons exist and are not disabled
    const boldButton = screen.getByTitle('Bold (Cmd+B)');
    const italicButton = screen.getByTitle('Italic (Cmd+I)');
    const h1Button = screen.getByTitle('Heading 1');

    expect(boldButton).not.toBeDisabled();
    expect(italicButton).not.toBeDisabled();
    expect(h1Button).not.toBeDisabled();
  });

  test('toolbar buttons are disabled in markdown mode', async () => {
    const user = userEvent.setup();
    render(<EditorComponent content="# Test" onUpdate={() => {}} />);

    // Switch to markdown mode
    const viewToggle = screen.getByTitle(/Switch to Markdown/i);
    await user.click(viewToggle);

    // Check that formatting buttons are disabled
    const boldButton = screen.getByTitle('Bold (Cmd+B)');
    const italicButton = screen.getByTitle('Italic (Cmd+I)');
    const h1Button = screen.getByTitle('Heading 1');

    expect(boldButton).toBeDisabled();
    expect(italicButton).toBeDisabled();
    expect(h1Button).toBeDisabled();
  });

  test('view toggle button is always enabled', async () => {
    const user = userEvent.setup();
    render(<EditorComponent content="# Test" onUpdate={() => {}} />);

    // View toggle should be enabled in WYSIWYG mode
    const viewToggleWysiwyg = screen.getByTitle(/Switch to Markdown/i);
    expect(viewToggleWysiwyg).not.toBeDisabled();

    // Switch to markdown mode
    await user.click(viewToggleWysiwyg);

    // View toggle should still be enabled in markdown mode
    const viewToggleMarkdown = screen.getByTitle(/Switch to WYSIWYG/i);
    expect(viewToggleMarkdown).not.toBeDisabled();
  });

  test('removed buttons are not present', () => {
    render(<EditorComponent content="# Test" onUpdate={() => {}} />);

    // These buttons should not exist
    expect(screen.queryByTitle('Strikethrough')).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Inline Code/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle('Blockquote')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Code Block')).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Add Link/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Add Image/i)).not.toBeInTheDocument();
  });

  test('only essential buttons are present', () => {
    render(<EditorComponent content="# Test" onUpdate={() => {}} />);

    // Undo/Redo
    expect(screen.getByTitle(/Undo/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Redo/i)).toBeInTheDocument();

    // Text formatting
    expect(screen.getByTitle('Bold (Cmd+B)')).toBeInTheDocument();
    expect(screen.getByTitle('Italic (Cmd+I)')).toBeInTheDocument();

    // Headings
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 3')).toBeInTheDocument();

    // Lists
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Ordered List')).toBeInTheDocument();

    // View toggle
    expect(screen.getByTitle(/Switch to/i)).toBeInTheDocument();
  });

  test('markdown guide link appears in markdown mode', async () => {
    const user = userEvent.setup();
    render(<EditorComponent content="# Test" onUpdate={() => {}} />);

    // Should not show in WYSIWYG mode
    expect(screen.queryByText('Markdown Guide')).not.toBeInTheDocument();

    // Switch to markdown mode
    const viewToggle = screen.getByTitle(/Switch to Markdown/i);
    await user.click(viewToggle);

    // Should show in markdown mode
    expect(screen.getByText('Markdown Guide')).toBeInTheDocument();
  });

  test('markdown guide opens from markdown mode', async () => {
    const user = userEvent.setup();
    render(<EditorComponent content="# Test" onUpdate={() => {}} />);

    // Switch to markdown mode
    const viewToggle = screen.getByTitle(/Switch to Markdown/i);
    await user.click(viewToggle);

    // Click guide link
    const guideLink = screen.getByText('Markdown Guide');
    await user.click(guideLink);

    // Modal should open
    expect(screen.getByText('Markdown Syntax Guide')).toBeInTheDocument();
    expect(screen.getByText('Text Formatting')).toBeInTheDocument();
  });

  test('keyboard shortcuts are removed', async () => {
    const user = userEvent.setup();
    render(<EditorComponent content="# Test" onUpdate={() => {}} />);

    // Cmd+K should not open link popover (which no longer exists)
    await user.keyboard('{Meta>}k{/Meta}');
    expect(screen.queryByText(/Link/i)).not.toBeInTheDocument();

    // Cmd+E should not toggle inline code (button doesn't exist)
    // This is harder to test without inspecting editor state, so skip for now
  });
});
```

2. **Run all tests**:

```bash
# Run all tests
bun test

# Run specific test files
bun test EditorComponent.integration.test.tsx
bun test MarkdownGuide.test.tsx
bun test MarkdownEditor.test.tsx

# Run with coverage to ensure we're testing thoroughly
bun test:coverage
```

3. **Manual testing checklist**:

Create file: `docs/plans/manual-test-checklist.md`

```markdown
# Manual Testing Checklist - Toolbar Simplification

## Setup
- [ ] Start dev server: `bun start`
- [ ] Open test directory with markdown files
- [ ] Verify app loads without errors

## WYSIWYG Mode Tests

### Toolbar Buttons Present
- [ ] Undo button visible
- [ ] Redo button visible
- [ ] Bold button visible
- [ ] Italic button visible
- [ ] H1, H2, H3 buttons visible
- [ ] Bullet list button visible
- [ ] Ordered list button visible
- [ ] View toggle (Hash icon) visible

### Toolbar Buttons Removed
- [ ] No strikethrough button
- [ ] No inline code button
- [ ] No blockquote button
- [ ] No code block button
- [ ] No link button
- [ ] No image button

### Button Functionality
- [ ] Bold button works (select text, click button, text becomes bold)
- [ ] Italic button works
- [ ] H1 button works (creates heading)
- [ ] H2 button works
- [ ] H3 button works
- [ ] Bullet list button works
- [ ] Ordered list button works
- [ ] Undo button works (after making change)
- [ ] Redo button works (after undo)

### Button States
- [ ] Bold button shows active state when cursor in bold text
- [ ] Italic button shows active state when cursor in italic text
- [ ] Heading buttons show active state when in heading
- [ ] List buttons show active state when in list
- [ ] Undo button disabled when nothing to undo
- [ ] Redo button disabled when nothing to redo

### Visual Layout
- [ ] Buttons are properly grouped with dividers
- [ ] Exactly 4 dividers between groups
- [ ] View toggle is right-aligned
- [ ] No awkward spacing or gaps
- [ ] Toolbar doesn't wrap unnecessarily

## Markdown Mode Tests

### View Switching
- [ ] Click Hash icon to switch to markdown mode
- [ ] Editor shows raw markdown text
- [ ] Switch back to WYSIWYG works

### Disabled Buttons
- [ ] All formatting buttons appear grayed/disabled
- [ ] Undo button disabled
- [ ] Redo button disabled
- [ ] Bold button disabled
- [ ] Italic button disabled
- [ ] All heading buttons disabled
- [ ] All list buttons disabled
- [ ] View toggle button remains enabled

### Markdown Guide
- [ ] "Markdown Guide" link visible in bottom-right
- [ ] Link is clickable
- [ ] Clicking opens modal
- [ ] Modal shows "Markdown Syntax Guide" title
- [ ] Modal shows all sections: Text Formatting, Headings, Lists, Links & Images, Code Blocks, Blockquotes, Tables, Other Elements
- [ ] Modal has two-column layout (Syntax | Result)
- [ ] Close button (X) works
- [ ] Footer "Close" button works
- [ ] Clicking backdrop closes modal
- [ ] Modal scrolls if content is long

## Keyboard Shortcuts

### Working Shortcuts
- [ ] Cmd+B / Ctrl+B for bold (WYSIWYG mode only)
- [ ] Cmd+I / Ctrl+I for italic (WYSIWYG mode only)
- [ ] Cmd+Z / Ctrl+Z for undo (WYSIWYG mode only)
- [ ] Cmd+Shift+Z / Ctrl+Shift+Z for redo (WYSIWYG mode only)

### Removed Shortcuts
- [ ] Cmd+K / Ctrl+K does nothing (no link popover)
- [ ] Cmd+E / Ctrl+E does nothing (no inline code toggle)

## Edge Cases

### Content Persistence
- [ ] Type content in WYSIWYG, switch to markdown, content preserved
- [ ] Type content in markdown, switch to WYSIWYG, content rendered correctly
- [ ] Make edit in WYSIWYG, switch to markdown, edit preserved

### Empty States
- [ ] Empty file shows placeholder in WYSIWYG mode
- [ ] Empty file shows placeholder in markdown mode
- [ ] Can start typing in both modes

### Long Content
- [ ] Long document scrolls correctly in WYSIWYG mode
- [ ] Long document scrolls correctly in markdown mode
- [ ] Markdown guide link stays in position (doesn't scroll with content)

## Browser Console
- [ ] No errors in console during any operations
- [ ] No warnings about missing props or deprecated features

## TypeScript & Linting
- [ ] `bun run lint` passes with no errors
- [ ] No TypeScript compilation errors
```

4. **Execute manual testing**:

```bash
# Start app
bun start

# Go through checklist systematically
# Mark each item as you test it
```

5. **Document any issues found**:
   - Create GitHub issues for bugs
   - Note them in a `bugs.md` file temporarily
   - Fix critical bugs before considering task complete

**Note**: The manual test checklist file (`docs/plans/manual-test-checklist.md`) should be created during this task, but the actual manual testing execution will be handled separately.

**Commit**: `test: add integration tests for simplified toolbar`

---

### Task 8: Update Documentation

**Objective**: Update project documentation to reflect the toolbar changes.

**Files to modify**:
- `CLAUDE.md` (in both locations if they differ)
- Any other relevant docs

**Steps**:

1. **Update CLAUDE.md - Component Structure section**:

Find the Component Structure section and update the Editor description:

**Before**:
```markdown
├── Editor/              # Dual-mode editor (WYSIWYG/Markdown) with formatting toolbar
│   ├── EditorComponent.tsx      # Main editor with view mode switching
│   ├── EditorToolbar.tsx        # Formatting toolbar with view toggle
│   ├── MarkdownEditor.tsx       # Raw markdown text editor
│   └── LinkPopover.tsx          # Link insertion popover
```

**After**:
```markdown
├── Editor/              # Dual-mode editor (WYSIWYG/Markdown) with formatting toolbar
│   ├── EditorComponent.tsx      # Main editor with view mode switching
│   ├── EditorToolbar.tsx        # Simplified formatting toolbar (essential features only)
│   ├── MarkdownEditor.tsx       # Raw markdown text editor with guide link
│   └── MarkdownGuide.tsx        # Markdown syntax reference modal
```

2. **Update CLAUDE.md - Keyboard shortcuts section**:

**Before**:
```markdown
- **Keyboard shortcuts**:
  - `Cmd/Ctrl + N` - Create new file in root directory
  - `Cmd/Ctrl + K` - Open link popover (WYSIWYG mode only)
  - `Cmd/Ctrl + E` - Toggle inline code (WYSIWYG mode only)
```

**After**:
```markdown
- **Keyboard shortcuts**:
  - `Cmd/Ctrl + N` - Create new file in root directory
  - `Cmd/Ctrl + B` - Toggle bold (WYSIWYG mode only)
  - `Cmd/Ctrl + I` - Toggle italic (WYSIWYG mode only)
  - `Cmd/Ctrl + Z` - Undo (WYSIWYG mode only)
  - `Cmd/Ctrl + Shift + Z` - Redo (WYSIWYG mode only)
```

3. **Add new section about Toolbar Philosophy**:

Add this section after the "TipTap Editor Integration" section:

```markdown
### Toolbar Design Philosophy

The WYSIWYG toolbar provides quick access to only the most essential markdown formatting features:

**Included in Toolbar**:
- Undo/Redo - Essential for any editor
- Text formatting - Bold, Italic
- Headings - H1, H2, H3
- Lists - Bullet and ordered lists
- View mode toggle - Switch between WYSIWYG and markdown modes

**Advanced Features (Use Markdown Mode)**:
For features not in the toolbar (strikethrough, inline code, links, images, blockquotes, code blocks, tables), users should:
1. Switch to markdown mode using the Hash icon button
2. Type the markdown syntax directly (e.g., `[link text](url)` for links)
3. Access the "Markdown Guide" link in the bottom-right of markdown mode for syntax reference

**Toolbar Behavior**:
- In WYSIWYG mode: All formatting buttons are functional
- In markdown mode: All formatting buttons are disabled (grayed out), only view toggle is active
- The view mode toggle (Hash icon) is always enabled in both modes

**Markdown Guide**:
A comprehensive markdown syntax reference is available via the "Markdown Guide" link in markdown mode. It displays:
- Text formatting (bold, italic, strikethrough, inline code)
- Headings (H1-H6)
- Lists (ordered, unordered, nested)
- Links and images
- Code blocks with syntax highlighting
- Blockquotes
- Tables (GFM syntax)
- Other elements (horizontal rules)
```

4. **Update both CLAUDE.md files**:

```bash
# If working in .conductor/brasilia, update both:
# - /Users/saadiq/dev/tapestry/.conductor/brasilia/CLAUDE.md
# - Copy changes to main repo if needed (check with user first)
```

5. **Create changelog entry** (optional):

Create `docs/changelog/toolbar-simplification.md`:

```markdown
# Toolbar Simplification - [Date]

## Changes

### Simplified WYSIWYG Toolbar
- Reduced toolbar buttons from 15+ to 10 essential buttons
- Removed: strikethrough, inline code, blockquote, code block, link, image buttons
- Removed: Cmd+K (link popover) and Cmd+E (inline code) keyboard shortcuts
- Removed: LinkPopover component
- Changed: View toggle icon from Code2 to Hash for better semantics

### Enhanced Markdown Mode
- Added "Markdown Guide" link in bottom-right corner of markdown editor
- Added comprehensive markdown syntax reference modal with two-column layout
- Shows syntax examples and rendered results for all supported markdown features

### Improved UX
- Toolbar buttons now disable in markdown mode (visual feedback)
- View toggle button remains enabled in both modes
- Cleaner, less cluttered toolbar layout
- Better separation between basic (toolbar) and advanced (markdown) features

## Rationale

The toolbar was providing too many options, which:
1. Cluttered the interface
2. Attempted to expose all markdown features through buttons
3. Didn't align with the app's philosophy of being markdown-first

The new design:
1. Provides quick access to truly essential formatting
2. Encourages users to learn markdown for advanced features
3. Offers comprehensive reference guide when needed
4. Maintains professional, focused editing experience

## Migration Notes

For users who relied on removed toolbar buttons:
- **Links**: Type `[text](url)` in markdown mode
- **Images**: Type `![alt](url)` in markdown mode
- **Blockquotes**: Type `> text` in markdown mode
- **Code blocks**: Type ` ```language ` and ` ``` ` in markdown mode
- **Strikethrough**: Type `~~text~~` in markdown mode
- **Inline code**: Type `` `code` `` in markdown mode

All these syntaxes are documented in the Markdown Guide accessible from markdown mode.
```

**Commit**: `docs: update documentation for simplified toolbar`

---

### Task 9: Final Review and Cleanup

**Objective**: Ensure code quality, remove any debug code, and verify everything works together.

**Steps**:

1. **Run full linter**:

```bash
bun run lint
```

Fix any errors or warnings.

2. **Run full test suite**:

```bash
# All tests
bun test

# With coverage
bun test:coverage

# Verify coverage is reasonable (aim for >70% on new code)
```

3. **Check for leftover debug code**:

```bash
# Search for console.log statements added during development
grep -r "console.log" src/renderer/components/Editor/

# Search for TODO comments
grep -r "TODO" src/renderer/components/Editor/

# Search for FIXME comments
grep -r "FIXME" src/renderer/components/Editor/
```

Remove or address any findings.

4. **Verify unused imports**:

TypeScript/ESLint should catch these, but double-check:

```bash
# Check each modified file for unused imports
# EditorToolbar.tsx - should only import used icons
# EditorComponent.tsx - should not import LinkPopover
```

5. **Check bundle size impact** (optional but good practice):

```bash
# Build the app
bun package

# Check output size
# Note the size for comparison (removing features should decrease bundle)
```

6. **Final manual smoke test**:

Go through the manual test checklist one more time (from Task 8) to ensure everything works.

7. **Review all commits**:

```bash
# View commit history
git log --oneline

# Ensure commits are:
# - Atomic (one logical change per commit)
# - Well-described (clear commit messages)
# - Following conventional commit format
```

Expected commits:
1. `refactor: remove unused toolbar icons and functions`
2. `feat: disable toolbar buttons in markdown mode`
3. `refactor: remove advanced formatting buttons from toolbar`
4. `refactor: remove link popover and keyboard shortcuts`
5. `feat: add markdown syntax guide modal component`
6. `feat: add markdown guide link to markdown editor`
7. `test: add integration tests for simplified toolbar`
8. `docs: update documentation for simplified toolbar`

(Note: Original Task 2 was skipped, so task numbers are renumbered accordingly)

8. **Clean up any test files or artifacts**:

```bash
# Remove any .test.tsx.backup files or similar
find src -name "*.backup" -delete
find src -name "*.tmp" -delete
```

9. **Verify no regressions in existing features**:

Test features that weren't directly modified:
- [ ] File tree still works
- [ ] File opening/saving still works
- [ ] Theme switching still works
- [ ] Window resizing still works
- [ ] Status bar still works

10. **Create final summary**:

```bash
# Count lines changed
git diff --stat main..HEAD

# Ensure changes align with expectations:
# - EditorToolbar.tsx: moderate reduction (removed buttons)
# - EditorComponent.tsx: small reduction (removed popover)
# - MarkdownEditor.tsx: small increase (added guide link)
# - MarkdownGuide.tsx: new file (moderate size)
# - Tests: new files
```

**Commit** (if any cleanup was needed): `chore: final cleanup and polish`

---

## Post-Implementation

### Code Review Checklist

Before submitting for review, verify:

- [ ] All tests pass: `bun test`
- [ ] Linter passes: `bun run lint`
- [ ] App builds successfully: `bun package`
- [ ] Manual testing completed (all items in checklist)
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] No TypeScript errors
- [ ] Commits are clean and well-organized
- [ ] No debug code or TODOs left behind

### Deployment Notes

This change:
- **Does not require database migrations** - No data changes
- **Does not affect file format** - Markdown files unchanged
- **Does not break existing files** - All content renders correctly
- **Is backward compatible** - Users can still use all markdown features via syntax
- **May require user education** - Users need to know about markdown guide for advanced features

### Known Limitations

- Users who relied on toolbar buttons for links/images/etc will need to adapt
- No migration guide is shown in-app (only in documentation)
- Keyboard shortcuts were removed without alternative shortcuts for advanced features

### Future Enhancements (Out of Scope)

- Add markdown syntax highlighting in markdown mode
- Add autocomplete for markdown syntax
- Add keyboard shortcuts for inserting markdown syntax in markdown mode
- Make markdown guide searchable
- Add "Insert at cursor" buttons in markdown guide

---

## Summary

This implementation plan covers:

1. ✅ Removing unused imports and functions
2. ✅ Disabling toolbar buttons in markdown mode
3. ✅ Removing advanced formatting button groups
4. ✅ Removing LinkPopover and keyboard shortcuts (+ deleting LinkPopover.tsx file)
5. ✅ Creating comprehensive MarkdownGuide modal
6. ✅ Adding guide link to markdown editor
7. ✅ Integration testing
8. ✅ Documentation updates
9. ✅ Final review and cleanup

**Estimated time**: 4-6 hours for experienced developer unfamiliar with codebase

**Risk areas**:
- Modal styling may need adjustment for different screen sizes
- Guide content formatting might need iteration
- Testing coverage might need expansion based on edge cases discovered

**Success criteria**:
- Toolbar has exactly 10 buttons + view toggle
- All removed features are accessible via markdown syntax
- Markdown guide is comprehensive and easy to use
- No regressions in existing functionality
- All tests pass

## Clarifications & Decisions

### Answers to Implementation Questions

1. **Current State Verification**: ✅ Yes, verify the codebase matches the plan before starting. Report any discrepancies.

2. **Keyboard Shortcut Removal**: ✅ DELETE the entire `handleKeyDown` function and its `useEffect` completely. Don't keep empty handlers (violates YAGNI).

3. **Task 2 (ToolbarButton Component)**: ✅ SKIP - component already supports what we need. No verification needed, just move to Task 3 (renumbered as Task 2).

4. **Testing Approach**: ✅ TDD - Create and run tests as you implement each feature. Write test first when possible, then implement to make it pass.

5. **Manual Testing**: ✅ Create the manual test checklist file (`docs/plans/manual-test-checklist.md`) during Task 7, but don't execute manual tests yourself.

6. **LinkPopover.tsx File**: ✅ DELETE it entirely after removing its usage. We can recover from git history if needed (violates YAGNI to keep it).

7. **Execution Preference**: ✅ Tasks will be assigned individually. Commit after each major task as outlined. Wait for task assignment before executing.
