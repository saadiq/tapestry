# Tapestry

> Your AI-powered document workspace for context engineering

Tapestry is a desktop application that transforms how you work with AI by putting context management first. Built on Electron with a modern React UI, it provides a local-first markdown editing experience designed for the AI era.

## The Vision

In an AI-powered world, we've become **context engineers** rather than just document creators. The real challenge isn't editing text—it's curating, organizing, and synthesizing the high-quality source material that feeds AI outputs. Without proper context management, we're left with "garbage in, garbage out."

Tapestry solves this by providing a flexible, desktop-first workspace where you can:

- Work directly with your existing file system (no proprietary silos)
- Edit markdown with both WYSIWYG and raw markdown modes
- Prepare for AI-assisted synthesis at file, folder, or project level
- Maintain control over your knowledge base

### Who It's For

**Knowledge workers** who synthesize information from multiple sources—consultants, researchers, project managers, writers, strategists. Anyone who needs better AI outputs through better input management.

**AI adopters** who understand that prompt engineering alone isn't enough—context engineering is the next frontier.

## Current Features (Milestone 1)

### Local-First Markdown Editing
- **Dual-mode editor**: Switch between WYSIWYG (TipTap) and raw markdown editing
- **File system integration**: Point at any directory on your system
- **Virtual scrolling file tree**: Handle large document collections efficiently
- **Auto-save with dirty state tracking**: Never lose your work
- **Real-time file watching**: See external changes immediately

### File Management
- **Context menu operations**: Right-click for create, rename, delete, refresh
- **Inline rename**: Double-click active file to rename in place
- **Reveal in Finder/Explorer**: Open system file manager at file location
- **Keyboard navigation**: Arrow keys, Enter to open files

### Markdown Features
- **Standard markdown syntax**: Headers, bold, italic, lists, links, images, code blocks
- **GitHub Flavored Markdown**: Tables, strikethrough, task lists (coming soon)
- **Syntax highlighting**: Code blocks with language detection
- **Partial HTML support**: Basic formatting tags (`<b>`, `<i>`, `<code>`, etc.) and block elements (`<div>`, `<p>`, etc.)
  - *Note: HTML support is partial - inline styles and advanced formatting are not preserved*
  - *Limitations: Nested inline tags may not perfectly preserve all mark combinations; event handlers are stripped for security*

### Modern Desktop Experience
- **Native file dialogs**: Works like a desktop app should
- **Theme support**: Light and dark modes with DaisyUI
- **Keyboard shortcuts**: Efficient editing workflows
- **Cross-platform**: Built with Electron for macOS, Windows, and Linux

### Developer-Friendly
- **TypeScript throughout**: Type-safe IPC communication between processes
- **Hot reload**: Fast development with Vite HMR
- **Testing ready**: Vitest configured for unit and integration tests
- **Clean architecture**: Separation of concerns with React Context API

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) package manager
- Node.js 18+ (for Electron)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tapestry.git
cd tapestry

# Install dependencies
bun install

# Start development server
bun start
```

### Development Commands

```bash
# Start with hot reload
bun start

# Run tests
bun test

# Run tests with UI
bun test:ui

# Run tests with coverage
bun test:coverage

# Lint code
bun run lint

# Package for distribution
bun package

# Create installers
bun make
```

## Architecture

Tapestry follows Electron's multi-process architecture with a clean separation of concerns:

- **Main Process**: File system operations, native dialogs, window management
- **Renderer Process**: React UI with restricted Node.js access
- **Preload Script**: Type-safe IPC bridge using `contextBridge`
- **Shared Types**: TypeScript interfaces across process boundaries

### Key Technologies

- **Electron 38** - Desktop application framework
- **React 19** - UI framework
- **TypeScript** - Type safety throughout
- **TipTap** - Rich text editing with markdown support
- **Tailwind CSS v4** - Utility-first styling
- **DaisyUI** - Component library
- **Vite** - Build tool and dev server

## Roadmap

### Milestone 2: AI Integration
- Directory-aware AI assistance for synthesis
- Dynamic summaries with multiple perspectives
- Prompt library for reusable patterns
- Smart export to PDF, Word, and other formats

### Milestone 3: Context Management
- Plugin architecture for external data sources (emails, Google Docs, etc.)
- Project workspace organization
- Context curation tools and templates
- Best-practice workflows

### Future: Team Collaboration
- Shared context repositories
- Collaborative intelligence across teams
- Feedback loops as context
- Version control for content and context

See [docs/vision.md](docs/vision.md) for the complete vision.

## Contributing

Tapestry is in active development. Contributions are welcome! Please check out the [CLAUDE.md](CLAUDE.md) file for development guidelines and architecture details.

---

**Note**: Tapestry is currently in Milestone 1 (core editing experience). AI features and team collaboration are planned for future releases.
