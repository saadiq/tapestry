# Milestone 1: Foundation & Core Editor - Task Breakdown

## Goal
Basic offline-first Markdown editor with file system integration

---

## Phase 1: Initial Setup (Sequential)

These tasks must be completed first and form the foundation for parallel work:

### 1.1 Project Initialization
- Initialize Electron Forge with Vite + React + TypeScript template
- Verify Node 22+ compatibility
- Configure package.json with project metadata
- Set up basic folder structure (`src/main`, `src/renderer`, `src/shared`)

### 1.2 Development Environment Configuration
- Configure TypeScript (tsconfig.json for main and renderer processes)
- Set up ESLint and Prettier
- Configure Vite for renderer process
- Set up hot reload for development

### 1.3 Basic Electron Application Shell
- Create basic main process entry point
- Create basic renderer process entry point
- Implement IPC bridge setup (preload script)
- Verify app builds and runs with "Hello World"

### 1.4 UI Styling Foundation ✅ COMPLETE
- Install Tailwind CSS v4, DaisyUI, and Lucide React icons
- Configure Tailwind CSS v4 with DaisyUI plugin in CSS
- Update Vite config for PostCSS/CSS preprocessing
- Create demo UI with DaisyUI components and Lucide icons
- Verify styled components render correctly

**Completed Stack:**
- Tailwind CSS v4.0.0 (utility-first styling)
- DaisyUI v5.1.26 (component library)
- Lucide React v0.544.0 (iconography)
- PostCSS v8.5.6 + Autoprefixer v10.4.21

---

## Phase 2: Parallel Development Tracks

After Phase 1 completion, these tracks can be developed concurrently by separate agents:

### Track A: TipTap WYSIWYG Editor Component

**Goal:** Implement the core markdown editing experience

**Tasks:**
- Install and configure TipTap with required extensions (StarterKit, Typography, etc.)
- Create EditorComponent with TipTap integration
- Implement live formatting preview (WYSIWYG mode)
- Add markdown syntax auto-formatting (e.g., `**bold**` → **bold**)
- Build formatting toolbar/context menu with:
  - Bold, italic, strikethrough (use DaisyUI buttons + Lucide icons)
  - Headings (H1-H6)
  - Lists (ordered, unordered)
  - Links and images
  - Code blocks and inline code
  - Blockquotes
- Add keyboard shortcuts for common formatting operations
- Implement proper focus management and cursor positioning
- Add editor state management (content, selection)
- Style editor with Tailwind utilities for responsive layout

**Dependencies:** Phase 1 complete (including UI styling foundation)

**Files to create/modify:**
- `src/renderer/components/Editor/EditorComponent.tsx`
- `src/renderer/components/Editor/EditorToolbar.tsx`
- `src/renderer/components/Editor/extensions/*`
- `src/renderer/hooks/useEditor.ts`

---

### Track B: File System Integration & Operations

**Goal:** Enable reading, writing, and managing files on the local filesystem

**Tasks:**
- Design IPC API for file operations (main ↔ renderer communication)
- Implement main process file system handlers:
  - Read file content
  - Write/save file content
  - Create new file
  - Delete file
  - Rename/move file
  - Check file exists
- Implement directory operations:
  - Open directory picker dialog
  - Read directory contents (recursive)
  - Watch directory for changes (using fs.watch or chokidar)
- Create renderer-side file system service/hooks:
  - `useFileSystem()` hook for file operations
  - `useFileContent()` hook for current file state
  - Auto-save functionality (debounced)
- Implement error handling and user feedback
- Add file type validation (markdown files)

**Dependencies:** Phase 1 complete

**Files to create/modify:**
- `src/main/fileSystem/fileHandlers.ts`
- `src/main/fileSystem/directoryHandlers.ts`
- `src/main/fileSystem/fileWatcher.ts`
- `src/renderer/services/fileSystemService.ts`
- `src/renderer/hooks/useFileSystem.ts`
- `src/renderer/hooks/useFileContent.ts`
- `src/shared/types/fileSystem.ts`

---

### Track C: File Tree/Sidebar Navigation

**Goal:** Provide intuitive directory browsing and file navigation

**Tasks:**
- Design file tree data structure and state management
- Create FileTree component with:
  - Hierarchical folder/file display
  - Expand/collapse folders
  - File icons using Lucide (File, Folder, FolderOpen, FileText, etc.)
  - Active file highlighting with DaisyUI active states
  - Click to open file
  - Right-click context menu (create, delete, rename) using DaisyUI dropdown/modal
- Implement virtual scrolling for large directories
- Add search/filter functionality for file tree with DaisyUI input
- Create Sidebar component wrapping FileTree with Tailwind layout utilities
- Implement sidebar resize/collapse functionality
- Add keyboard navigation (arrow keys, enter to open)
- Handle file tree updates on external changes (via file watcher)

**Dependencies:** Phase 1 complete (including UI styling foundation)

**Files to create/modify:**
- `src/renderer/components/Sidebar/Sidebar.tsx`
- `src/renderer/components/FileTree/FileTree.tsx`
- `src/renderer/components/FileTree/FileTreeItem.tsx`
- `src/renderer/components/FileTree/ContextMenu.tsx`
- `src/renderer/hooks/useFileTree.ts`
- `src/renderer/store/fileTreeStore.ts` (or context)

---

### Track D: Application Layout & UI Shell ✅ COMPLETE

**Goal:** Create the main application structure and user interface shell

**Tasks:**
- ✅ Design application layout (sidebar + editor area) using Tailwind grid/flex
- ✅ Create MainLayout component with:
  - ✅ Resizable sidebar with drag handle
  - ✅ Main content area
  - ✅ Title bar (with current file name) using DaisyUI navbar
  - ✅ Status bar using DaisyUI footer with stats (word count, cursor position)
- ✅ Implement theme system (light/dark mode) using DaisyUI themes
- ✅ Add loading states and transitions using DaisyUI loading/skeleton components
- ✅ Implement window controls (using native controls)
- ✅ Create empty states (no file open, no directory selected) using DaisyUI hero/empty state
- ✅ Add basic keyboard shortcuts system (Cmd+N, Cmd+O, Cmd+S, Cmd+B, Cmd+F)
- ✅ Implement menu bar with File menu (Open Folder, New File, Save, etc.)
- ✅ Use Lucide icons throughout UI (Menu, Save, FolderOpen, Sun, Moon, etc.)

**Dependencies:** Phase 1 complete (including UI styling foundation)

**Files created:**
- ✅ `src/renderer/components/Layout/MainLayout.tsx`
- ✅ `src/renderer/components/Layout/TitleBar.tsx`
- ✅ `src/renderer/components/Layout/StatusBar.tsx`
- ✅ `src/renderer/components/Layout/index.ts`
- ✅ `src/renderer/components/EmptyStates/NoDirectorySelected.tsx`
- ✅ `src/renderer/components/EmptyStates/NoFileOpen.tsx`
- ✅ `src/renderer/components/EmptyStates/LoadingState.tsx`
- ✅ `src/renderer/components/EmptyStates/index.ts`
- ✅ `src/main/menu/applicationMenu.ts`
- ✅ `src/renderer/hooks/useKeyboardShortcuts.ts`
- ✅ `src/renderer/hooks/useTheme.ts`
- ✅ `src/renderer/hooks/index.ts`

**Files modified:**
- ✅ `src/main/main.ts` - Added menu integration
- ✅ `src/main/preload.ts` - Added IPC event listeners for menu
- ✅ `src/renderer/App.tsx` - Integrated MainLayout and all UI components

**Features implemented:**
- Resizable sidebar with smooth drag interaction (200-500px range)
- Collapsible sidebar via toggle button (Cmd+B)
- Theme switcher with localStorage persistence and system preference detection
- Application menu with File, Edit, View, Window, and Help menus
- Keyboard shortcuts: Cmd+N, Cmd+O, Cmd+S, Cmd+B, Cmd+F
- Empty states for "no directory" and "no file open" scenarios
- Loading state component with DaisyUI spinner
- Status bar with file name, cursor position, and word count placeholders
- Title bar with file name display and dirty state indicator
- IPC bridge setup for menu-to-renderer communication

**Ready for integration with:**
- Track A (TipTap Editor) - Editor will plug into main content area
- Track B (File System) - Handlers ready for menu and keyboard actions
- Track C (File Tree) - Sidebar placeholder ready for file tree component

---

## Phase 3: Integration & Polish (Sequential)

After all parallel tracks complete:

### 3.1 Component Integration ✅ COMPLETE
- ✅ Integrate all tracks into MainLayout
- ✅ Connect file tree selection to editor
- ✅ Wire up file operations to UI actions
- ✅ Ensure IPC communication flows correctly
- ✅ Add input modals for file/folder creation and rename
- ✅ Add confirmation dialogs for delete operations
- ✅ Implement auto-save with configurable delay (1s)
- ✅ Add file watcher integration for automatic refresh
- ✅ Add unsaved changes warning on window close

**Commits:**
- `40d2299` - feat: integrate file tree with file system and editor (Phase 3.1)

### 3.2 State Management Integration ⏭️ SKIPPED
- ✅ Implement global state management (Context API) - Using React Context for file tree, toasts
- ⏭️ Zustand not needed at current complexity level
- ⏭️ Undo/redo for file operations (future enhancement)

### 3.3 Testing & Bug Fixes ⏳ PENDING
- ⏳ Test file operations across different scenarios
- ⏳ Test editor functionality with various markdown content
- ⏳ Test file tree with large directories
- ⏳ Fix cross-platform issues (macOS, Windows, Linux)
- ⏳ Install Vitest + React Testing Library
- ⏳ Write smoke tests

### 3.4 User Experience Polish ✅ MOSTLY COMPLETE
- ✅ Add loading indicators
- ✅ Improve error messages (toast notifications)
- ✅ Add confirmation dialogs for destructive actions
- ✅ Add toast notification system for user feedback
- ⏳ Optimize performance (large files, many files) - needs testing
- ⏳ Add welcome screen for first-time users (optional)
- ⏳ Implement find functionality (Cmd+F defined but not implemented)

**Commits:**
- `d78c76c` - feat: add toast notification system for user feedback

---

## Deliverables

**Minimum Viable Product:**
- ✅ Electron app that launches successfully
- ✅ Can open any directory on local filesystem
- ✅ File tree shows directory structure
- ✅ Can create, open, save, delete, rename markdown files
- ✅ WYSIWYG markdown editor with formatting toolbar
- ✅ Files save directly to filesystem (local-first)

**Success Criteria:**
- User can open a directory and see all files in sidebar
- User can click a markdown file and see it in the editor
- User can type markdown with live formatting preview
- User can use toolbar/shortcuts to format text
- User can create new files and save changes
- All file operations work reliably without data loss

---

## Notes for Parallel Execution

**Track Independence:**
- Tracks A-D can be developed simultaneously with minimal conflicts
- Each track operates on different parts of the codebase
- Integration points are well-defined (IPC APIs, component props)

**Communication Points:**
- Track B defines IPC API that Track C will consume
- Track D defines layout structure that Tracks A and C will fit into
- All tracks share TypeScript types from `src/shared/types`

**Recommended Execution:**
- Assign one agent per track (A, B, C, D)
- All agents start after Phase 1 completes
- Agents coordinate on shared type definitions
- Integration happens after all tracks complete

**Shared UI Resources (Available to All Tracks):**
- **Tailwind CSS v4:** Utility classes for layout, spacing, colors, typography
- **DaisyUI v5.1.26:** Pre-built components (buttons, cards, modals, inputs, navbar, etc.)
- **Lucide React v0.544.0:** Consistent icon set across the application
- **Theme System:** DaisyUI themes support light/dark mode out of the box
