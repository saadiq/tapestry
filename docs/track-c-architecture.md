# Track C: File Tree/Sidebar - Architecture Diagram

## Component Hierarchy

```
App.tsx (wrapped with FileTreeProvider)
└── FileTreeProvider (Context Provider)
    └── Sidebar
        ├── Header (folder name, buttons)
        ├── FileTree
        │   ├── Search Bar
        │   ├── Virtual Scrolling Container (@tanstack/react-virtual)
        │   │   └── FileTreeItem (repeated for each visible node)
        │   │       ├── Chevron (expand/collapse)
        │   │       ├── Icon (Lucide)
        │   │       └── Name
        │   └── ContextMenu (positioned absolutely)
        │       ├── Menu Items
        │       └── Modals (New File/Folder, Rename)
        └── Resize Handle
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FileTreeProvider (Context)                │
│  State: nodes, selectedPath, activePath, searchQuery, etc.  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ provides state & actions
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   useFileTreeContext()                       │
│        Hook to access state from any component               │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐      ┌──────────┐      ┌──────────┐
   │ Sidebar │      │ FileTree │      │useFileTree│
   │         │      │          │      │   Hook    │
   └─────────┘      └──────────┘      └──────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐  ┌─────────────┐
│FileTreeItem  │   │ContextMenu   │  │Search/Filter│
│(virtualized) │   │   (modal)    │  │   Input     │
└──────────────┘   └──────────────┘  └─────────────┘
```

## State Management

### FileTreeState Structure
```typescript
{
  rootPath: string | null           // Current root directory
  nodes: FileNode[]                 // Tree structure (recursive)
  selectedPath: string | null       // Highlighted file/folder
  activePath: string | null         // File open in editor
  searchQuery: string               // Filter query
  expandedPaths: Set<string>        // Expanded directories
  isLoading: boolean                // Loading state
  error: string | null              // Error message
}
```

### FileNode Structure (Recursive)
```typescript
{
  id: string                        // Unique identifier
  name: string                      // Display name
  path: string                      // Full path
  type: 'file' | 'directory'        // Node type
  children?: FileNode[]             // Subdirectories/files
  isExpanded?: boolean              // Expansion state
  extension?: string                // File extension
  lastModified?: number             // Timestamp
  size?: number                     // File size in bytes
}
```

## Integration Points

### Track B (File System) - IPC Calls Needed
```
Sidebar.handleOpenFolder()
    ↓
[IPC] dialog.showOpenDialog()
    ↓
fileTreeStore.loadDirectory(path)
    ↓
[IPC] fs.readdir() recursive
    ↓
Updates state.nodes

ContextMenu Actions
    ↓
[IPC] fs.writeFile() / fs.mkdir() / fs.rename() / fs.unlink()
    ↓
fileTreeStore.refresh()
```

### Track A (Editor) - Active File Communication
```
FileTree.openFile(path)
    ↓
fileTreeStore.activePath = path
    ↓
[Track A observes activePath]
    ↓
Editor loads file content
```

### Track D (Layout) - Component Integration
```
MainLayout
├── TitleBar
├── Sidebar (Track C) ← Plugs in here
└── EditorArea (Track A)
```

## Performance Optimizations

1. **Virtual Scrolling**
   - Only renders visible nodes + overscan
   - Handles 1000s of files efficiently
   - Uses @tanstack/react-virtual

2. **Memoization**
   - `useMemo` for filtered nodes
   - `useMemo` for file/directory counts
   - `useCallback` for action handlers

3. **Efficient Search**
   - Recursive filtering
   - Auto-expands directories with matches
   - Preserves expansion state

4. **State Updates**
   - Set for O(1) expanded path lookups
   - Immutable state updates
   - Minimal re-renders

## Keyboard Navigation Map

```
Arrow Up/Down    → Navigate between items
Arrow Right      → Expand directory
Arrow Left       → Collapse directory
Enter            → Open file / Toggle directory
Escape           → Close context menu / Close modal
```

## Styling System

### Tailwind Utilities Used
- Layout: `flex`, `flex-col`, `flex-1`, `gap-*`
- Sizing: `w-*`, `h-*`, `min-w-*`, `max-w-*`
- Spacing: `p-*`, `px-*`, `py-*`, `m-*`
- Colors: `bg-base-*`, `text-base-content`, `border-base-*`
- Effects: `hover:*`, `active:*`, `transition-*`
- Position: `absolute`, `relative`, `fixed`
- Overflow: `overflow-auto`, `overflow-hidden`, `truncate`

### DaisyUI Components Used
- `btn`, `btn-ghost`, `btn-primary`, `btn-sm`, `btn-square`
- `input`, `input-bordered`, `input-sm`
- `modal`, `modal-open`, `modal-box`, `modal-action`
- `menu`, `menu-sm`
- `alert`, `alert-error`
- `loading`, `loading-spinner`
- `badge`, `badge-success`, `badge-info`
- `divider`
- `card`, `card-body`

### Lucide Icons Used
- `File` - Generic file icon
- `FileText` - Markdown file icon
- `Folder` - Closed folder
- `FolderOpen` - Open folder / Open folder action
- `ChevronRight` - Collapsed directory indicator
- `ChevronDown` - Expanded directory indicator
- `Search` - Search input
- `X` - Clear search
- `PanelLeftClose` - Hide sidebar
- `PanelLeftOpen` - Show sidebar
- `FilePlus` - New file
- `FolderPlus` - New folder
- `Edit3` - Rename
- `Trash2` - Delete
- `RefreshCw` - Refresh
- `Eye` - Reveal in finder

## File Statistics

| Component | Lines of Code |
|-----------|---------------|
| ContextMenu.tsx | 287 |
| FileTree.tsx | 275 |
| fileTreeStore.ts | 209 |
| useFileTree.ts | 190 |
| Sidebar.tsx | 147 |
| FileTreeItem.tsx | 124 |
| fileTree.ts (types) | 93 |
| **TOTAL** | **1,325** |

## Testing Strategy

### Unit Tests (TODO)
- [ ] FileTreeItem renders correctly with different node types
- [ ] ContextMenu opens/closes properly
- [ ] Search filtering works correctly
- [ ] Keyboard navigation handlers
- [ ] State management actions

### Integration Tests (TODO)
- [ ] Sidebar resize functionality
- [ ] Virtual scrolling with large datasets
- [ ] Context menu actions trigger state updates
- [ ] Search with nested directories
- [ ] Expand/collapse cascading

### E2E Tests (TODO)
- [ ] Open folder → Display tree
- [ ] Right-click → Context menu → Create file
- [ ] Search → Filter results → Clear search
- [ ] Keyboard navigation end-to-end
- [ ] Resize sidebar → Persist width

## Future Enhancements (Post-Milestone 1)

1. **Drag & Drop**
   - Move files between directories
   - Reorder items
   - Visual feedback

2. **Multi-Select**
   - Cmd/Ctrl + Click
   - Shift + Click range selection
   - Batch operations

3. **Custom File Icons**
   - File extension-based icons
   - Custom icon mapping
   - Theme support

4. **Advanced Search**
   - Regex support
   - File content search
   - Search history

5. **Performance**
   - Lazy loading for large directories
   - Background file scanning
   - Optimistic UI updates

6. **Accessibility**
   - ARIA labels
   - Screen reader support
   - Focus management improvements

7. **Customization**
   - User preferences for sidebar width
   - Sort order options
   - Hidden file toggle
   - Git status indicators
