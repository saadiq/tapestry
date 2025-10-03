# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tapestry** is an AI-powered document workspace for context engineering, built as an Electron desktop application. It provides a local-first markdown editing experience with file system integration, WYSIWYG editing via TipTap, and a modern UI using Tailwind CSS v4 and DaisyUI.

## Development Commands

```bash
# Start development server with hot reload
npm start

# Lint code (TypeScript + ESLint)
npm run lint

# Package application for distribution
npm package

# Create distributable installers
npm make

# Publish application
npm publish
```

**Note:** This project uses npm (not bun) per Electron Forge requirements.

## Architecture

### Process Model

Tapestry follows Electron's multi-process architecture:

- **Main Process** (`src/main/`): Node.js environment, handles file system operations, native dialogs, and window management
- **Renderer Process** (`src/renderer/`): Browser environment, runs React UI with restricted Node.js access
- **Preload Script** (`src/main/preload.ts`): Security bridge using `contextBridge` to expose safe IPC APIs to renderer
- **Shared Types** (`src/shared/types/`): TypeScript interfaces shared across process boundaries

### IPC Communication Pattern

All main ↔ renderer communication flows through a type-safe IPC layer:

1. **Main Process** registers handlers via `ipcMain.handle()` in `src/main/main.ts`
2. **Preload Script** exposes typed API via `contextBridge.exposeInMainWorld('electronAPI', ...)`
3. **Renderer Services** (`src/renderer/services/fileSystemService.ts`) wrap IPC calls with error handling
4. **React Hooks** (`src/renderer/hooks/`) provide reactive interfaces to services

**Critical:** Never expose raw `ipcRenderer` to renderer. Always use the `electronAPI` interface defined in preload.

### File System Architecture

File operations are handled in three layers:

1. **Handlers** (`src/main/fileSystem/`):
   - `fileHandlers.ts` - Read, write, create, delete, rename individual files
   - `directoryHandlers.ts` - Open directory dialog, recursive directory reading (markdown only)
   - `fileWatcher.ts` - Monitor directories for changes using `fs.watch`

2. **Services** (`src/renderer/services/fileSystemService.ts`):
   - Wraps IPC calls with consistent error handling
   - Returns `FileOperationResult` or `DirectoryPickerResult` interfaces
   - Handles type transformations across IPC boundary

3. **Hooks** (`src/renderer/hooks/`):
   - `useFileContent` - Manages current file state, auto-save, dirty tracking
   - `useFileSystem` - Low-level file operations wrapper
   - `useFileTree` - File tree state and operations (now in Context provider)

### State Management

- **React Context API** for global state:
  - `FileTreeProvider` (`src/renderer/store/fileTreeStore.tsx`) - Directory tree structure, CRUD operations
  - `ToastProvider` (`src/renderer/components/Notifications/ToastContainer.tsx`) - Toast notifications
- **Local component state** for UI interactions (modals, menus, theme)
- **Custom hooks** for business logic encapsulation

**No Zustand/Redux** - Context API is sufficient for current complexity.

### Component Structure

```
src/renderer/components/
├── Editor/              # TipTap WYSIWYG editor with formatting toolbar
├── FileTree/            # Virtual scrolling file tree with context menu
├── Layout/              # MainLayout, TitleBar, StatusBar, resizable sidebar
├── Sidebar/             # Wrapper for FileTree
├── EmptyStates/         # NoDirectorySelected, NoFileOpen, LoadingState
├── Modals/              # InputModal, ConfirmDialog (reusable)
└── Notifications/       # Toast system with success/error/info variants
```

### TipTap Editor Integration

The editor uses TipTap extensions:
- `StarterKit` - Basic markdown features (bold, italic, headings, lists, etc.)
- `Typography` - Smart quotes, en/em dashes
- `Placeholder` - Empty state text
- `Link` - Markdown links with auto-detection
- `Image` - Image embedding

Editor state is managed via `useEditor` hook and content flows through `useFileContent` for persistence.

### File Watcher Pattern

Directory watching lifecycle:
1. User opens directory → `fileSystemService.watchDirectory(path)` called
2. Main process starts `fs.watch()` and stores watcher reference
3. On file change → main sends `'file-watcher-event'` to renderer
4. Renderer listener in `App.tsx` triggers `loadDirectory()` refresh
5. On app close → `unwatchAll()` cleans up all watchers

**Important:** Always call `unwatchDirectory()` when changing root directory to prevent memory leaks.

### Auto-Save Implementation

Auto-save uses a debounced pattern in `useFileContent`:
- Content changes update local state immediately
- Debounced save function (1000ms default) writes to disk
- `isDirty` flag tracks unsaved changes
- `beforeunload` event warns if closing with unsaved changes

## Code Patterns

### Creating New File Operations

When adding new file system operations:

1. Add handler to `src/main/fileSystem/` with try/catch and `FileOperationResult` return type
2. Register IPC handler in `src/main/main.ts` via `ipcMain.handle()`
3. Add method to preload script's `electronAPI` interface
4. Add service method in `src/renderer/services/fileSystemService.ts`
5. (Optional) Create custom hook if complex state management needed

### TypeScript Path Aliases

Use path aliases for cleaner imports:
- `@main/*` → `src/main/*`
- `@renderer/*` → `src/renderer/*`
- `@shared/*` → `src/shared/*`

Configured in `tsconfig.json` and Vite config.

### Context Menu Pattern

File tree context menus:
1. Right-click sets `contextMenu` state with position and target
2. Render portal with absolute positioning
3. Action handlers close menu and trigger operations (create/delete/rename)
4. Operations use modals (`InputModal`, `ConfirmDialog`) for user input

### Modal Workflow

Reusable modal components follow this pattern:
1. Parent stores modal state: `{ isOpen: boolean, ...contextData }`
2. Action triggers `setModalState({ isOpen: true, ...data })`
3. Modal renders with controlled input and validation
4. `onConfirm` callback receives validated input
5. Parent performs operation and closes modal

## UI Framework

- **Tailwind CSS v4** - Utility-first styling (use `@import "tailwindcss"` in CSS)
- **DaisyUI v5.1.26** - Component library (themes: `light`, `dark`)
- **Lucide React v0.544.0** - Icon system (prefer over other icon libraries)
- **@tanstack/react-virtual** - Virtual scrolling for large file trees

Theme switching: `useTheme` hook manages DaisyUI theme via `data-theme` attribute and localStorage.

## Development Notes

- **DevTools open by default** - See `mainWindow.webContents.openDevTools()` in `main.ts`
- **Hot reload enabled** - Vite HMR for renderer, main process requires restart
- **ESLint warnings** - `any` types in error handling are acceptable, other warnings should be addressed
- **Markdown-only filter** - Directory reading automatically filters for `.md` files
- **Auto `.md` extension** - File creation automatically appends `.md` if missing

## Known Limitations (Milestone 1)

- Find functionality (Cmd+F) defined but not implemented
- No testing infrastructure (Vitest not yet configured)
- Word count calculation is approximate (strips HTML tags)
- Cursor position tracking is placeholder (always shows 1:1)

## Future Considerations (Milestone 2+)

- AI/LLM integration for context engineering
- Cloud sync capabilities
- Multi-tab file editing
- Advanced search across all files
- Custom markdown extensions
