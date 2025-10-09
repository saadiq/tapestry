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
