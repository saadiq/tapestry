# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tapestry** is an AI-powered document workspace for context engineering, built as an Electron desktop application. It provides a local-first markdown editing experience with file system integration, WYSIWYG editing via TipTap, and a modern UI using Tailwind CSS v4 and DaisyUI.

## Development Commands

```bash
# Start development server with hot reload
bun start

# Lint code (TypeScript + ESLint)
bun run lint

# Run tests
bun test

# Run tests with UI
bun test:ui

# Run tests with coverage
bun test:coverage

# Package application for distribution
bun package

# Create distributable installers
bun make

# Publish application
bun publish
```

**Note:** This project uses bun as the package manager. Electron Forge commands work seamlessly with bun.

### Test Runner Configuration

This project uses **bun's test runner** (not vitest or jest) for all tests. Key configuration details:

- **DOM Environment**: Tests requiring DOM use `@happy-dom/global-registrator` for happy-dom setup
- **Test Matchers**: jest-dom matchers are manually extended to bun:test's expect function
- **Preload Files**: `bunfig.toml` preloads `happydom.ts` and `testing-library.ts` before tests run
- **Important**: The `@vitest-environment` directive does NOT work with bun test runner

Test files should import from `vitest` for compatibility with IDE tooling, but tests execute via `bun test`.

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
├── Editor/              # Dual-mode editor (WYSIWYG/Markdown) with formatting toolbar
│   ├── EditorComponent.tsx      # Main editor with view mode switching
│   ├── EditorToolbar.tsx        # Simplified formatting toolbar (essential features only)
│   ├── MarkdownEditor.tsx       # Raw markdown text editor with guide link
│   └── MarkdownGuide.tsx        # Markdown syntax reference modal
├── FileTree/            # Virtual scrolling file tree with context menu
├── Layout/              # MainLayout, TitleBar, StatusBar, resizable sidebar
├── Sidebar/             # Wrapper for FileTree
├── EmptyStates/         # NoDirectorySelected, NoFileOpen, LoadingState
├── Modals/              # InputModal, ConfirmDialog (reusable)
├── Notifications/       # Toast system with success/error/info variants
└── ErrorBoundary.tsx    # React error boundary for graceful error handling
```

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
- Single-click a file to open it (makes it active)
- Double-click the active file's name in the tree to enter rename mode
- Edit name directly in place
- Submit: Enter key or click outside (blur)
- Cancel: Escape key
- Validation: prevents empty names, ignores unchanged names, rejects filesystem-unsafe characters
- Invalid filenames show error toast with explanation
- Note: Only works for files, not directories

**Modal Rename:**
- Alternative to inline rename
- Right-click → "Rename"
- Input dialog with Cancel/Rename buttons
- Clicking modal backdrop closes the modal (standard UX)

### TipTap Editor Integration

The editor supports two view modes:
- **WYSIWYG Mode**: Rich text editing with TipTap
- **Markdown Mode**: Raw markdown text editor with normalization on blur

TipTap extensions used:
- `StarterKit` - Basic markdown features (bold, italic, headings, lists, etc.)
- `Typography` - Smart quotes, en/em dashes
- `Placeholder` - Empty state text
- `Link` - Markdown links with auto-detection
- `Image` - Image embedding
- `Table` (TableKit) - Resizable tables with proper markdown conversion
- `CodeBlockLowlight` - Syntax highlighting with highlight.js themes

**Markdown ↔ TipTap Conversion:**
- **Markdown → TipTap**: Uses `markdownToJSON()` which parses markdown-it tokens directly to TipTap JSON format, bypassing HTML/DOM parsing entirely. This prevents browser DOM parser from injecting tbody/thead elements that TipTap's schema rejects, enabling proper table support.
- **TipTap → Markdown**: Uses TurndownService with GFM plugin to convert HTML back to markdown. Table cell formatting (bold, italic, links, code, strikethrough) is preserved by converting cell HTML to markdown syntax.
- **URL Security**: All links and images are sanitized through `urlSanitizer.ts` to prevent XSS attacks. Only `http:`, `https:`, and `mailto:` protocols are allowed for links, and `data:` URIs are allowed for images (image/* only).

Editor state is managed via `useEditor` hook (wraps TipTap's `useTipTapEditor`) and content flows through `useFileContent` for persistence. View mode preference is persisted to localStorage.

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

### Supported Markdown Syntax

**Text Formatting:**
- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- ***Bold + Italic***: `***text***`
- ~~Strikethrough~~: `~~text~~`
- `Inline code`: `` `code` ``

**Headings:**
```markdown
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

**Lists:**
```markdown
- Unordered item 1
- Unordered item 2
  - Nested item

1. Ordered item 1
2. Ordered item 2
```

**Links and Images:**
```markdown
[Link text](https://example.com)
[Link with title](https://example.com "Title")
![Image alt text](https://example.com/image.png)
```

**Code Blocks** (with syntax highlighting):
````markdown
```javascript
const x = 1;
```

```python
def hello():
    print("Hello")
```
````

Supported languages: JavaScript, TypeScript, Python, Markdown, Bash, JSON, CSS, HTML

**Tables** (GFM syntax):
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

**Other Elements:**
```markdown
> Blockquote

---
Horizontal rule
```

**Raw HTML (Partial Support):**
- Basic formatting tags: `<b>`, `<strong>`, `<i>`, `<em>`, `<s>`, `<del>`, `<code>`
- Block elements: `<div>`, `<p>`, `<h1-6>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`
- Line breaks: `<br>`, `<br/>`, `<br />`
- Inline elements: `<span>`, `<kbd>`, `<sub>`, `<sup>`, `<abbr>` (text content only)

**Note:** HTML support is partial - inline styles, colors, and advanced formatting are not preserved. Complex HTML structures are converted to their closest TipTap equivalent.

**HTML Limitations:**
- Nested inline tags (e.g., `<b><i>text</i></b>`) extract text but may not perfectly preserve all mark combinations
- Event handler attributes (onclick, onerror, etc.) are stripped for security
- Unsupported tags gracefully degrade to text content

### Markdown Limitations & Best Practices

**Table Limitations:**
- Maximum colspan/rowspan: 100 (validated for safety)
- Complex table features (cell merging, alignment) may not round-trip perfectly
- Very large tables (>50 rows) may impact performance
- Tables are best edited in WYSIWYG mode for complex structures
- **Formatting Preservation**: Nested formatting (bold, italic, links, code, strikethrough) within table cells IS preserved when converting from WYSIWYG to markdown mode. The conversion process parses cell HTML and converts formatting to markdown syntax (e.g., `<strong>text</strong>` → `**text**`).

**Performance Considerations:**
- Documents >1000 lines: Expect slight lag in markdown mode switching
- Documents >5000 lines: Consider splitting into smaller files
- Large tables: Use WYSIWYG mode for better performance
- Content is hashed for comparison to prevent unnecessary re-parsing

**Security:**
- `javascript:`, `data:text/html`, `vbscript:`, and `file:` URLs are blocked
- Image data URIs are restricted to `data:image/*`
- Relative URLs and anchor links are allowed
- Raw HTML is parsed with sanitization for safe rendering

**Round-Trip Fidelity:**
- Most markdown syntax round-trips perfectly
- Smart typography (em dashes, smart quotes) is enabled
- Some whitespace normalization occurs during conversion
- Switching between WYSIWYG and Markdown modes may normalize formatting

### File Watcher Pattern

Directory watching lifecycle:
1. User opens directory → `fileSystemService.watchDirectory(path)` called
2. Main process starts `fs.watch()` and stores watcher reference
3. On file change → main sends `'file-watcher-event'` to renderer
4. Renderer listener in `App.tsx` triggers `loadDirectory()` refresh
5. On app close → `unwatchAll()` cleans up all watchers

**Important:** Always call `unwatchDirectory()` when changing root directory to prevent memory leaks.

### Auto-Save Implementation

Auto-save uses a simplified save-on-switch pattern:
- **Auto-save on file switch**: When switching files, the current file is automatically saved before loading the next file
- **Auto-save on window blur**: When the window loses focus, dirty files are automatically saved
- **Debounced auto-save**: Content changes trigger a debounced save (1000ms default) for the active file
- **Save timeout**: Sync saves have a 30-second timeout to prevent eternal hangs on slow I/O or network drives
- **Error handling**: Failed saves block file switching and display error toast notifications
- `isDirty` flag tracks unsaved changes
- `beforeunload` event warns if closing with unsaved changes

**Performance Considerations:**
- **No caching**: The multi-file cache system was removed for simplicity and data safety
- **File reload on switch**: Each file switch reads from disk rather than restoring from cache
- **Acceptable tradeoff**: For typical markdown files (<1MB), disk reads are fast enough (<50ms on SSD)
- **Large file impact**: Files >5MB may experience noticeable reload delays (500ms+) on file switch
- **Network drives**: Files on network-mounted drives may be slower to reload; consider copying to local storage for frequently-accessed large files

The simplified approach trades a small performance cost on file switching for:
- Clearer user experience (always see fresh file content)
- Reduced complexity (~400 lines of cache code removed)
- Better data safety (no stale cache vs. disk conflicts)
- Easier debugging and maintenance

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

### File Creation Workflow

Files can be created in two ways:

1. **TitleBar "New File" button** (implemented in `App.tsx`):
   - Keyboard shortcut: `Cmd+N` (Mac) or `Ctrl+N` (Windows/Linux)
   - Menu: File → New File
   - Creates file in **root directory** of currently open folder
   - Opens modal (`InputModal`) for filename input
   - Automatically appends `.md` extension if not provided
   - Automatically opens new file in editor after creation
   - Shows warning toast if no folder is open
   - **Security**: Validates filenames to prevent path traversal (rejects `/`, `\`, `..`)
   - Shows detailed error messages from `FileTreeContext` (e.g., "File already exists")

2. **File tree context menu** (right-click on folder):
   - Right-click on any folder in the file tree
   - Select "New File" from context menu
   - Creates file in the **selected folder** (not root)
   - Same modal workflow and validation as button

**Implementation notes**:
- Both methods use `createFile` from `FileTreeProvider` context
- Modal state is controlled by parent component (`App` or `FileTree`)
- File creation automatically refreshes the file tree via context state updates
- Extension normalization happens in both `createFile` and caller (minimal acceptable duplication for path construction)

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
- **Keyboard shortcuts**:
  - `Cmd/Ctrl + N` - Create new file in root directory
  - `Cmd/Ctrl + B` - Toggle bold (WYSIWYG mode only)
  - `Cmd/Ctrl + I` - Toggle italic (WYSIWYG mode only)
  - `Cmd/Ctrl + Z` - Undo (WYSIWYG mode only)
  - `Cmd/Ctrl + Shift + Z` - Redo (WYSIWYG mode only)
- **Markdown normalization** - In markdown mode, content is normalized through markdown-it/turndown pipeline on blur to ensure consistency with WYSIWYG mode

## Known Limitations (Milestone 1)

- Find functionality (Cmd+F) defined but not implemented
- Word count calculation is approximate (strips HTML tags)
- Cursor position tracking is placeholder (always shows 1:1)

## Future Considerations (Milestone 2+)

- AI/LLM integration for context engineering
- Cloud sync capabilities
- Multi-tab file editing
- Advanced search across all files
- Custom markdown extensions
