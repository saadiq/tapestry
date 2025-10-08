# Implementation Plan: Fix Context Menu Issues and Add Inline Rename

## Status: PARTIALLY COMPLETED ✅

**Completed:** Tasks 5-8 (Inline Rename functionality)
**Skipped:** Tasks 1-4 (Reveal in Finder already implemented, Rename Modal fix deprioritized)

## Overview

This plan addresses three issues with the file tree context menu:
1. **Reveal in Finder** - ⏸️ SKIPPED (Already implemented in codebase)
2. **Rename Modal UX** - ⏸️ SKIPPED (Not prioritized for this iteration)
3. **Inline Rename** - ✅ COMPLETED (Double-click on active file to rename in place)

## Context: Architecture Review

### How File Operations Work

**Process Flow:**
1. **Renderer** (React UI) → triggers action
2. **Preload Script** (security bridge) → exposes safe API via `contextBridge`
3. **IPC Channel** → sends message between processes
4. **Main Process** (Node.js) → executes file system operations
5. **Response** → flows back through same chain

**Key Files:**
- `src/renderer/components/FileTree/` - UI components
- `src/renderer/store/fileTreeStore.tsx` - State management via React Context
- `src/main/preload.ts` - IPC bridge (security layer)
- `src/main/main.ts` - IPC handlers registration
- `src/main/fileSystem/` - File operation implementations

### Current Context Menu Implementation

**Components:**
- `FileTree.tsx` - Main tree with virtual scrolling, manages modals
- `FileTreeItem.tsx` - Individual row rendering
- `ContextMenu.tsx` - Right-click menu (NOTE: has duplicate modals, FileTree.tsx modals are the ones actually used)
- `InputModal.tsx` - Reusable input dialog
- `ConfirmDialog.tsx` - Reusable confirmation dialog

**Context Menu Flow:**
1. Right-click on FileTreeItem → `handleContextMenu()` → sets `contextMenu` state
2. ContextMenu renders at mouse position with available actions
3. Click action → `handleContextMenuAction()` in FileTree.tsx
4. Opens appropriate modal OR executes action directly
5. Modal collects input → calls handler → updates file system

## Task Breakdown

### Task 1: Fix Reveal in Finder - Main Process Handler ⏸️ SKIPPED

**Objective:** Add IPC handler to show file/folder in system file manager

**Status:** SKIPPED - Already implemented in codebase

**Files to modify:**
- `src/main/main.ts`

**Implementation:**

1. **Add IPC handler** (after line 169, near other IPC handlers):

```typescript
// Reveal file/folder in system file manager
ipcMain.handle('shell:showItemInFolder', async (_event, itemPath: string) => {
  try {
    shell.showItemInFolder(itemPath);
    return { success: true };
  } catch (error) {
    console.error('[shell:showItemInFolder] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});
```

**Why this works:**
- Electron's `shell` module (already imported line 1) provides `showItemInFolder()`
- On macOS: opens Finder and highlights the item
- On Windows: opens Explorer and selects the item
- On Linux: opens file manager at the location
- Returns success/error for renderer to show feedback

**Testing:**
```bash
# Manual test (after implementing full chain):
# 1. Start app: bun start
# 2. Open a directory
# 3. Right-click any file/folder
# 4. Click "Reveal in Finder"
# 5. Verify: File manager opens with item highlighted
```

**Commit message:**
```
feat: add IPC handler for reveal in file manager

Add shell:showItemInFolder handler to expose Electron's
shell.showItemInFolder functionality to renderer process.
This enables the context menu "Reveal in Finder" action.
```

---

### Task 2: Fix Reveal in Finder - Preload API ⏸️ SKIPPED

**Objective:** Expose the IPC handler to renderer via secure bridge

**Status:** SKIPPED - Already implemented in codebase

**Files to modify:**
- `src/main/preload.ts`

**Implementation:**

1. **Add method to electronAPI.fileSystem** (after line 85, in fileSystem object):

```typescript
// Shell operations
showItemInFolder: (itemPath: string): Promise<{ success: boolean; error?: string }> =>
  ipcRenderer.invoke('shell:showItemInFolder', itemPath),
```

**Important notes:**
- Place in `fileSystem` object (not top-level) for logical grouping
- Must match handler name exactly: `'shell:showItemInFolder'`
- TypeScript will infer return type from handler, but explicit type helps documentation

**Update type definitions** (if TypeScript errors):
- File: `src/shared/types/index.ts` (likely location for IElectronAPI type)
- Add to fileSystem interface:
```typescript
showItemInFolder: (itemPath: string) => Promise<{ success: boolean; error?: string }>;
```

**Testing:**
```bash
# TypeScript compilation test
bun run lint

# Verify no errors in preload script
# Check DevTools console for "🔌 Preload script loaded" message when app starts
```

**Commit message:**
```
feat: expose showItemInFolder to renderer process

Add showItemInFolder method to electronAPI.fileSystem bridge.
Allows renderer to safely invoke shell:showItemInFolder IPC handler.
```

---

### Task 3: Fix Reveal in Finder - Connect to UI ⏸️ SKIPPED

**Objective:** Wire up context menu action to call the new API

**Status:** SKIPPED - Already implemented in codebase

**Files to modify:**
- `src/renderer/components/FileTree/FileTree.tsx`

**Implementation:**

1. **Import fileSystemService** (check if already imported around line 12):
```typescript
import { fileSystemService } from '../../services/fileSystemService';
```

2. **Update the reveal-in-finder case** (replace lines 151-154):

```typescript
case 'reveal-in-finder': {
  try {
    const result = await window.electronAPI.fileSystem.showItemInFolder(path);
    if (!result.success) {
      toast.showError(result.error || 'Failed to reveal item in file manager');
    }
  } catch (error) {
    console.error('Error revealing in finder:', error);
    toast.showError('Failed to reveal item in file manager');
  }
  break;
}
```

**Why async/await:**
- IPC calls are asynchronous (cross-process communication)
- Need to wait for result to show error toast if it fails
- Try-catch handles unexpected errors

**Important:** Make `handleContextMenuAction` async:
```typescript
// Change function signature (line 119):
const handleContextMenuAction = async (action: ContextMenuAction, path: string) => {
```

**Testing checklist:**
```bash
# 1. Start app
bun start

# 2. Manual testing:
# - Open a directory with files
# - Right-click a file → "Reveal in Finder"
#   ✓ File manager opens with file highlighted
# - Right-click a folder → "Reveal in Finder"
#   ✓ File manager opens with folder highlighted
# - Test with invalid path (modify code temporarily to use "/fake/path")
#   ✓ Error toast appears

# 3. Check DevTools console for errors
```

**Edge cases to consider:**
- Path doesn't exist (deleted externally): error toast shows
- Path with special characters: works (Electron handles encoding)
- Network drives: may be slow, but should work

**Commit message:**
```
feat: implement reveal in file manager functionality

Connect context menu "Reveal in Finder" action to IPC handler.
Shows item in system file manager with error handling via toast.

Fixes issue where reveal-in-finder only logged to console.
```

---

### Task 4: Fix Rename Modal - Prevent Backdrop Dismissal ⏸️ SKIPPED

**Objective:** Stop modal from closing when clicking input field

**Status:** SKIPPED - Not prioritized for this iteration

**Files to modify:**
- `src/renderer/components/Modals/InputModal.tsx`

**Problem analysis:**
- DaisyUI modal has backdrop div (line 79)
- Clicking backdrop triggers `onClick={handleCancel}`
- If user clicks near input edge, hits backdrop → modal closes
- This is frustrating UX

**Solution:** Remove backdrop click handler, keep ESC key and Cancel button

**Implementation:**

1. **Update backdrop div** (line 79):

```typescript
// BEFORE:
<div className="modal-backdrop" onClick={handleCancel}></div>

// AFTER:
<div className="modal-backdrop"></div>
```

**Why this works:**
- Modal still has two ways to cancel:
  1. ESC key (handled in useEffect, if implemented in parent)
  2. Cancel button (line 70)
- Prevents accidental dismissal
- Follows principle: explicit > implicit for destructive actions

**Alternative consideration (NOT recommended):**
```typescript
// Don't do this - adds complexity:
<div
  className="modal-backdrop"
  onClick={(e) => {
    if (e.target === e.currentTarget) handleCancel();
  }}
></div>
```

**Testing:**
```bash
# 1. Start app
bun start

# 2. Manual testing:
# - Right-click file → "Rename"
# - Click on the input field edge
#   ✓ Modal stays open
# - Click on the gray backdrop area
#   ✓ Modal stays open
# - Press ESC key
#   ✓ Modal closes (if parent implements)
# - Click Cancel button
#   ✓ Modal closes
# - Click Rename with valid input
#   ✓ Modal closes and file renames

# 3. Test all modals using InputModal:
# - New File modal
# - New Folder modal
# - Rename modal
```

**Related files using InputModal:**
- `FileTree.tsx` (lines 344-375) - all three modals
- Check if any implement ESC key handling in parent

**Commit message:**
```
fix: prevent rename modal dismissal on backdrop click

Remove onClick handler from modal backdrop to prevent
accidental dismissal when clicking near input field.
Users can still cancel via ESC key or Cancel button.

Improves UX for rename, new file, and new folder modals.
```

---

### Task 5: Inline Rename - Add State and Props to FileTreeItem ✅ COMPLETED

**Objective:** Add inline rename capability to tree items

**Status:** COMPLETED

**Files to modify:**
- `src/renderer/components/FileTree/FileTreeItem.tsx`

**Implementation:**

1. **Add to props interface** (line 9):

```typescript
interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onOpen: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  onRename: (path: string, newName: string) => void; // ADD THIS
  isSelected: boolean;
  isActive: boolean;
  isDirty: boolean;
}
```

2. **Add to destructured props** (line 21):

```typescript
export function FileTreeItem({
  node,
  depth,
  onToggle,
  onSelect,
  onOpen,
  onContextMenu,
  onRename, // ADD THIS
  isSelected,
  isActive,
  isDirty,
}: FileTreeItemProps) {
```

3. **Add state for inline rename** (after line 32):

```typescript
const [isRenaming, setIsRenaming] = useState(false);
const [editValue, setEditValue] = useState(node.name);
const inputRef = useRef<HTMLInputElement>(null);
```

4. **Add imports** (line 1):

```typescript
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileText } from 'lucide-react';
import { useState, useRef } from 'react'; // ADD useState, useRef
import type { FileNode } from '../../../shared/types/fileTree';
```

**Testing:**
```bash
# TypeScript compilation
bun run lint

# Verify no errors
```

**Commit message:**
```
feat: add inline rename state to FileTreeItem

Add isRenaming state, editValue, and onRename prop to support
inline rename functionality. No UI changes yet.
```

---

### Task 6: Inline Rename - Implement Double-Click Handler ✅ COMPLETED

**Objective:** Detect double-click on active file name to enter rename mode

**Status:** COMPLETED

**Files to modify:**
- `src/renderer/components/FileTree/FileTreeItem.tsx`

**Implementation:**

1. **Add double-click handler** (after line 47):

```typescript
const handleDoubleClick = (event: React.MouseEvent) => {
  // Only allow inline rename for active files (already open)
  if (!isDirectory && isActive) {
    event.stopPropagation(); // Prevent triggering other handlers
    setIsRenaming(true);
    setEditValue(node.name);
  }
};
```

**Why check `isActive`:**
- User requirement: must be the currently open file
- Single click opens file (sets it as active)
- Then double-click the active file → rename mode
- Prevents accidental renames of non-open files

2. **Update filename span** (replace lines 116-124):

```typescript
{/* File/folder name */}
{isRenaming ? (
  <input
    ref={inputRef}
    type="text"
    className="input input-xs input-bordered flex-1 min-w-0"
    value={editValue}
    onChange={(e) => setEditValue(e.target.value)}
    onBlur={handleRenameBlur}
    onKeyDown={handleRenameKeyDown}
    autoFocus
    onClick={(e) => e.stopPropagation()}
  />
) : (
  <span
    className={`
      text-sm truncate flex-1
      ${isActive ? 'font-semibold text-primary' : 'text-base-content'}
      ${isDirty ? 'italic' : ''}
    `}
    onDoubleClick={handleDoubleClick}
  >
    {node.name}
  </span>
)}
```

**Key details:**
- `input-xs` - matches text size
- `min-w-0` - allows input to shrink in flex container
- `autoFocus` - cursor immediately in input
- `onClick stopPropagation` - prevent file from being clicked while renaming

**Testing:**
```bash
# This won't fully work yet (need handlers from next task)
# But you can verify:
# - Double-click on active file → input appears
# - Input has correct initial value
# - Input is focused
```

**Commit message:**
```
feat: add double-click to rename for active files

Detect double-click on active file name to enter inline
rename mode. Input field replaces label when renaming.
Handlers for submission in next commit.
```

---

### Task 7: Inline Rename - Implement Submit and Cancel Logic ✅ COMPLETED

**Objective:** Handle Enter/Escape/Blur to submit or cancel rename

**Status:** COMPLETED

**Files to modify:**
- `src/renderer/components/FileTree/FileTreeItem.tsx`

**Implementation:**

1. **Add rename submission handler** (after handleDoubleClick):

```typescript
const handleRenameSubmit = () => {
  const trimmedValue = editValue.trim();

  // Validate: not empty and different from current name
  if (trimmedValue && trimmedValue !== node.name) {
    onRename(node.path, trimmedValue);
  }

  // Exit rename mode regardless of whether we submitted
  setIsRenaming(false);
  setEditValue(node.name); // Reset to current name
};
```

2. **Add cancel handler**:

```typescript
const handleRenameCancel = () => {
  setIsRenaming(false);
  setEditValue(node.name); // Reset to original name
};
```

3. **Add keyboard handler**:

```typescript
const handleRenameKeyDown = (event: React.KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleRenameSubmit();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    handleRenameCancel();
  }
};
```

4. **Add blur handler**:

```typescript
const handleRenameBlur = () => {
  // Auto-save on blur (clicking outside the input)
  handleRenameSubmit();
};
```

**Behavior explanation:**
- **Enter** → Submit rename (if valid), exit rename mode
- **Escape** → Cancel rename, restore original name, exit rename mode
- **Click outside (blur)** → Auto-submit rename
- **Empty name** → Revert to original, exit rename mode (no error)
- **Same name** → No rename operation, just exit rename mode

**Auto-focus implementation** (add useEffect after state):

```typescript
// Focus input when entering rename mode
useEffect(() => {
  if (isRenaming && inputRef.current) {
    inputRef.current.focus();
    // Select all text for easy replacement
    inputRef.current.select();
  }
}, [isRenaming]);
```

**Import useEffect** (update line 1):

```typescript
import { useState, useRef, useEffect } from 'react';
```

**Testing:**
```bash
# Still won't fully work (need parent handler)
# But you can test logic:
# - Enter rename mode
# - Press Enter → exits rename mode
# - Press Escape → exits rename mode, reverts value
# - Click outside → exits rename mode
```

**Commit message:**
```
feat: implement inline rename submit/cancel handlers

Add keyboard shortcuts (Enter/Escape) and blur handling
for inline rename. Auto-selects text when entering rename mode.
```

---

### Task 8: Inline Rename - Connect to Parent Component ✅ COMPLETED

**Objective:** Wire up inline rename to actual file system operation

**Status:** COMPLETED

**Files to modify:**
- `src/renderer/components/FileTree/FileTree.tsx`

**Implementation:**

1. **Add inline rename handler** (after line 183):

```typescript
const handleInlineRename = async (path: string, newName: string) => {
  // Use existing rename function from context
  await rename(path, newName);
};
```

**Why this is simple:**
- Context already has `rename()` function (line 40)
- It handles all the logic: path calculation, IPC call, error handling, tree refresh
- We just need to pass it through to FileTreeItem

2. **Pass onRename prop to FileTreeItem** (update line 311):

```typescript
<FileTreeItem
  node={node}
  depth={node.depth}
  onToggle={toggleExpand}
  onSelect={selectFile}
  onOpen={openFile}
  onContextMenu={handleContextMenu}
  onRename={handleInlineRename} // ADD THIS
  isSelected={node.path === selectedPath}
  isActive={node.path === activePath}
  isDirty={dirtyPaths.has(node.path)}
/>
```

**Testing - Full integration:**
```bash
# 1. Start app
bun start

# 2. Manual test checklist:
# ✓ Single-click file → file opens (becomes active)
# ✓ Double-click same file name → enters rename mode
# ✓ Type new name → input updates
# ✓ Press Enter → file renames, tree updates
# ✓ Double-click again → enter rename mode
# ✓ Press Escape → cancels, keeps old name
# ✓ Double-click → type name → click outside → renames

# 3. Edge cases:
# ✓ Empty name → reverts to original
# ✓ Same name → no operation, just exits
# ✓ Invalid characters (/, \, :, etc.) → backend validation should handle
# ✓ Name conflict → backend should handle (check existing rename implementation)
# ✓ File extension → type "test.md" → should work

# 4. Verify doesn't break existing:
# ✓ Right-click → Rename (modal) → still works
# ✓ Delete still works
# ✓ New file/folder still works
# ✓ Reveal in Finder works (from previous tasks)

# 5. Check DevTools console for errors
```

**Check existing rename implementation:**
- File: `src/renderer/store/fileTreeStore.tsx`
- Find `rename` function to understand error handling
- Verify it shows toast notifications on success/error

**Commit message:**
```
feat: connect inline rename to file system operations

Wire FileTreeItem.onRename to fileTreeStore.rename function.
Completes inline rename feature: double-click active file to rename.
```

---

### Task 9: Add Tests for Reveal in Finder

**Objective:** Test IPC handler and error cases

**Files to create/modify:**
- Create: `src/main/fileSystem/shell.test.ts` (new file for shell operations)
- Or add to: `src/renderer/tests/fileTreeStore.test.tsx`

**Test strategy:**

**Option A: Unit test IPC handler (requires test setup for Electron main)**
```typescript
// src/main/fileSystem/shell.test.ts
import { describe, test, expect, mock } from 'bun:test';
import { shell } from 'electron';

// Note: Testing main process requires Electron test environment
// This is complex - skip for now unless main process tests already exist
```

**Option B: Integration test via renderer (recommended)**
```typescript
// Add to src/renderer/tests/fileTreeStore.test.tsx
import { describe, test, expect } from 'bun:test';

describe('Reveal in Finder', () => {
  test('shows item in file manager when path exists', async () => {
    // This requires mocking window.electronAPI
    // Check if existing tests have mock setup

    const mockShowItem = mock(() => Promise.resolve({ success: true }));
    window.electronAPI = {
      fileSystem: {
        showItemInFolder: mockShowItem,
        // ... other methods
      },
    };

    // Test implementation
    await window.electronAPI.fileSystem.showItemInFolder('/test/path');
    expect(mockShowItem).toHaveBeenCalledWith('/test/path');
  });

  test('handles error when path does not exist', async () => {
    const mockShowItem = mock(() =>
      Promise.resolve({ success: false, error: 'Path not found' })
    );

    // Test error handling
  });
});
```

**Recommended approach:**
```bash
# Manual testing is sufficient for shell integration
# Focus automated tests on component logic

# Test inline rename logic instead (more complex, more value):
```

**Testing inline rename:**
```typescript
// Add to src/renderer/tests/FileTreeItem.test.tsx (create if doesn't exist)
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTreeItem } from '../components/FileTree/FileTreeItem';

describe('FileTreeItem - Inline Rename', () => {
  const mockProps = {
    node: {
      id: '1',
      name: 'test.md',
      path: '/test/test.md',
      type: 'file' as const,
      extension: 'md',
    },
    depth: 0,
    onToggle: () => {},
    onSelect: () => {},
    onOpen: () => {},
    onContextMenu: () => {},
    onRename: mock(() => {}),
    isSelected: false,
    isActive: true, // Must be active for double-click rename
    isDirty: false,
  };

  test('enters rename mode on double-click when active', () => {
    const { container } = render(<FileTreeItem {...mockProps} />);

    const nameSpan = screen.getByText('test.md');
    fireEvent.doubleClick(nameSpan);

    // Input should appear
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect(input?.value).toBe('test.md');
  });

  test('does not enter rename mode when not active', () => {
    const { container } = render(
      <FileTreeItem {...mockProps} isActive={false} />
    );

    const nameSpan = screen.getByText('test.md');
    fireEvent.doubleClick(nameSpan);

    // Input should NOT appear
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeFalsy();
  });

  test('submits rename on Enter key', () => {
    const onRename = mock(() => {});
    const { container } = render(
      <FileTreeItem {...mockProps} onRename={onRename} />
    );

    // Enter rename mode
    const nameSpan = screen.getByText('test.md');
    fireEvent.doubleClick(nameSpan);

    // Type new name
    const input = container.querySelector('input[type="text"]');
    fireEvent.change(input!, { target: { value: 'renamed.md' } });

    // Press Enter
    fireEvent.keyDown(input!, { key: 'Enter' });

    // Should call onRename with new name
    expect(onRename).toHaveBeenCalledWith('/test/test.md', 'renamed.md');
  });

  test('cancels rename on Escape key', () => {
    const onRename = mock(() => {});
    const { container } = render(
      <FileTreeItem {...mockProps} onRename={onRename} />
    );

    // Enter rename mode
    fireEvent.doubleClick(screen.getByText('test.md'));

    // Type new name
    const input = container.querySelector('input[type="text"]');
    fireEvent.change(input!, { target: { value: 'renamed.md' } });

    // Press Escape
    fireEvent.keyDown(input!, { key: 'Escape' });

    // Should NOT call onRename
    expect(onRename).not.toHaveBeenCalled();

    // Should exit rename mode
    expect(container.querySelector('input[type="text"]')).toBeFalsy();
  });

  test('does not rename when value is empty', () => {
    const onRename = mock(() => {});
    const { container } = render(
      <FileTreeItem {...mockProps} onRename={onRename} />
    );

    fireEvent.doubleClick(screen.getByText('test.md'));

    const input = container.querySelector('input[type="text"]');
    fireEvent.change(input!, { target: { value: '   ' } }); // Whitespace
    fireEvent.keyDown(input!, { key: 'Enter' });

    expect(onRename).not.toHaveBeenCalled();
  });

  test('does not rename when value is unchanged', () => {
    const onRename = mock(() => {});
    const { container } = render(
      <FileTreeItem {...mockProps} onRename={onRename} />
    );

    fireEvent.doubleClick(screen.getByText('test.md'));

    // Keep same name
    const input = container.querySelector('input[type="text"]');
    fireEvent.keyDown(input!, { key: 'Enter' });

    expect(onRename).not.toHaveBeenCalled();
  });
});
```

**Check test setup:**
```bash
# Verify testing environment is configured
cat bunfig.toml

# Should see preload scripts for happy-dom and testing-library
# If FileTreeItem.test.tsx doesn't exist, create it
```

**Run tests:**
```bash
# Run all tests
bun test

# Run specific test file
bun test src/renderer/tests/FileTreeItem.test.tsx

# Run with UI
bun test:ui
```

**Commit message:**
```
test: add unit tests for inline rename functionality

Test double-click behavior, keyboard shortcuts (Enter/Escape),
empty value handling, and unchanged value detection.
```

---

### Task 10: Update Documentation

**Objective:** Document the new features and changes

**Files to modify:**
- `CLAUDE.md` (project docs)
- `docs/milestone-1-progress.md` (if exists)

**Implementation:**

1. **Update CLAUDE.md** - Add to "Known Limitations" section:

```markdown
## Known Limitations (Milestone 1)

- ~~Find functionality (Cmd+F) defined but not implemented~~ (unchanged)
- Word count calculation is approximate (strips HTML tags)
- Cursor position tracking is placeholder (always shows 1:1)
```

2. **Update CLAUDE.md** - Add to "Component Structure" or create "File Tree Features" section:

```markdown
### File Tree Features

**Context Menu:**
- Right-click any file/folder to access context menu
- Available actions:
  - New File / New Folder (directories only)
  - Rename (via modal)
  - Delete (with confirmation)
  - Refresh directory tree
  - Reveal in Finder/Explorer (opens system file manager)

**Inline Rename:**
- Single-click a file to open it
- Double-click the active file's name in the tree
- Edit name directly in place
- Submit: Enter key or click outside
- Cancel: Escape key
- Validation: prevents empty names, ignores unchanged names

**Modal Rename:**
- Alternative to inline rename
- Right-click → "Rename"
- Input dialog with Cancel/Rename buttons
- ESC key to cancel (modal does not close on backdrop click)
```

3. **Create changelog entry** (if project has CHANGELOG.md):

```markdown
## [Unreleased]

### Added
- Reveal in Finder/Explorer functionality in file tree context menu
- Inline rename: double-click active file to rename in place
- Keyboard shortcuts for inline rename: Enter (submit), Escape (cancel)

### Fixed
- Context menu "Reveal in Finder" now works (previously only logged to console)
- Rename modal no longer dismisses when clicking input field
- Modal backdrop click removed to prevent accidental cancellation

### Changed
- Improved UX for file renaming with two methods: modal and inline
- File tree context menu now has full functionality
```

4. **Update README.md** (if has Features section):

```markdown
### File Management
- ✅ Directory tree with virtual scrolling
- ✅ File operations: create, rename (modal + inline), delete
- ✅ Context menu with right-click actions
- ✅ Reveal in system file manager
- ✅ Keyboard navigation (arrow keys, Enter)
- ✅ Search/filter files
```

**Commit message:**
```
docs: document context menu fixes and inline rename

Update CLAUDE.md with file tree features, inline rename usage,
and resolved limitations. Add changelog entries.
```

---

### Task 11: Final Testing and Polish

**Objective:** Comprehensive testing across all features

**Testing checklist:**

```markdown
## Manual Testing Checklist

### Reveal in Finder
- [ ] Right-click file → Reveal in Finder → File manager opens, file highlighted
- [ ] Right-click folder → Reveal in Finder → File manager opens, folder highlighted
- [ ] Works on macOS Finder
- [ ] Works on Windows Explorer (if testing on Windows)
- [ ] Works on Linux file manager (if testing on Linux)
- [ ] Error handling: modify code to use invalid path → error toast shows

### Rename Modal (Existing Feature - Verify Not Broken)
- [ ] Right-click → Rename → modal opens
- [ ] Click on input field → modal stays open
- [ ] Click near input edge → modal stays open
- [ ] Click backdrop → modal stays open
- [ ] Press ESC → modal closes (if implemented)
- [ ] Click Cancel → modal closes
- [ ] Enter new name → Rename → file renames, modal closes
- [ ] Empty name → Rename button disabled or shows error

### Inline Rename (New Feature)
- [ ] Single-click file → file opens (active state)
- [ ] Double-click inactive file → does NOT enter rename mode
- [ ] Double-click active file name → enters rename mode
- [ ] Input field appears with current name
- [ ] Text is auto-selected
- [ ] Input is focused (can type immediately)
- [ ] Type new name → Enter → file renames, exits rename mode
- [ ] Type new name → Escape → cancels, keeps old name
- [ ] Type new name → click outside → auto-saves, exits rename mode
- [ ] Empty name → Enter → reverts to original, exits rename mode
- [ ] Same name → Enter → no operation, exits rename mode
- [ ] Special characters → handles or shows error (backend validation)
- [ ] File extension change (test.md → test.txt) → works
- [ ] Long filename → input scrolls or truncates appropriately
- [ ] Rename while file has unsaved changes (isDirty) → works

### Context Menu (Verify All Actions)
- [ ] New File → works
- [ ] New Folder → works
- [ ] Rename → works
- [ ] Delete → works, shows confirmation
- [ ] Refresh → works, reloads tree
- [ ] Reveal in Finder → works

### Regression Testing
- [ ] File tree search still works
- [ ] Virtual scrolling still works (test with 100+ files)
- [ ] Keyboard navigation (arrows, Enter) still works
- [ ] File watching still works (modify file externally → tree updates)
- [ ] Dirty state indicator (orange dot) still shows
- [ ] Multiple directory switching doesn't leak watchers

### Cross-browser/Platform Testing
- [ ] macOS (primary platform)
- [ ] Windows (if applicable)
- [ ] Linux (if applicable)

### Performance Testing
- [ ] Large directory (1000+ files) → tree loads fast
- [ ] Rapid double-clicks → doesn't cause issues
- [ ] Rename many files quickly → no UI lag
```

**Run automated tests:**
```bash
# All tests
bun test

# With coverage
bun test:coverage

# Check coverage report
open coverage/index.html

# Linting
bun run lint
```

**Check for console errors:**
```bash
# Start app with DevTools open
bun start

# Check Console tab for:
# - No red errors
# - No warnings (except known ones)
# - Verify "🔌 Preload script loaded" appears
```

**Commit message:**
```
test: comprehensive manual testing of context menu features

Verify reveal in finder, inline rename, modal fixes, and
ensure no regressions in existing functionality.
```

---

## Implementation Order

**Recommended sequence:**

1. **Task 1-3:** Reveal in Finder (main → preload → UI) - Complete feature chain
2. **Task 4:** Rename modal fix - Quick win, improves UX immediately
3. **Task 5-8:** Inline rename - Build up incrementally, test at each step
4. **Task 9:** Tests - Solidify inline rename with automated tests
5. **Task 10:** Documentation - Capture what was built
6. **Task 11:** Final testing - Ensure quality

**Estimated time:**
- Tasks 1-3: 30 minutes (straightforward IPC setup)
- Task 4: 5 minutes (one-line change)
- Tasks 5-8: 1-2 hours (new feature, needs careful testing)
- Task 9: 30-60 minutes (test writing)
- Task 10: 15 minutes (documentation)
- Task 11: 30 minutes (comprehensive testing)

**Total: ~3-4 hours**

## Commit Strategy

**After each task:** Commit with descriptive message following conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `test:` for tests
- `docs:` for documentation
- `refactor:` for code restructuring

**Before final commit:** Run full test suite and linting

**Final commit message:**
```
feat: complete context menu functionality and inline rename

- Add reveal in system file manager
- Fix rename modal backdrop dismissal
- Implement inline rename with double-click
- Add comprehensive tests and documentation

Closes #[issue-number]
```

## Troubleshooting

### Issue: Reveal in Finder does nothing
- Check DevTools Console for IPC errors
- Verify handler registered in main.ts
- Verify preload exposes method
- Check path is absolute, not relative
- Try with simple path: `/Users/username/Desktop/test.md`

### Issue: Double-click opens file instead of rename
- Verify file is active (highlighted with primary color)
- Check `isActive` prop is true
- Add console.log in handleDoubleClick to debug
- Ensure handleDoubleClick has `event.stopPropagation()`

### Issue: Input doesn't focus in rename mode
- Check useEffect runs (add console.log)
- Verify inputRef is attached to input element
- Check autoFocus attribute is on input

### Issue: Tests fail with "window is not defined"
- Verify `@happy-dom/global-registrator` is loaded
- Check `bunfig.toml` has correct preload
- Ensure test imports from 'vitest' (for IDE compatibility)
- Run with: `bun test` (not `vitest`)

### Issue: TypeScript errors on electronAPI
- Update `src/shared/types/index.ts` with new method
- Run `bun run lint` to see specific errors
- Check preload.ts signature matches types file

## Principles Applied

### DRY (Don't Repeat Yourself)
- Reuse existing `rename()` function from context for inline rename
- InputModal component used for all input dialogs (new file, folder, rename)
- Single IPC handler for reveal in finder, not per-file-type

### YAGNI (You Aren't Gonna Need It)
- No custom modal for inline rename (use inline input instead)
- No animation for rename transition (keep it simple)
- No advanced validation (rely on backend file system errors)
- No undo/redo for rename (out of scope)

### TDD (Test-Driven Development)
- Write tests for inline rename logic (Task 9)
- Test keyboard shortcuts, edge cases, validation
- Manual testing checklist before completion
- Automated tests for regression prevention

### Small Commits
- Each task = one commit
- One feature/fix per commit
- Atomic changes that can be reverted independently
- Clear commit messages explaining "why" not just "what"

## Success Criteria

**Feature complete when:**
1. ✅ Right-click → Reveal in Finder → System file manager opens
2. ✅ Right-click → Rename → Modal stays open when clicking input
3. ✅ Double-click active file → Inline rename works
4. ✅ Enter/Escape/Blur handle rename correctly
5. ✅ All tests pass (`bun test`)
6. ✅ No linting errors (`bun run lint`)
7. ✅ Documentation updated
8. ✅ Manual testing checklist complete
9. ✅ No console errors in DevTools
10. ✅ No regressions in existing features

## Notes for Future Enhancements

**Not included in this plan (future work):**
- Undo/redo for rename operations
- Batch rename (multiple files)
- Rename with file extension separated (like macOS Finder)
- Inline rename for directories (currently only files)
- Drag-and-drop to rename
- Auto-suggest/validation for allowed characters
- Rename conflict resolution UI (currently relies on backend)

**Architecture improvements to consider:**
- Move shell operations to dedicated handler file (`src/main/fileSystem/shellHandlers.ts`)
- Create generic modal system with backdrop configuration
- Add rename state to fileTreeStore instead of local component state
- Add telemetry for feature usage tracking
