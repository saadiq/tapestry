# New File Button Implementation Plan

## Overview

This document provides a complete implementation guide for making the "New File" button in the TitleBar functional. Currently, the button exists in the UI but does nothing when clicked (it only logs to console). This plan will guide you through implementing a working new file creation workflow that integrates with the existing file tree system.

### Architecture Summary

1. **Current State**: The "New File" button in TitleBar (`src/renderer/components/Layout/TitleBar.tsx`) is connected to a placeholder handler that only logs to console
2. **Desired State**: Clicking the button opens a modal dialog, prompts for a filename, creates the file in the root directory, and opens it in the editor
3. **Key Pattern**: This implementation follows the same modal-based workflow already used in the FileTree component for context menu actions

### Key Design Decisions

- **File location**: New files are created in the root directory of the currently open folder
- **Modal-based UX**: Uses the existing `InputModal` component for consistency with FileTree behavior
- **Auto-extension**: Automatically appends `.md` extension if user doesn't provide one (handled by `createFile` in FileTreeStore)
- **Integration**: Leverages existing `createFile` method from `FileTreeProvider` context
- **Auto-open**: After successful creation, the new file is automatically opened in the editor
- **Error handling**: Shows toast notifications for success/failure states using error details from FileTreeContext
- **Security**: Validates filenames to prevent path traversal attacks (rejects `/`, `\`, and `..`)
- **Path construction**: Uses forward slashes (`/`) which work cross-platform (Node.js normalizes for OS)

## Prerequisites

### Required Knowledge

#### React Hooks & Context API
This project uses React Context API for state management. Key concepts:
- **Context**: Shared state accessible across components without prop drilling
- **Provider**: Component that wraps children and provides context value
- **useContext**: Hook to access context value in any child component
- **Custom hooks**: Reusable logic wrapped in hooks (like `useFileTreeContext`)

Example from this codebase:
```tsx
// In fileTreeStore.tsx - creating context
const FileTreeContext = createContext<FileTreeContextValue | null>(null);

// Provider wraps the app
<FileTreeProvider>
  <AppContent />
</FileTreeProvider>

// Components access via custom hook
const { createFile, setActiveFile } = useFileTreeContext();
```

#### Bun Test Runner
This project uses **bun's native test runner** (NOT vitest/jest), but imports from 'vitest' for IDE compatibility:
- **Test files**: `*.test.ts` or `*.test.tsx` files in `src/renderer/tests/`
- **Running tests**: `bun test` (runs all), `bun test:ui` (interactive UI), `bun test:coverage` (with coverage)
- **DOM testing**: Uses `@happy-dom/global-registrator` for DOM environment
- **Matchers**: jest-dom matchers are manually extended to bun:test's expect
- **Preload**: `bunfig.toml` preloads helpers before tests run

Key differences from vitest/jest:
- The `@vitest-environment` directive does NOT work
- Import from 'vitest' but tests execute via `bun test`
- Setup is in `happydom.ts` and `testing-library.ts` preload files

#### Testing Library
Uses `@testing-library/react` for component testing:
- **render**: Renders a component for testing
- **renderHook**: Renders a hook in isolation for testing
- **screen**: Query rendered components (`screen.getByText`, etc.)
- **fireEvent / userEvent**: Simulate user interactions
- **act**: Wrap state updates to ensure they complete
- **waitFor**: Wait for async operations

Example test pattern:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

it('should do something', () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByText('Button'));
  expect(screen.getByText('Result')).toBeInTheDocument();
});
```

#### IPC Architecture (Electron)
This is an Electron app with separate processes:
- **Main Process** (`src/main/`): Node.js environment with file system access
- **Renderer Process** (`src/renderer/`): Browser environment with React UI
- **Preload Script** (`src/main/preload.ts`): Security bridge using `contextBridge`

Communication flow:
1. Renderer calls `window.electronAPI.fileSystem.createFile(path, content)`
2. Preload script forwards via `ipcRenderer.invoke('fs:createFile', ...)`
3. Main process handler in `main.ts` calls file system function
4. Result flows back through IPC to renderer

**Important**: Never call IPC directly from renderer. Always use the `fileSystemService` wrapper.

#### Modal Pattern
This codebase uses reusable modal components:
- **InputModal** (`src/renderer/components/Modals/InputModal.tsx`): Prompts user for text input
- **ConfirmDialog** (`src/renderer/components/Modals/ConfirmDialog.tsx`): Asks yes/no questions
- **Pattern**: Parent component controls modal state, modal calls callbacks on confirm/cancel

Example modal state:
```tsx
const [modal, setModal] = useState<{ isOpen: boolean; /* ...other data */ }>({
  isOpen: false,
});

// Open modal
setModal({ isOpen: true });

// In JSX
<InputModal
  isOpen={modal.isOpen}
  onConfirm={(value) => { /* handle */ setModal({ isOpen: false }); }}
  onCancel={() => setModal({ isOpen: false })}
/>
```

### Development Environment
- Node.js and bun installed
- TypeScript and React knowledge
- Familiarity with Electron (helpful but not required - follow IPC patterns)
- Git for commits

### Understanding the Toolchain

#### Path Aliases
This project uses TypeScript path aliases for cleaner imports:
- `@main/*` → `src/main/*`
- `@renderer/*` → `src/renderer/*`
- `@shared/*` → `src/shared/*`

Configured in `tsconfig.json` and Vite config. Use these instead of relative paths like `../../../shared/types`.

#### DaisyUI Components
UI library providing pre-styled components:
- **btn**: Button styles (`btn`, `btn-primary`, `btn-ghost`, etc.)
- **modal**: Modal dialogs
- **input**: Form inputs
- **toast**: Notification messages

Example:
```tsx
<button className="btn btn-primary">Click Me</button>
```

#### Lucide Icons
Icon library used throughout the app:
```tsx
import { FileText, FolderOpen } from 'lucide-react';
<FileText className="h-5 w-5" />
```

## Implementation Status

- ✅ **Phase 1**: Add Modal State to App Component - COMPLETED
- ✅ **Phase 2**: Implement New File Handler Logic (with security validation) - COMPLETED
- ✅ **Phase 3**: Wire Up Modal UI - COMPLETED
- ⏳ **Phase 4**: Add Unit Tests (including security tests) - NOT STARTED
- ⏳ **Phase 5**: Manual Testing & Documentation - NOT STARTED

## Implementation Tasks

### Phase 1: Add Modal State to App Component

This phase adds the UI state needed to show/hide the new file modal. We follow React's controlled component pattern where parent (App) controls modal visibility.

---

#### Task 1.1: Add modal state variable

**Status**: ✅ Completed

**Description**: Add React state to track whether the new file modal is open or closed. This is a simple boolean flag.

**Why this matters**: React components need state to track UI changes. When the button is clicked, we'll set this to `true` to show the modal. When the user confirms or cancels, we'll set it to `false` to hide it.

**Files to modify**:
- `src/renderer/App.tsx`

**Location in file**:
- Add import for `useState` at the top (if not already imported - it should be on line 6)
- Add state declaration around line 126, after existing `useState` declarations for `wordCount` and `cursorPosition`

**Implementation**:

Find this section in `App.tsx` (around line 125-126):
```tsx
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
```

Add the new state right after it:
```tsx
  const [wordCount, setWordCount] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // New file modal state
  const [newFileModal, setNewFileModal] = useState<{ isOpen: boolean }>({
    isOpen: false,
  });
```

**Explanation**:
- `newFileModal` is the state variable containing `{ isOpen: false }`
- `setNewFileModal` is the function to update this state
- `<{ isOpen: boolean }>` is the TypeScript type annotation ensuring type safety
- Initial value is `{ isOpen: false }` so the modal starts hidden

**Testing this change**:
```bash
# Check that the app still compiles
bun start

# You should see no errors in the terminal
# The app behavior won't change yet - we're just adding state
```

**What could go wrong**:
- **Error: "useState is not defined"**: Make sure `useState` is imported at the top: `import { useState, ... } from 'react';`
- **TypeScript error about type**: Make sure the angle brackets `<{ isOpen: boolean }>` are exactly as shown

**Commit message**:
```
feat: add new file modal state to App component

Add useState for tracking new file modal visibility.
This is the first step toward making the "New File" button functional.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] File compiles without TypeScript errors
- [ ] App starts with `bun start` without errors
- [ ] No runtime errors in browser console
- [ ] Git diff shows only the new lines added (no accidental changes)

---

### Phase 2: Implement New File Handler Logic

This phase replaces the placeholder `handleNewFile` function with real logic that creates files and opens them.

---

#### Task 2.1: Update handleNewFile to open the modal

**Status**: ✅ Completed

**Description**: Replace the console.log placeholder in `handleNewFile` with code that opens the modal. Also add a guard to ensure we only open the modal when a folder is open.

**Why this matters**: The button currently does nothing useful. This makes it actually show the modal when clicked. The guard prevents errors if the user clicks the button before opening a folder.

**Files to modify**:
- `src/renderer/App.tsx`

**Location in file**:
- Find `handleNewFile` function around line 233-236

**Current code** (around line 233):
```tsx
  const handleNewFile = useCallback(() => {
    // New file is handled via file tree context menu
    console.log('New file: Use context menu in file tree');
  }, []);
```

**Replace with**:
```tsx
  const handleNewFile = useCallback(() => {
    // Can only create files when a folder is open
    if (!rootPath) {
      toast.showWarning('Please open a folder first');
      return;
    }

    // Open the new file modal
    setNewFileModal({ isOpen: true });
  }, [rootPath, toast]);
```

**Explanation**:
- `if (!rootPath)`: Check if a folder is open. If not, show a warning and exit early
- `toast.showWarning(...)`: Display a toast notification to guide the user
- `setNewFileModal({ isOpen: true })`: Open the modal by setting state to true
- Dependencies `[rootPath, toast]`: React requires these in the dependency array because we use them in the callback

**Testing this change**:
```bash
# Start the app
bun start

# In the app:
# 1. Click "New File" button WITHOUT opening a folder first
#    → Should see a warning toast: "Please open a folder first"
# 2. Open a folder (File → Open Folder or Cmd+O)
# 3. Click "New File" button
#    → Nothing visible yet (modal UI not added), but no errors in console
```

**What could go wrong**:
- **Error: "setNewFileModal is not defined"**: Make sure you completed Task 1.1 first
- **Error: "toast is not defined"**: This should already exist from line 124: `const toast = useToast();`
- **Error: "rootPath is not defined"**: This should already exist from line 116-123

**Commit message**:
```
feat: make New File button open modal dialog

Replace console.log placeholder with logic to open new file modal.
Includes guard to require an open folder before creating files.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] TypeScript compiles without errors
- [ ] Warning toast appears when clicking button with no folder open
- [ ] No errors in console when clicking button with folder open
- [ ] Dependencies array includes `[rootPath, toast]`

---

#### Task 2.2: Implement modal confirm handler

**Status**: ✅ Completed

**Description**: Create a new function `handleNewFileConfirm` that gets called when the user submits the modal. This function will create the file, open it in the editor, and show success/error toasts.

**Why this matters**: This is the core business logic - taking the filename from the modal, creating the file via the file tree context, and providing user feedback.

**Files to modify**:
- `src/renderer/App.tsx`

**Location in file**:
- Add new function right after `handleNewFile` (after line 240)

**Implementation**:

Add this new function after `handleNewFile`:
```tsx
  const handleNewFileConfirm = useCallback(async (fileName: string) => {
    if (!rootPath) {
      toast.showError('No folder is open');
      setNewFileModal({ isOpen: false });
      return;
    }

    // Security: Prevent path traversal attacks
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
      toast.showError('Filename cannot contain path separators or ".."');
      setNewFileModal({ isOpen: false });
      return;
    }

    try {
      // Close modal immediately for better UX
      setNewFileModal({ isOpen: false });

      // Create file in root directory using file tree context
      // Note: createFile handles adding .md extension internally
      const success = await createFile(rootPath, fileName);

      if (!success) {
        // Use detailed error from FileTreeContext instead of generic message
        toast.showError(fileTreeError || 'Failed to create file');
        return;
      }

      // Build the full path to the new file for opening in editor
      // We must normalize extension here because createFile doesn't return the path
      // This duplication with createFile's internal logic is acceptable (YAGNI)
      const normalizedFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
      // Use forward slash - works cross-platform, Node.js normalizes in main process
      const newFilePath = `${rootPath}/${normalizedFileName}`;

      // Open the newly created file in the editor
      setActiveFile(newFilePath);

      // Show success notification
      toast.showSuccess(`File "${normalizedFileName}" created successfully`);
    } catch (error) {
      console.error('Error creating file:', error);
      toast.showError(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [rootPath, createFile, setActiveFile, toast, fileTreeError]);
```

**Explanation**:
- `async (fileName: string)`: The modal will pass the user's input as `fileName`
- `if (!rootPath)`: Safety check (shouldn't happen, but defensive programming)
- **Security validation**: Rejects filenames containing `/`, `\`, or `..` to prevent path traversal attacks (e.g., `../../../etc/passwd`)
- `setNewFileModal({ isOpen: false })`: Close modal immediately (better UX - user sees instant feedback)
- `await createFile(rootPath, fileName)`: Call the existing createFile method from FileTreeProvider
  - **Note**: `createFile` handles `.md` extension internally (see fileTreeStore.tsx line 186)
- `if (!success)`: Use `fileTreeError` from context for detailed error messages instead of generic "Failed to create file"
  - FileTreeContext stores the last error in its state when operations fail
- **Extension normalization**: We normalize here ONLY for building the path to pass to `setActiveFile`
  - This appears redundant with `createFile`'s internal logic, but is necessary because `createFile` doesn't return the created path
  - Minimal duplication is acceptable (YAGNI - don't create utility function for one line)
- **Path construction**: Uses forward slash (`/`) which works cross-platform
  - Node.js's `path` module in main process normalizes to OS-specific separators
  - See fileTreeStore.tsx line 187 for same pattern
- `setActiveFile(newFilePath)`: Opens the file in the editor (this triggers the file loading logic)
- Toast notifications: Show success or error messages to the user
- `try/catch`: Error handling for unexpected failures
- Dependencies: `[rootPath, createFile, setActiveFile, toast, fileTreeError]`

**Where do createFile, setActiveFile, and error come from?**

You need to destructure them from `useFileTreeContext()` at the top of the `AppContent` function. Find this line (around line 116-123):

```tsx
  const {
    loadDirectory,
    openFile: setActiveFile,
    activePath,
    rootPath,
    setFileDirty,
    nodes,
  } = useFileTreeContext();
```

Add `createFile` and `error` to this destructuring:
```tsx
  const {
    loadDirectory,
    openFile: setActiveFile,
    activePath,
    rootPath,
    setFileDirty,
    nodes,
    createFile,  // ADD THIS LINE
    error: fileTreeError,  // ADD THIS LINE - renamed to avoid confusion
  } = useFileTreeContext();
```

**Why rename to `fileTreeError`?** To clearly indicate this error comes from the FileTreeContext and avoid confusion with other error variables.

**Testing this change**:
```bash
# Start the app
bun start

# Test in browser console:
# 1. Open DevTools (already opens automatically)
# 2. In console, type:
#    > window.__testNewFile = () => { /* copy the handleNewFileConfirm body */ }
# 3. Call it: window.__testNewFile('test')
#
# OR just wait for Task 2.3 to wire up the modal
```

**What could go wrong**:
- **Error: "createFile is not defined"**: Make sure you added it to the destructuring from `useFileTreeContext()`
- **Error: "setActiveFile is not defined"**: Should already be there as `openFile: setActiveFile` (we rename it)
- **Error: "fileTreeError is not defined"**: Make sure you added `error: fileTreeError` to the destructuring
- **TypeScript error on fileName.endsWith**: Make sure parameter is typed as `fileName: string`
- **Security validation too strict**: If legitimate filenames are rejected, adjust the validation logic

**Commit message**:
```
feat: implement new file creation logic

Add handleNewFileConfirm to create files, open them in editor,
and show success/error notifications.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] TypeScript compiles without errors
- [ ] `createFile` is destructured from `useFileTreeContext()`
- [ ] `error: fileTreeError` is destructured from `useFileTreeContext()`
- [ ] Dependencies array is `[rootPath, createFile, setActiveFile, toast, fileTreeError]`
- [ ] Function is marked `async`
- [ ] Security validation for path traversal is present
- [ ] Error handling with try/catch is present
- [ ] Comments explain extension normalization and path construction

---

#### Task 2.3: Implement modal cancel handler

**Status**: ✅ Completed

**Description**: Create a simple function to close the modal when the user clicks "Cancel" or presses Escape.

**Why this matters**: Users need a way to dismiss the modal without creating a file. This is standard UX for modal dialogs.

**Files to modify**:
- `src/renderer/App.tsx`

**Location in file**:
- Add right after `handleNewFileConfirm` function

**Implementation**:

Add this simple function:
```tsx
  const handleNewFileCancel = useCallback(() => {
    setNewFileModal({ isOpen: false });
  }, []);
```

**Explanation**:
- Very simple: just closes the modal by setting `isOpen` to false
- No dependencies needed (setNewFileModal is stable from useState)
- Wrapped in `useCallback` for performance (prevents unnecessary re-renders)

**Testing this change**:
Wait until Task 3.1 wires up the modal UI, then test by clicking Cancel.

**What could go wrong**:
- Nothing - this is a trivial function

**Commit message**:
```
feat: add new file modal cancel handler

Simple handler to close the modal when user cancels.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] TypeScript compiles without errors
- [ ] Function is wrapped in `useCallback`
- [ ] Empty dependencies array `[]`

---

### Phase 3: Wire Up Modal UI

This phase adds the actual modal component to the UI and connects the handlers.

---

#### Task 3.1: Import InputModal component

**Status**: ✅ Completed

**Description**: Add the import statement for the InputModal component at the top of App.tsx.

**Why this matters**: We need to use the existing InputModal component. It's already used in FileTree, so we're reusing a proven component for consistency.

**Files to modify**:
- `src/renderer/App.tsx`

**Location in file**:
- Top of file, in the import section (around line 1-23)

**Implementation**:

Find the imports section at the top. You'll see various imports like:
```tsx
import { MainLayout } from './components/Layout/MainLayout';
import { Sidebar } from './components/Sidebar/Sidebar';
...
```

Add this import with the other component imports:
```tsx
import { InputModal } from './components/Modals/InputModal';
```

**Good practice**: Group it near other component imports, alphabetically if you want to be neat.

**Testing this change**:
```bash
bun start
# Should compile with no errors
```

**What could go wrong**:
- **Error: "Cannot find module"**: Check the path is correct: `'./components/Modals/InputModal'`
- **TypeScript error**: The component should exist at `src/renderer/components/Modals/InputModal.tsx`

**Commit message**:
```
feat: import InputModal component in App

Add import for InputModal to use in new file creation workflow.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] Import statement added
- [ ] TypeScript compiles without errors
- [ ] No runtime errors

---

#### Task 3.2: Add InputModal to JSX

**Status**: ✅ Completed

**Description**: Add the InputModal component to the JSX, right after the closing `</MainLayout>` tag and before the `<UpdateNotification />`. This renders the modal in the component tree.

**Why this matters**: React components must be rendered in JSX to appear in the DOM. We position it outside MainLayout so it can overlay the entire app.

**Files to modify**:
- `src/renderer/App.tsx`

**Location in file**:
- Around line 495-537, in the `return` statement of `AppContent` function
- Specifically, between `</MainLayout>` and `<UpdateNotification />`

**Current code** (around line 533-537):
```tsx
      </MainLayout>

      {/* Update notification - renders on top of everything */}
      <UpdateNotification />
    </>
```

**Replace with**:
```tsx
      </MainLayout>

      {/* New File Modal */}
      <InputModal
        isOpen={newFileModal.isOpen}
        title="New File"
        message="Enter a name for the new file:"
        placeholder="notes.md"
        confirmText="Create"
        onConfirm={handleNewFileConfirm}
        onCancel={handleNewFileCancel}
      />

      {/* Update notification - renders on top of everything */}
      <UpdateNotification />
    </>
```

**Explanation**:
- `isOpen={newFileModal.isOpen}`: Controls visibility based on our state
- `title="New File"`: Modal header text
- `message="Enter a name for the new file:"`: Instruction text above input field
- `placeholder="notes.md"`: Gray text shown in empty input to guide user
- `confirmText="Create"`: Text on the confirm button
- `onConfirm={handleNewFileConfirm}`: Callback when user clicks "Create"
- `onCancel={handleNewFileCancel}`: Callback when user clicks "Cancel" or presses Escape

**Testing this change**:
```bash
# Start the app
bun start

# In the app:
# 1. Open a folder (File → Open Folder)
# 2. Click the "New File" button in TitleBar
#    → Modal should appear with title "New File"
# 3. Type a filename like "test-note"
# 4. Click "Create"
#    → Modal should close, file should be created and opened
#    → Toast should show "File 'test-note.md' created successfully"
# 5. Try clicking "New File" again and press Escape or click Cancel
#    → Modal should close without creating anything
```

**What could go wrong**:
- **Modal doesn't appear**: Check that `newFileModal.isOpen` is correctly referenced
- **Handlers don't work**: Make sure `handleNewFileConfirm` and `handleNewFileCancel` exist
- **TypeScript error**: Check that all props match the InputModal component's interface

**Commit message**:
```
feat: add new file modal to UI

Wire up InputModal component with state and handlers.
New File button now functional - opens modal, creates file, and opens in editor.

Closes new-file-button implementation.
```

**Verification checklist**:
- [ ] Modal appears when clicking "New File" button
- [ ] Modal has correct title and placeholder text
- [ ] Typing a filename and clicking "Create" creates the file
- [ ] New file opens in the editor automatically
- [ ] Success toast appears
- [ ] Clicking "Cancel" or Escape closes modal without creating file
- [ ] Warning toast appears when clicking button without open folder

---

### Phase 4: Add Unit Tests

This phase ensures the new functionality is covered by automated tests. We follow TDD principles - even though we wrote code first, we'll add tests now to prevent regressions.

**Testing strategy**:
- Test the modal state management (open/close)
- Test the new file creation flow (success case)
- Test error handling (no folder open)
- Mock the file system service to avoid real file I/O
- Use Testing Library best practices

---

#### Task 4.1: Create test file structure

**Status**: ⏳ Not started

**Description**: Create a new test file for the new file creation functionality. We'll add it to the existing tests directory following the project's test organization.

**Why this matters**: Tests should live in a predictable location. This project keeps all renderer tests in `src/renderer/tests/`.

**Files to create**:
- `src/renderer/tests/App.newFile.test.tsx`

**Why this filename**:
- `App.newFile.test.tsx`: Groups it with App component tests, specifically for new file feature
- Follows pattern of existing `App.autosave.test.tsx` for feature-specific tests

**Implementation**:

Create the file with this initial structure:
```tsx
/**
 * Tests for New File button functionality in App component
 *
 * These tests verify:
 * - New file modal opens when button clicked with folder open
 * - Warning shown when button clicked without folder open
 * - File created in root directory when modal confirmed
 * - New file automatically opens in editor
 * - Success toast shown after creation
 * - Modal closes on cancel
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { fileSystemService } from '../services/fileSystemService';

// Mock the file system service
vi.mock('../services/fileSystemService');

// Mock window.electronAPI
const mockElectronAPI = {
  fileSystem: {
    onFileChange: vi.fn(),
    removeFileChangeListener: vi.fn(),
  },
};

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Setup window.electronAPI mock
  (window as any).electronAPI = mockElectronAPI;
});

describe('App - New File Button', () => {
  // Tests will go here
});
```

**Explanation**:
- Import testing utilities from 'vitest' (executes via bun test)
- Import App component to test
- Mock `fileSystemService` to avoid real file I/O
- Mock `window.electronAPI` since App component uses it for file watchers
- `beforeEach`: Reset mocks before each test for isolation
- Comment at top documents what we're testing (good practice)

**Testing this change**:
```bash
# Run the test file (it has no tests yet, so it should pass)
bun test src/renderer/tests/App.newFile.test.tsx

# Expected output:
# Test Files  1 passed (1)
#      Tests  no tests
```

**What could go wrong**:
- **Import errors**: Make sure paths are correct relative to test file location
- **Mock errors**: The mock setup should match the service's structure

**Commit message**:
```
test: add test file for new file button functionality

Create test structure for new file creation workflow.
No tests yet - just setup and mocks.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] Test file created in correct location
- [ ] File imports compile without errors
- [ ] `bun test` runs without errors
- [ ] Mocks are set up

---

#### Task 4.2: Write test for "no folder open" warning

**Status**: ⏳ Not started

**Description**: Write a test that verifies a warning toast appears when clicking "New File" button without a folder open.

**Why this matters**: This tests the guard clause we added in Task 2.1. It ensures users get helpful feedback instead of errors when using the button incorrectly.

**Files to modify**:
- `src/renderer/tests/App.newFile.test.tsx`

**Location in file**:
- Inside the `describe('App - New File Button')` block

**Implementation**:

Add this test:
```tsx
describe('App - New File Button', () => {
  it('should show warning when clicking New File without folder open', async () => {
    // Render the app
    render(<App />);

    // Find the New File button by its title attribute
    const newFileButton = screen.getByTitle('New File (⌘N)');

    // Click it
    fireEvent.click(newFileButton);

    // Wait for warning toast to appear
    await waitFor(() => {
      expect(screen.getByText('Please open a folder first')).toBeInTheDocument();
    });

    // Modal should NOT appear
    expect(screen.queryByText('Enter a name for the new file:')).not.toBeInTheDocument();
  });
});
```

**Explanation**:
- `render(<App />)`: Renders the full App component in a test environment
- `screen.getByTitle(...)`: Finds the New File button by its title attribute (from TitleBar.tsx line 53)
- `fireEvent.click(...)`: Simulates a user click
- `waitFor(...)`: Waits for async toast to appear (toasts may animate in)
- `expect(...).toBeInTheDocument()`: Asserts the warning text is visible
- `queryByText(...)`: Returns null if not found (doesn't throw like `getByText`)
- `.not.toBeInTheDocument()`: Asserts modal did NOT open

**Testing this change**:
```bash
bun test src/renderer/tests/App.newFile.test.tsx
```

**Expected result**: Test should PASS

**What could go wrong**:
- **Test fails**: Make sure Task 2.1 is completed (handleNewFile shows warning)
- **"Unable to find element"**: Check the button title matches exactly
- **Timeout error**: Increase timeout in waitFor: `waitFor(() => {...}, { timeout: 3000 })`

**Debugging tips**:
If test fails, add this before the expect to see what's rendered:
```tsx
screen.debug(); // Prints the entire DOM to console
```

**Commit message**:
```
test: verify warning shown when no folder open

Add test for new file button guard clause.
Ensures user gets helpful message instead of errors.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] Test passes with `bun test`
- [ ] Test fails if you comment out the warning logic (validates test works)
- [ ] Test is clear and readable

---

#### Task 4.3: Write test for successful file creation

**Status**: ⏳ Not started

**Description**: Write a test that verifies the complete happy path: opening a folder, clicking New File, entering a filename, and seeing the file created and opened.

**Why this matters**: This is the core functionality test. It validates the entire workflow works end-to-end.

**Files to modify**:
- `src/renderer/tests/App.newFile.test.tsx`

**Location in file**:
- Add after the previous test in the `describe` block

**Implementation**:

This test is more complex because we need to mock the file system service and file tree provider. Add this test:

```tsx
  it('should create file and open it when modal confirmed', async () => {
    // Mock file system service responses
    const mockReadDirectory = vi.fn().mockResolvedValue([]);
    const mockCreateFile = vi.fn().mockResolvedValue({ success: true });
    const mockReadFile = vi.fn().mockResolvedValue({
      path: '/test-folder/new-note.md',
      content: '',
      metadata: {
        name: 'new-note.md',
        size: 0,
        modified: new Date(),
        isDirectory: false,
        extension: '.md',
      },
    });

    vi.mocked(fileSystemService).readDirectory = mockReadDirectory;
    vi.mocked(fileSystemService).createFile = mockCreateFile;
    vi.mocked(fileSystemService).readFile = mockReadFile;
    vi.mocked(fileSystemService).watchDirectory = vi.fn().mockResolvedValue(undefined);

    // Render app
    render(<App />);

    // Simulate opening a folder first
    // We'll call the handler directly since testing the full folder dialog is complex
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');

    // Mock the dialog returning a folder path
    const mockOpenDirectory = vi.fn().mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });
    vi.mocked(fileSystemService).openDirectory = mockOpenDirectory;

    // Click open folder and wait for it to process
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalledWith('/test-folder', true);
    });

    // Now click New File button
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Enter filename
    const input = screen.getByPlaceholderText('notes.md');
    fireEvent.change(input, { target: { value: 'new-note' } });

    // Click Create button
    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    // Wait for file to be created
    await waitFor(() => {
      expect(mockCreateFile).toHaveBeenCalledWith('/test-folder', 'new-note');
    });

    // Wait for success toast
    await waitFor(() => {
      expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
    });

    // Modal should close
    expect(screen.queryByText('Enter a name for the new file:')).not.toBeInTheDocument();
  });
```

**Explanation**:
- **Setup phase**: Mock all file system operations to return success
  - `mockReadDirectory`: Returns empty array (folder has no files)
  - `mockCreateFile`: Returns success
  - `mockReadFile`: Returns empty file content (for when file opens)
- **Open folder**: Simulate opening a folder first (required before creating files)
- **Open modal**: Click New File button, verify modal appears
- **Enter filename**: Simulate typing in the input field
- **Submit**: Click Create button
- **Assertions**: Verify createFile was called with correct params, success toast appears, modal closes

**Testing this change**:
```bash
bun test src/renderer/tests/App.newFile.test.tsx
```

**Expected result**: Both tests should PASS

**What could go wrong**:
- **"Cannot read property 'readDirectory' of undefined"**: Make sure mock is set up correctly
- **Test timeout**: File operations are async; increase waitFor timeout if needed
- **"Element not found"**: Use `screen.debug()` to see what's actually rendered

**Important note about testing with Context**:
If this test fails because App needs providers, you may need to wrap it:
```tsx
import { ToastProvider } from '../components/Notifications';
import { FileTreeProvider } from '../store/fileTreeStore';

// Then in test:
render(
  <ToastProvider>
    <FileTreeProvider>
      <App />
    </FileTreeProvider>
  </ToastProvider>
);
```

However, check if App.tsx already includes providers internally (it should based on line 540-550).

**Commit message**:
```
test: verify successful file creation workflow

Add end-to-end test for new file creation happy path.
Tests modal opening, file creation, and editor opening.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] Test passes with `bun test`
- [ ] All file system calls are properly mocked
- [ ] Test validates both success toast and modal closing
- [ ] Test is clear about what it's testing

---

#### Task 4.4: Write test for modal cancel behavior

**Status**: ⏳ Not started

**Description**: Write a test that verifies clicking Cancel closes the modal without creating a file.

**Why this matters**: Users should be able to cancel out of the workflow. This tests that canceling doesn't have side effects.

**Files to modify**:
- `src/renderer/tests/App.newFile.test.tsx`

**Location in file**:
- Add after the previous test

**Implementation**:

Add this test:
```tsx
  it('should close modal without creating file when cancelled', async () => {
    // Mock file system service
    const mockReadDirectory = vi.fn().mockResolvedValue([]);
    const mockCreateFile = vi.fn().mockResolvedValue({ success: true });
    const mockOpenDirectory = vi.fn().mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });

    vi.mocked(fileSystemService).readDirectory = mockReadDirectory;
    vi.mocked(fileSystemService).createFile = mockCreateFile;
    vi.mocked(fileSystemService).openDirectory = mockOpenDirectory;
    vi.mocked(fileSystemService).watchDirectory = vi.fn().mockResolvedValue(undefined);

    render(<App />);

    // Open a folder first
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Click New File button
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Click Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Enter a name for the new file:')).not.toBeInTheDocument();
    });

    // createFile should NOT have been called
    expect(mockCreateFile).not.toHaveBeenCalled();
  });
```

**Explanation**:
- Similar setup to previous test
- After opening modal, click Cancel instead of Create
- Assert modal closes: `queryByText` returns null, `.not.toBeInTheDocument()`
- Assert no file was created: `mockCreateFile` should never be called

**Testing this change**:
```bash
bun test src/renderer/tests/App.newFile.test.tsx
```

**Expected result**: All 3 tests should PASS

**Commit message**:
```
test: verify modal cancel behavior

Ensure canceling the new file modal closes it without creating a file.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] Test passes
- [ ] `mockCreateFile` is verified to NOT be called
- [ ] All 3 tests pass together

---

#### Task 4.5: Add test for keyboard shortcut

**Status**: ⏳ Not started

**Description**: Write a test that verifies the Cmd+N (or Ctrl+N) keyboard shortcut opens the new file modal.

**Why this matters**: The keyboard shortcut is an important UX feature. It's already wired up in `useKeyboardShortcuts` hook, but we should test it works.

**Files to modify**:
- `src/renderer/tests/App.newFile.test.tsx`

**Location in file**:
- Add after previous tests

**Implementation**:

Add this test:
```tsx
  it('should open modal when Cmd+N pressed', async () => {
    // Mock file system
    const mockReadDirectory = vi.fn().mockResolvedValue([]);
    const mockOpenDirectory = vi.fn().mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });

    vi.mocked(fileSystemService).readDirectory = mockReadDirectory;
    vi.mocked(fileSystemService).openDirectory = mockOpenDirectory;
    vi.mocked(fileSystemService).watchDirectory = vi.fn().mockResolvedValue(undefined);

    render(<App />);

    // Open a folder first
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Press Cmd+N (or Ctrl+N on Windows/Linux)
    fireEvent.keyDown(document, {
      key: 'n',
      code: 'KeyN',
      metaKey: true, // Cmd on Mac
      ctrlKey: false,
    });

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });
  });
```

**Explanation**:
- `fireEvent.keyDown(document, ...)`: Simulates a keyboard event on the document
- `key: 'n'`: The key that was pressed
- `metaKey: true`: The Cmd key on Mac (use `ctrlKey: true` for Ctrl)
- Test verifies modal opens just like clicking the button

**Note about cross-platform testing**:
The keyboard shortcut handler checks for both `metaKey` (Mac) and `ctrlKey` (Windows/Linux). This test uses `metaKey` but you could add a second test for `ctrlKey` if you want full coverage.

**Testing this change**:
```bash
bun test src/renderer/tests/App.newFile.test.tsx
```

**Expected result**: All 4 tests should PASS

**What could go wrong**:
- **Modal doesn't appear**: Make sure `useKeyboardShortcuts` hook is active in App
- **Event doesn't trigger**: Try `fireEvent.keyDown(document.body, ...)` instead

**Commit message**:
```
test: verify keyboard shortcut opens modal

Test that Cmd+N keyboard shortcut triggers new file modal.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] Test passes
- [ ] All 4 tests pass together
- [ ] Test uses correct key event properties

---

#### Task 4.6: Add test for security validation

**Status**: ⏳ Not started

**Description**: Write tests that verify path traversal attempts are blocked by the security validation.

**Why this matters**: Security is critical. We must ensure filenames with path separators or `..` are rejected to prevent creating files outside the root directory.

**Files to modify**:
- `src/renderer/tests/App.newFile.test.tsx`

**Location in file**:
- Add after previous tests

**Implementation**:

Add these security tests:
```tsx
  it('should reject filename with forward slash', async () => {
    // Mock file system
    const mockReadDirectory = vi.fn().mockResolvedValue([]);
    const mockCreateFile = vi.fn().mockResolvedValue({ success: true });
    const mockOpenDirectory = vi.fn().mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });

    vi.mocked(fileSystemService).readDirectory = mockReadDirectory;
    vi.mocked(fileSystemService).createFile = mockCreateFile;
    vi.mocked(fileSystemService).openDirectory = mockOpenDirectory;
    vi.mocked(fileSystemService).watchDirectory = vi.fn().mockResolvedValue(undefined);

    render(<App />);

    // Open a folder first
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Click New File button
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Try malicious filename with forward slash
    const input = screen.getByPlaceholderText('notes.md');
    fireEvent.change(input, { target: { value: 'path/to/file' } });

    // Click Create
    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    // Should show error toast
    await waitFor(() => {
      expect(screen.getByText(/cannot contain path separators/i)).toBeInTheDocument();
    });

    // createFile should NOT be called
    expect(mockCreateFile).not.toHaveBeenCalled();

    // Modal should close
    expect(screen.queryByText('Enter a name for the new file:')).not.toBeInTheDocument();
  });

  it('should reject filename with path traversal (..)', async () => {
    // Similar setup
    const mockReadDirectory = vi.fn().mockResolvedValue([]);
    const mockCreateFile = vi.fn().mockResolvedValue({ success: true });
    const mockOpenDirectory = vi.fn().mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });

    vi.mocked(fileSystemService).readDirectory = mockReadDirectory;
    vi.mocked(fileSystemService).createFile = mockCreateFile;
    vi.mocked(fileSystemService).openDirectory = mockOpenDirectory;
    vi.mocked(fileSystemService).watchDirectory = vi.fn().mockResolvedValue(undefined);

    render(<App />);

    // Open folder
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Open modal
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Try path traversal attack
    const input = screen.getByPlaceholderText('notes.md');
    fireEvent.change(input, { target: { value: '../../../evil' } });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    // Should block it
    await waitFor(() => {
      expect(screen.getByText(/cannot contain path separators/i)).toBeInTheDocument();
    });

    expect(mockCreateFile).not.toHaveBeenCalled();
  });

  it('should reject filename with backslash (Windows paths)', async () => {
    // Similar setup
    const mockReadDirectory = vi.fn().mockResolvedValue([]);
    const mockCreateFile = vi.fn().mockResolvedValue({ success: true });
    const mockOpenDirectory = vi.fn().mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });

    vi.mocked(fileSystemService).readDirectory = mockReadDirectory;
    vi.mocked(fileSystemService).createFile = mockCreateFile;
    vi.mocked(fileSystemService).openDirectory = mockOpenDirectory;
    vi.mocked(fileSystemService).watchDirectory = vi.fn().mockResolvedValue(undefined);

    render(<App />);

    // Open folder
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Open modal
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Try backslash (Windows path separator)
    const input = screen.getByPlaceholderText('notes.md');
    fireEvent.change(input, { target: { value: 'windows\\path' } });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    // Should block it
    await waitFor(() => {
      expect(screen.getByText(/cannot contain path separators/i)).toBeInTheDocument();
    });

    expect(mockCreateFile).not.toHaveBeenCalled();
  });
```

**Explanation**:
- Three tests cover different attack vectors: `/`, `..`, and `\`
- Each test verifies the error message is shown
- Each test verifies `createFile` is NOT called (file not created)
- Each test verifies modal closes after showing error

**Testing this change**:
```bash
bun test src/renderer/tests/App.newFile.test.tsx
```

**Expected result**: All 7 tests (or 8 total) should PASS

**Commit message**:
```
test: add security validation tests for path traversal

Verify that filenames with /, \, or .. are rejected to prevent
creating files outside the root directory.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] All three security tests pass
- [ ] Tests verify error message is shown
- [ ] Tests verify createFile is not called
- [ ] All tests pass together

---

### Phase 5: Manual Testing & Documentation

This phase ensures the feature works in the real app and documents it for users/developers.

---

#### Task 5.1: Manual testing checklist

**Status**: ⏳ Not started

**Description**: Manually test the feature in the running application to ensure it works in real-world conditions. Automated tests are great but can't catch everything (visual issues, timing problems, etc.).

**Why this matters**: Real users will interact with the app in ways tests might not cover. Manual testing catches UI/UX issues.

**Testing procedure**:

Start the app:
```bash
bun start
```

**Test Case 1: No folder open**
1. Start fresh app (no folder open)
2. Click "New File" button in TitleBar
3. ✅ Verify: Warning toast appears: "Please open a folder first"
4. ✅ Verify: Modal does NOT open

**Test Case 2: Create file via button**
1. Open a folder (File → Open Folder, or Cmd+O)
2. Click "New File" button
3. ✅ Verify: Modal opens with title "New File"
4. ✅ Verify: Input has placeholder "notes.md"
5. Type filename: "test-document"
6. Click "Create"
7. ✅ Verify: Modal closes immediately
8. ✅ Verify: Success toast appears: "File 'test-document.md' created successfully"
9. ✅ Verify: File appears in file tree
10. ✅ Verify: File is opened in editor (active/selected)
11. ✅ Verify: File exists on disk at `{folder}/test-document.md`

**Test Case 3: Create file with .md extension**
1. Click "New File" button
2. Type filename with extension: "notes.md"
3. Click "Create"
4. ✅ Verify: File created as "notes.md" (not "notes.md.md")

**Test Case 4: Cancel modal**
1. Click "New File" button
2. Type some text in input
3. Click "Cancel" button
4. ✅ Verify: Modal closes
5. ✅ Verify: No file created
6. ✅ Verify: No toast shown

**Test Case 5: Escape key closes modal**
1. Click "New File" button
2. Press Escape key
3. ✅ Verify: Modal closes

**Test Case 6: Keyboard shortcut**
1. Press Cmd+N (Mac) or Ctrl+N (Windows/Linux)
2. ✅ Verify: Modal opens
3. Type "shortcut-test"
4. Press Enter to submit
5. ✅ Verify: File created and opened

**Test Case 7: Menu item**
1. Click File menu → New File
2. ✅ Verify: Modal opens (same as button)

**Test Case 8: Edge cases and security**
1. Try typing only spaces "   " in filename input
   - ✅ Verify: Create button is disabled (InputModal handles this automatically)
   - ✅ Verify: Cannot submit
2. Try creating file with name: "../outside"
   - ✅ Verify: Error toast shown: "Filename cannot contain path separators or "..""
   - ✅ Verify: Modal closes, no file created
3. Try creating file with name: "path/to/file"
   - ✅ Verify: Error toast shown: "Filename cannot contain path separators or "..""
   - ✅ Verify: Security validation blocks path traversal
4. Try creating file with same name twice
   - First creation: ✅ Verify: File created successfully
   - Second creation: ✅ Verify: Error toast shown with details (e.g., "File already exists")
   - ✅ Verify: Error message comes from fileSystemService (via fileTreeError)

**Test Case 9: File tree integration**
1. Create file "alpha.md"
2. ✅ Verify: File appears in tree alphabetically sorted
3. Create file in subfolder via context menu
4. Create file via New File button
5. ✅ Verify: New button creates in root, not subfolder

**Test Case 10: Cross-platform paths**
1. On Mac: Create file, verify uses Unix paths (/)
2. On Windows: Create file, verify paths work correctly (\\ or /)

**Recording results**:
Create a checklist document or spreadsheet:
- Test case description
- Expected result
- Actual result
- Pass/Fail
- Screenshots for visual issues

**What to do if tests fail**:
- Document the exact failure
- Create a bug report
- Fix the issue
- Re-test

**Commit message** (if you find and fix issues):
```
fix: handle edge case in new file creation

Fixed issue where [describe issue].
Found during manual testing.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] All test cases pass
- [ ] No console errors during testing
- [ ] UI looks correct (no layout issues)
- [ ] Toast notifications appear and disappear correctly
- [ ] File tree updates immediately after creation

---

#### Task 5.2: Update CLAUDE.md with new behavior

**Status**: ⏳ Not started

**Description**: Update the project's CLAUDE.md documentation to reflect that the New File button is now functional.

**Why this matters**: CLAUDE.md is the source of truth for how the app works. Future developers (or AI assistants) will read this to understand the system.

**Files to modify**:
- `CLAUDE.md`

**Location in file**:
- Find the section about file operations or UI components
- Specifically, there's likely a mention of the New File button being non-functional

**Current text to find** (search for "New file"):
Look for any text like "New file is handled via file tree context menu" or similar.

**Update needed**:

Find the relevant section (likely under "Component Structure" or "Code Patterns") and update it.

If there's text like:
```markdown
- **New File button**: Currently non-functional (placeholder)
```

Replace with:
```markdown
- **New File button**: Creates a new markdown file in the root directory of the currently open folder. Opens a modal dialog for filename input, then creates and opens the file in the editor.
```

Or add a new section if it doesn't exist:
```markdown
### File Creation

Files can be created in two ways:

1. **TitleBar "New File" button**:
   - Keyboard shortcut: `Cmd+N` (Mac) or `Ctrl+N` (Windows/Linux)
   - Menu: File → New File
   - Creates file in root directory of currently open folder
   - Opens modal for filename input
   - Automatically opens new file in editor after creation
   - Shows error if no folder is open

2. **File tree context menu**:
   - Right-click on a folder
   - Select "New File" from context menu
   - Creates file in the selected folder (not root)
   - Same modal workflow as button
```

**Also update**:
Look for any "Known Limitations" or "Future Considerations" sections that might mention the New File button, and remove those if present.

**Testing this change**:
```bash
# Just verify the file still renders as valid markdown
# You can use a markdown previewer or just read it
cat CLAUDE.md | grep -A 5 "New File"
```

**Commit message**:
```
docs: update CLAUDE.md with new file button behavior

Document that New File button is now fully functional.
Explain the two file creation workflows (button vs context menu).

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] Documentation accurately describes the feature
- [ ] Both creation methods (button and context menu) are documented
- [ ] Keyboard shortcut is mentioned
- [ ] Edge cases (no folder open) are noted
- [ ] Markdown syntax is valid

---

#### Task 5.3: Update milestone documentation

**Status**: ⏳ Not started

**Description**: Update the project's milestone tracking documents to reflect that the New File button feature is complete.

**Why this matters**: Project planning docs help track what's done and what's left. This keeps the roadmap accurate.

**Files to modify**:
- `docs/milestone-1-progress.md` (or similar)
- `docs/milestone-1-tasks.md` (or similar)

**Implementation**:

Look for any task related to "New File button" or file creation in the milestone docs.

If there's a checklist like:
```markdown
- [ ] Make New File button functional
```

Update to:
```markdown
- [x] Make New File button functional
```

Or if there's a detailed task:
```markdown
### Task: New File Button

**Status**: Pending
**Priority**: Medium
```

Update to:
```markdown
### Task: New File Button

**Status**: ✅ Complete
**Priority**: Medium
**Completed**: 2025-10-07
**Implementation**: New File button opens modal, creates file in root directory, opens in editor
```

**Commit message**:
```
docs: mark new file button task as complete

Update milestone tracking to reflect completed feature.

Part of new-file-button implementation.
```

**Verification checklist**:
- [ ] Milestone documents updated
- [ ] Status changed to complete
- [ ] Date noted if applicable

---

## Testing Guidelines

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/renderer/tests/App.newFile.test.tsx

# Run tests in watch mode (re-run on file changes)
bun test --watch

# Run tests with UI (interactive browser-based test runner)
bun test:ui

# Run tests with coverage report
bun test:coverage
```

### Test Design Principles

Following TDD and good test design:

1. **Arrange-Act-Assert pattern**: Structure tests clearly
   ```tsx
   it('should do something', () => {
     // Arrange: Set up test data and mocks
     const mockData = {...};

     // Act: Perform the action
     fireEvent.click(button);

     // Assert: Verify the outcome
     expect(result).toBe(expected);
   });
   ```

2. **Test behavior, not implementation**:
   - ✅ Good: "should show success toast after creating file"
   - ❌ Bad: "should call setNewFileModal({ isOpen: false })"

3. **One assertion per test** (when practical):
   - Each test should verify one specific behavior
   - Complex workflows may need multiple assertions, but keep focused

4. **Descriptive test names**:
   - Use "should" statements: "should create file when modal confirmed"
   - Be specific: "should show warning when clicking New File without folder open"

5. **Mock external dependencies**:
   - Always mock file system calls
   - Mock IPC calls to main process
   - Mock heavy components if testing parent

6. **Test edge cases**:
   - Empty inputs
   - Special characters in filenames
   - No folder open
   - Permissions errors (if applicable)

7. **Keep tests isolated**:
   - Each test should run independently
   - Use `beforeEach` to reset state
   - Don't rely on test execution order

### Common Testing Pitfalls to Avoid

1. **Don't test implementation details**:
   ```tsx
   // ❌ Bad: Testing internal state
   expect(component.state.isOpen).toBe(true);

   // ✅ Good: Testing user-visible behavior
   expect(screen.getByText('Modal Title')).toBeInTheDocument();
   ```

2. **Don't forget to wait for async operations**:
   ```tsx
   // ❌ Bad: Assertion runs before async operation completes
   fireEvent.click(button);
   expect(screen.getByText('Success')).toBeInTheDocument();

   // ✅ Good: Wait for async operation
   fireEvent.click(button);
   await waitFor(() => {
     expect(screen.getByText('Success')).toBeInTheDocument();
   });
   ```

3. **Don't use brittle selectors**:
   ```tsx
   // ❌ Bad: Will break if CSS classes change
   const button = container.querySelector('.btn-primary');

   // ✅ Good: Use semantic queries
   const button = screen.getByRole('button', { name: 'Create' });
   // Or by text
   const button = screen.getByText('Create');
   ```

4. **Don't test third-party libraries**:
   - Assume React, DaisyUI, etc. work correctly
   - Focus on YOUR code's integration with them

5. **Don't write flaky tests**:
   - Use `waitFor` for async operations
   - Don't use arbitrary `setTimeout` in tests
   - Mock time-dependent operations

### Debugging Failed Tests

1. **Use `screen.debug()`** to see what's rendered:
   ```tsx
   it('should render something', () => {
     render(<MyComponent />);
     screen.debug(); // Prints the DOM to console
   });
   ```

2. **Check what queries are available**:
   ```tsx
   screen.logTestingPlaygroundURL(); // Opens browser with query suggestions
   ```

3. **Run single test in isolation**:
   ```bash
   bun test src/renderer/tests/App.newFile.test.tsx -t "should show warning"
   ```

4. **Check mock calls**:
   ```tsx
   console.log(mockCreateFile.mock.calls); // See all calls to mock
   expect(mockCreateFile).toHaveBeenCalledWith(expectedArg);
   ```

5. **Add descriptive error messages**:
   ```tsx
   expect(result).toBe(expected); // Generic error
   expect(result).toBe(expected); // with custom message:
   expect(result, 'File should be created in root directory').toBe(expected);
   ```

## Commit Strategy

Follow these commit guidelines for clean Git history:

### Commit Message Format

Use conventional commits format:
```
<type>: <short description>

<optional longer description>

<optional footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `refactor`: Code refactoring (no behavior change)
- `style`: Code style changes (formatting, etc.)
- `chore`: Maintenance tasks

Examples:
```
feat: add new file modal state to App component

Add useState for tracking new file modal visibility.
This is the first step toward making the "New File" button functional.

Part of new-file-button implementation.
```

```
test: verify successful file creation workflow

Add end-to-end test for new file creation happy path.
Tests modal opening, file creation, and editor opening.

Part of new-file-button implementation.
```

### When to Commit

- After completing each task in this plan
- When all tests pass
- Before starting a new task
- When you want to save a working state

**Commit frequency**: Each task = one commit (roughly)

### Pre-commit Checklist

Before each commit:
- [ ] Code compiles without TypeScript errors
- [ ] All tests pass (`bun test`)
- [ ] No linter errors (`bun run lint`)
- [ ] File changes are intentional (review diff)
- [ ] Commit message is clear and follows format

### Pushing Changes

```bash
# After several commits, push to remote
git push origin your-branch-name

# Or if on main
git push origin main
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: Modal doesn't appear when clicking button

**Symptoms**: Clicking "New File" button does nothing, no modal visible

**Possible causes**:
1. State not updating correctly
2. Modal component not rendered in JSX
3. CSS hiding the modal

**Debugging steps**:
```tsx
// Add console.log to handler
const handleNewFile = useCallback(() => {
  console.log('handleNewFile called, rootPath:', rootPath);
  if (!rootPath) {
    console.log('No rootPath, showing warning');
    toast.showWarning('Please open a folder first');
    return;
  }
  console.log('Opening modal, setting state');
  setNewFileModal({ isOpen: true });
}, [rootPath, toast]);

// Check state in React DevTools
// Install React DevTools browser extension
// Inspect App component, look for newFileModal state
```

**Solutions**:
- Verify `setNewFileModal({ isOpen: true })` is called
- Check InputModal is rendered in JSX
- Verify `isOpen={newFileModal.isOpen}` prop is correct
- Check browser console for errors

#### Issue: File created but not opened in editor

**Symptoms**: File appears in tree but editor shows old file or empty

**Possible causes**:
1. `setActiveFile` not called
2. Wrong file path passed to `setActiveFile`
3. File load failed silently

**Debugging steps**:
```tsx
const handleNewFileConfirm = useCallback(async (fileName: string) => {
  // ... existing code ...

  const newFilePath = `${rootPath}/${normalizedFileName}`;
  console.log('About to open file:', newFilePath);

  setActiveFile(newFilePath);
  console.log('setActiveFile called');
}, [rootPath, createFile, setActiveFile, toast]);
```

**Solutions**:
- Verify file path construction is correct (no double slashes, correct separators)
- Check `setActiveFile` is from `useFileTreeContext()`
- Look for errors in file loading (check `useFileContent` hook)

#### Issue: Tests fail with "Cannot find module" errors

**Symptoms**: Test imports fail to resolve

**Possible causes**:
1. Wrong import paths
2. Mock setup incorrect
3. Missing dependencies

**Solutions**:
```bash
# Check path aliases are configured
cat tsconfig.json | grep paths

# Verify file exists
ls -la src/renderer/components/Modals/InputModal.tsx

# Use relative imports in tests if aliases don't work
import { InputModal } from '../components/Modals/InputModal';
```

#### Issue: TypeScript errors about "Property 'createFile' does not exist"

**Symptoms**: TypeScript can't find `createFile` on context

**Possible cause**: Not destructured from `useFileTreeContext()`

**Solution**:
```tsx
// Make sure this line includes createFile:
const {
  loadDirectory,
  openFile: setActiveFile,
  activePath,
  rootPath,
  setFileDirty,
  nodes,
  createFile,  // ADD THIS
} = useFileTreeContext();
```

#### Issue: Toast notifications don't appear

**Symptoms**: No success/error messages shown

**Possible causes**:
1. Toast provider not wrapping app
2. Toast context not available
3. CSS hiding toasts

**Solutions**:
- Verify `ToastProvider` wraps `AppContent` in App.tsx
- Check `const toast = useToast()` exists
- Inspect DOM for toast elements (they should be rendered even if not visible)
- Check z-index in CSS (toasts should be on top)

### Getting Help

If stuck:
1. Read error messages carefully (TypeScript errors are usually accurate)
2. Check browser console for runtime errors
3. Use `console.log` liberally to trace execution
4. Use React DevTools to inspect component state
5. Review the existing FileTree implementation for reference
6. Check Git history to see how similar features were implemented

## Appendix

### Code Reference

#### InputModal Component Interface

From `src/renderer/components/Modals/InputModal.tsx`:
```tsx
interface InputModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}
```

Usage:
```tsx
<InputModal
  isOpen={modal.isOpen}
  title="Modal Title"
  message="Enter value:"
  placeholder="example"
  confirmText="OK"
  onConfirm={(value) => console.log(value)}
  onCancel={() => setModal({ isOpen: false })}
/>
```

#### FileTreeContext Interface

From `src/renderer/store/fileTreeStore.tsx`:
```tsx
interface FileTreeActions {
  loadDirectory: (path: string) => Promise<void>;
  openFile: (path: string) => void;  // Renamed to setActiveFile in usage
  createFile: (parentPath: string, fileName: string) => Promise<boolean>;
  createDirectory: (parentPath: string, dirName: string) => Promise<boolean>;
  delete: (path: string) => Promise<boolean>;
  rename: (oldPath: string, newName: string) => Promise<boolean>;
  // ... other methods
}
```

Usage:
```tsx
const { createFile, openFile: setActiveFile } = useFileTreeContext();

// Create file in root directory
const success = await createFile('/path/to/folder', 'newfile.md');

// Open file in editor
setActiveFile('/path/to/folder/newfile.md');
```

#### Toast API

From `src/renderer/components/Notifications/ToastContainer.tsx`:
```tsx
interface ToastContextValue {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}
```

Usage:
```tsx
const toast = useToast();

toast.showSuccess('Operation completed');
toast.showError('Operation failed');
toast.showWarning('Please open a folder first');
toast.showInfo('File reloaded', 5000); // 5 second duration
```

### File Structure Reference

```
src/
├── renderer/
│   ├── App.tsx                          # Main app component (modify here)
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── TitleBar.tsx             # Contains New File button
│   │   │   └── MainLayout.tsx           # App layout wrapper
│   │   ├── Modals/
│   │   │   └── InputModal.tsx           # Reusable input modal
│   │   └── FileTree/
│   │       └── FileTree.tsx             # Reference implementation
│   ├── store/
│   │   └── fileTreeStore.tsx            # File tree context (provides createFile)
│   ├── services/
│   │   └── fileSystemService.ts         # IPC wrapper (don't modify)
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts      # Keyboard handler (already wired)
│   │   └── useFileContent.ts            # File loading logic
│   └── tests/
│       ├── App.newFile.test.tsx         # New test file (create this)
│       └── fileTreeStore.test.tsx       # Reference for test patterns
├── main/
│   ├── main.ts                          # IPC handlers (don't modify)
│   ├── preload.ts                       # IPC bridge (don't modify)
│   └── fileSystem/
│       └── fileHandlers.ts              # File operations (don't modify)
└── shared/
    └── types/
        └── fileSystem.ts                # Type definitions (reference only)
```

### Related Documentation

- **Main docs**: `CLAUDE.md` - Project architecture and patterns
- **Testing setup**: `bunfig.toml` - Bun test configuration
- **Type definitions**: `src/shared/types/` - TypeScript interfaces
- **Similar feature**: `src/renderer/components/FileTree/FileTree.tsx` - Reference implementation

### Estimated Time

- **Phase 1**: 15-30 minutes (simple state additions)
- **Phase 2**: 30-45 minutes (business logic implementation)
- **Phase 3**: 15-20 minutes (UI wiring)
- **Phase 4**: 1-2 hours (comprehensive tests)
- **Phase 5**: 30-45 minutes (manual testing and docs)

**Total**: 3-4 hours for a developer new to the codebase

Experienced developers familiar with React/Electron: 1.5-2 hours

### Success Criteria

Feature is complete when:
- [x] New File button opens modal when folder is open
- [x] Warning shown when button clicked with no folder open
- [x] Modal accepts filename input
- [x] File created in root directory on confirm
- [x] New file automatically opens in editor
- [x] Success toast shown after creation
- [x] Modal closes on cancel without creating file
- [x] Keyboard shortcut (Cmd+N / Ctrl+N) works
- [x] Menu item (File → New File) works
- [x] All unit tests pass
- [x] Manual testing checklist completed
- [x] Documentation updated
- [x] Code follows DRY and YAGNI principles
- [x] Commits are atomic and well-described

### Glossary

- **IPC**: Inter-Process Communication - how Electron's renderer and main processes talk
- **Context**: React Context API for sharing state across components
- **Modal**: Popup dialog that blocks interaction with rest of app
- **Toast**: Temporary notification message that appears and auto-dismisses
- **Handler**: Function that handles events (clicks, key presses, etc.)
- **Mock**: Test double that simulates a dependency
- **Guard clause**: Early return to check preconditions
- **Destructuring**: Extracting values from objects: `const { a, b } = obj`
- **Callback**: Function passed as argument to be called later
- **Async/await**: JavaScript pattern for handling asynchronous operations
- **TDD**: Test-Driven Development - write tests first (or at least early)
- **DRY**: Don't Repeat Yourself - avoid code duplication
- **YAGNI**: You Aren't Gonna Need It - don't add features not currently needed

---

## Final Notes

This plan follows the DRY and YAGNI principles by:
- **Reusing existing components**: InputModal, Toast system, FileTreeContext
- **Not over-engineering**: Simple boolean state, straightforward handlers
- **Avoiding duplication**: Using the same createFile logic as FileTree

The implementation is **test-driven** with:
- Comprehensive unit tests
- Manual testing checklist
- Clear success criteria

**Frequent commits** are encouraged:
- Each task is a natural commit point
- Tests are committed separately from implementation
- Documentation updates are separate commits

Good luck! If you get stuck, refer to the FileTree component implementation as a reference - it uses the same patterns.
