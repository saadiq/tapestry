# Tapestry - Product Milestones

AI-powered document workspace development roadmap (excludes collaborative features)

---

## Milestone 1: Foundation & Core Editor
**Goal:** Basic offline-first Markdown editor with file system integration

### Features
- Electron + React + TypeScript app scaffold (using Electron Forge + Vite)
- File system integration (open any directory/folder on local machine)
- **WYSIWYG Markdown editor using TipTap**:
  - Live formatted preview (see formatted text as you type)
  - Support markdown syntax auto-formatting (type `**bold**` → becomes **bold**)
  - Context menu for formatting selected text (bold, italic, headings, lists, links, etc.)
- File tree/sidebar navigation for browsing directories
- Basic file operations (create, open, save, delete, rename)
- Local-first storage (direct filesystem access via Node fs)

### Tech Stack
- Electron with Node 22+
- React + TypeScript
- TipTap (ProseMirror) for WYSIWYG editing
- Electron Forge + Vite for build tooling

---

## Milestone 2: AI Integration Core
**Goal:** Context-aware AI assistance for documents

### Features
- Claude SDK integration (API key configuration)
- AI sidebar/panel for chat interface
- Basic AI operations:
  - Document summarization
  - Content synthesis across selected files
  - Q&A about document content
- Context management (sending file/folder contents to AI)
- Directory-aware AI (analyze at file, folder, or project level)
- Online/offline state handling (graceful degradation)

### Technical Considerations
- Main process handles Claude SDK calls
- React state management for AI responses
- Queue requests when offline
- Handle API key securely (environment variables)

---

## Milestone 3: Advanced AI Features
**Goal:** Purpose-driven AI capabilities for knowledge work

### Features
- **Dynamic Summaries System**:
  - Create multiple summaries of same content
  - Pin/save summaries for different audiences/purposes
  - Template-driven summaries (executive, technical, client-facing, etc.)
- **Prompt Library**:
  - Store and organize reusable prompts
  - Tag prompts by content type/use case
  - Quick-apply saved prompts to documents
  - Share prompts across projects
- AI-assisted editing (inline suggestions, rewrites, tone adjustments)
- Batch operations (process multiple files with same prompt)

### Data Storage
- SQLite database for prompts and summaries metadata
- Prompts stored with tags, categories, usage count
- Summaries linked to source documents with versioning

---

## Milestone 4: Context Management & Organization
**Goal:** Tools for curating and organizing source material

### Features
- **Project Workspaces**:
  - Create/switch between project contexts
  - Project-specific settings and AI context
  - Recent projects list
  - Project-level prompt libraries
- Metadata system (tags, categories, custom fields for documents)
- Full-text search functionality across all files
- Context curation templates (best-practice workflows for organizing materials)
- Favorites/bookmarks for important files
- Document linking (wiki-style links between documents)

### UX Improvements
- Quick switcher (Cmd+K) for files and projects
- Global search with filters
- Tag-based organization and filtering
- Visual project dashboard

---

## Milestone 5: Export & Publishing
**Goal:** Output documents in formats the world expects

### Features
- **Smart Export System**:
  - Markdown to PDF conversion (with styling options)
  - Markdown to Word (.docx)
  - Markdown to HTML (static or styled)
  - Markdown to PowerPoint/Slides (future consideration)
- Export templates/styling options:
  - Custom CSS for PDF/HTML
  - Word template support
  - Header/footer customization
- Batch export capabilities (export entire project)
- Preview before export
- Export presets (save export configurations)

### Technical Implementation
- Use libraries like `puppeteer` for PDF, `docx` for Word
- Template engine for customizable exports
- Background processing for large exports

---

## Milestone 6: Plugin Architecture
**Goal:** Extensibility for pulling in external data sources

### Features
- **Plugin System Foundation**:
  - MCP (Model Context Protocol) based plugin architecture
  - Plugin discovery and installation UI
  - Plugin permissions and sandboxing
  - API for plugin developers
- **Core Plugins**:
  - Email integration (pull emails into markdown)
  - Google Docs import plugin
  - Notion import/sync
  - Web clipper (save web content as markdown)
  - Calendar integration (meeting notes)
- Plugin settings and configuration
- Plugin marketplace/directory (basic)

### Developer Experience
- Plugin SDK and documentation
- Example plugins and templates
- Hot reload for plugin development

---

## Milestone 7: Cross-Device Access
**Goal:** Work across devices with optional sync

### Features
- **Optional Cloud Sync Backend**:
  - File synchronization across devices
  - Conflict resolution (last-write-wins or manual merge)
  - Selective sync (choose what to sync)
  - End-to-end encryption option
  - Sync status indicators
- **Multi-Device Support**:
  - macOS, Windows, Linux desktop apps
  - Sync settings and preferences
  - Device management (see/remove connected devices)
- **Mobile Companion App** (iOS/Android):
  - Voice transcription for quick capture
  - Quick notes and ideas capture
  - View documents (read-only or light editing)
  - Camera integration (OCR for handwritten notes)
  - Sync with desktop

### Technical Architecture
- Backend: Node.js server with WebSocket for real-time sync
- Storage: S3-compatible for files, PostgreSQL for metadata
- Sync protocol: Operational Transform or CRDT for conflict-free updates
- Mobile: React Native or native Swift/Kotlin

---

## Future Considerations (Post-MVP)
- Collaborative editing (real-time multi-user)
- Shared context repositories for teams
- Version control integration (Git-like for documents)
- Advanced AI agents (custom workflows, automation)
- API for third-party integrations
- Desktop widgets and quick capture tools
