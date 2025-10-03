# **Building an AI-Powered Electron App on macOS: Stack & Tooling (2025)**

## **Tech Stack Overview**

**Electron + Node.js:** Electron remains a top choice for cross-platform desktop apps, even on macOS. It bundles a Chromium browser with Node.js, letting you build UI with web tech and access OS features via Node APIs. Using the latest Electron (v24+ in 2025) is recommended, along with Node 22+ (the Electron ecosystem is moving to Node 22 LTS as minimum ). This ensures compatibility and performance improvements from newer Node features. Electron gives an “offline-first” capability by default – you can read/write local files or databases without a network, achieving native-like responsiveness. When online, the app can call out to cloud services (e.g. LLM APIs) as needed.

**TypeScript:** Consider writing your Electron app in TypeScript. Electron Forge (the official build tool) supports TS out-of-the-box , and strong typing will help catch errors early. AI coding assistants (like Claude Code or Codex) also benefit from TypeScript definitions to produce correct code.

**Front-End Framework:** A **React + TypeScript** stack is a safe, powerful choice for the renderer process. React is very popular for Electron apps, with a large ecosystem of components and documentation (and likely well-represented in LLM training data). In fact, Electron Forge integrates easily with frameworks like React or Angular . Using React will make it easier for AI co-coding tools to generate familiar patterns. Alternatively, **Svelte** or **Vue** can work for lighter UI – some developers prefer Svelte’s compiled, efficient output over React’s runtime overhead . But given _no strong personal preference_ and the desire to leverage AI assistance, React’s ubiquity and community support make it a solid default.

**UI/Editor Libraries:** Since this app is a _“document workspace”_ (focused on Markdown documents), you’ll need a text editor component. Two popular choices are:

*   **CodeMirror 6** – a versatile text editor library (used by Obsidian and others for Markdown). It’s lightweight and supports Markdown syntax highlighting and editing. Many coding LLMs are familiar with CodeMirror usage, and its API is well-documented.
    
*   **Monaco Editor** – the code editor that powers VS Code. It can be used for text/markdown as well, offering rich features (intellisense, etc.). However, Monaco is heavier than CodeMirror and might impact startup performance.
    

If you want a WYSIWYG Markdown editor (rendered view with formatting), consider **TipTap (ProseMirror)**, which provides an API to manipulate rich-text/markdown. TipTap has good docs and is used in AI-assisted editors, but it’s a bit more specialized. Given an “AI workspace” context, a plain Markdown+preview (like Obsidian) might suffice initially, keeping the stack simpler.

**Local Data Storage:** For an _offline-first_ design, plan how to store documents locally. The simplest approach is using the filesystem (Electron’s fs module) to read/write markdown files in a designated folder. This gives full offline access and easy user backup. If you need structured storage (for metadata, tags, etc.), consider an embedded database: **SQLite** (via a Node module) is a robust choice. Modern Electron can even use the experimental node:sqlite module (Node 20+) for a built-in SQLite API . Higher-level libraries like **RxDB** or **PouchDB** can provide a NoSQL/JSON DB that syncs when online. On StackOverflow, devs suggest using client-side DBs like _RxDB, SQLite, or WatermelonDB_ to durably store local state . These can later sync with a backend when online. If you want to avoid writing a lot of sync logic, newer solutions such as **Triplit** or **Electric SQL** let you define a single TypeScript schema and automatically sync local-first data to a server . This “distributed sync” approach can simplify adding cloud features to an offline-first app . In early versions, you might not need full sync – you could start with just local storage, then add cloud sync if users want multi-device access.

## **Building & Packaging Tooling**

**Electron Forge:** For scaffolding and building the app, Electron Forge is highly recommended. It’s the officially maintained CLI that ties together build tools (Webpack/Vite, packaging, code signing, etc.) into one easy workflow . Forge supports templates – for example, a Vite + React + TypeScript template is available, which gives you a modern setup from the start . Using Forge means you get a one-command project setup (npx create-electron-app) and commands like npm run make to produce installers (dmg for Mac, etc.). Developers report that _Electron Forge “just works”_ – it handles multi-platform packaging and even code signing on Mac with minimal fuss . This is great for a solo dev because it’s _“battle tested and hassle free”_ . Under the hood, Forge uses **Electron Packager/Electron Builder** to create binaries, so you aren’t losing any capabilities.

**Vite for Development:** Forge can be configured to use Vite as the build tool (and its official Vite template does this). Vite provides lightning-fast hot-reload and bundle builds, which is a boon for productivity. If Forge’s Vite support feels limited (it’s still improving), an alternative is **electron-vite** (a community project) or manually combining Vite with Electron. However, caution: some community boilerplates (like electron-vite npm package) have had maintenance gaps . Sticking to Forge (which is maintained by the Electron team) with its Vite template is a stable choice. In development, you can run npm start (which under Forge will start the Electron app and a Vite dev server for your UI) to get live reload during coding.

**Electron Builder (optional):** Forge internally uses Electron Builder for packaging. You might use Builder’s config if you need fine-grained control (like notarizing the Mac app for Gatekeeper, setting app icons, etc.). But most of this can be handled via Forge’s config or simple CLI flags. If you later set up CI/CD, Builder can directly publish releases with auto-updates, but initially Forge’s simplicity is preferable.

**Debugging & Testing:** During development, you’ll rely on Chrome DevTools (built-in with Electron’s browser window) to inspect the UI, profile performance, and check console logs. For deeper debugging (main process, or automated testing), consider tools like:

*   **Devtron:** an Electron DevTools extension that helps inspect Electron-specific things (like inter-process communication, performance metrics, etc.).
    
*   **Playwright or Spectron:** for end-to-end testing of the app’s UI. Spectron was the classic Electron testing library, but it’s outdated. A modern approach is using Playwright, which [can automate Electron apps](https://playwright.dev/docs/api/class-electron) by controlling the main process and renderer. This is also where AI tooling comes into play (more on this below, in MCP servers).
    

## **AI Integration (Claude SDK & LLM Calls)**

Since you plan on an _“AI-powered”_ workspace, integrating an LLM is core. You mentioned **Claude Code SDK** – this is a toolkit from Anthropic that essentially allows running Claude (the LLM) as an agent in your app or development environment. Key points for integration:

*   **Claude Code TypeScript SDK:** Anthropic provides a Node/TS SDK for Claude Code . You can use this inside the Electron app’s main process (or even in the renderer with proper Node integration) to call Claude’s API. The SDK is built on the same agent that powers the Claude Code assistant, giving you advanced features like automatic context management and tool use . Using the SDK, you can set up an AI assistant that, for example, summarizes documents, suggests edits, or performs queries when the user asks – all by calling Claude’s API under the hood.
    
*   **LLM API Calls:** Whether via the SDK or direct HTTP calls, you’ll need an API key for the LLM (Claude). The SDK simplifies this by using the same config as Claude Code – you just set ANTHROPIC\_API\_KEY in your environment . In-app, ensure you handle cases where the user is offline – maybe queue requests or notify them that AI features need internet. For sensitive data, clarify what gets sent to the cloud (Claude or other LLMs).
    
*   **Agent vs. Direct Prompting:** The Claude Code SDK allows building _agentic_ behavior – meaning the AI can use tools and have a longer-running conversation with the app. For instance, you might implement a “AI Assistant” panel where the user can chat, and the AI can browse the document, open files, or execute certain actions (with permission). Claude Code’s SDK includes a _“rich tool ecosystem”_ with built-in abilities (file I/O, code execution, web search) and the ability to extend via custom tools (MCP) . This could enable very powerful features in your app (like “Claude, find relevant info in my notes” which triggers a search through documents). However, it also adds complexity, so you might start with simpler direct prompt calls (e.g., sending the document text to Claude for summary).
    
*   **UI Integration:** Provide UI affordances for AI features – e.g., a sidebar for AI chat, or right-click context menu to “Ask AI to summarize” a document. The front-end (React) would send these requests to your backend logic (which could be in the main process or a web worker) that calls Claude and returns the result to display. Using React state management (Context or Redux if complex) will help manage loading states and outputs.
    
*   **Fallback to Offline:** When offline, your app will function as a Markdown editor (no AI). Design the app such that all core editing is local, and AI features are optional enhancements when online. This aligns with _offline-first._ You could even consider a small local ML model for basic AI when offline (like a local transformer for simple autocomplete), but that’s advanced and likely unnecessary initially – focusing on Claude via internet is fine.
    

## **AI Development Tools (CLI, MCP Servers, Docs for LLM)**

A unique aspect here is that _you_ (the developer) will be using AI coding tools (Claude Code, Codex) to build the app. This means you can set up your dev environment to maximize the AI’s usefulness:

*   **Claude Code CLI / VS Code Extensions:** You can run Claude Code in a headless CLI mode or use it via an extension. For example, Anthropic’s Claude Code can run in the terminal and integrate with your editor (via an LSP or simple CLI commands). Setting this up will let you query Claude for code suggestions or have it generate code within your project. Ensure your project is well-structured and check in a [CLAUDE.md](http://CLAUDE.md) (the memory file Claude uses) describing the project and stack. This file can hold instructions for Claude (e.g., “We’re building an Electron + React app for document editing. Use CodeMirror for editor…”). Claude will refer to it to stay on track  .
    
*   **LLM-Accessible Documentation:** To help Codex/Claude help you, make sure documentation for your stack is accessible. Claude Code supports providing tools for documentation lookup. In fact, developers have created an **MCPDoc** server tool that allows Claude to fetch library docs on demand . If you choose any obscure libraries, consider feeding their docs in a prompt or using such a tool. However, often the best results come from giving a concise guide to the AI in [CLAUDE.md](http://CLAUDE.md) and only pulling detailed docs when needed  . Since you’re using mainstream technologies (Electron, React, etc.), the AI likely has been trained on a lot of their docs. Still, keep official docs bookmarked. For example, _Electron’s own docs_ (electronjs.org/docs) and _React docs_ are high-quality references. You could copy essential bits (APIs, usage examples) into a local file for quick reference by the AI. Also, leverage Claude Code’s web search tool if enabled – it can search the web for you within its context .
    
*   **MCP Servers for Automation:** _Model Context Protocol (MCP)_ servers are a game-changer for AI-assisted development. In short, MCP is an open standard that lets external tools (like AI agents) interface with your environment in a controlled way . There are a few MCP servers you can use in tandem with Claude/Codex to streamline building and debugging your Electron app:
    
    *   **Electron Debug MCP Server:** This is a specialized server that bridges MCP to Electron’s internals . It allows an AI agent to **launch, inspect, and control** your Electron app programmatically via a standardized API. Essentially, it hooks into Chrome DevTools Protocol (CDP) so the AI can evaluate JS in the app, reload it, or fetch logs . This could let Claude, for example, run your app and diagnose an error by reading the console or even manipulating the DOM, all through the MCP interface.
        
    *   **Circuit MCP (Web & Electron):** An MCP server called _Circuit_ (by Snowfort) uses Playwright to let AI agents interact with web or Electron apps like a human user . You can install @snowfort/circuit-electron via npx and, with a bit of config, allow the AI to drive your app’s UI (click buttons, navigate, etc.) for testing. The creator notes it works for both web and Electron by leveraging Playwright under the hood . This is extremely useful for autonomous testing: you could have Claude Code run integration tests by actually clicking through the app’s interface.
        
    *   **Terminal MCP Server:** Another handy one is a console/terminal MCP server, which exposes your system shell to the AI (in a controlled way). For example, the _Electron Terminal MCP Server_ lets an AI run terminal commands, manage processes, and retrieve output within the Electron dev environment . This means the AI could run your build scripts, git commands, or tests on request. Using this, you might ask Claude “Run the build and tell me if there are errors,” and it could execute npm run build and report back the output.
        
    *   **MCPDoc (Documentation tool):** As mentioned, an MCP documentation server can serve docs. If you include one like MCPDoc (open-source on GitHub ), Claude can call e.g. list\_doc\_sources and fetch\_docs to get specific API details while coding. This prevents overloading Claude’s context with entire manuals – it can pull in just the needed sections on demand.
        
    

To use these, you’ll configure your Claude Code agent’s settings (often a JSON or YAML) to include these MCP servers under an mcpServers section . Many AI devs share their tool configs on forums like r/ClaudeAI – e.g., a typical config might enable the web browser tool, an editor filesystem tool, and the above MCP servers. Claude Code SDK allows fine-grained permissioning of tools , so you can restrict what the AI can do (for safety, you might allow it to run read-only operations without confirmation, but require approval before it writes to files or executes dangerous commands).

**Benefits:** By leveraging these AI dev tools, you essentially get an AI pair programmer that not only suggests code but can _act_ – it can run your app, see what went wrong, open the relevant docs, and even fix code, all in a loop. This can massively speed up development if used carefully. Just be mindful of security (especially with terminal access) and validate any AI-generated code or actions.

## **Performance and Offline Considerations**

Building with Electron means you have to be conscious of app performance (memory and CPU), since Chromium can be heavy. Some strategies:

*   **Efficient front-end**: Keep your React app snappy – use React’s production build, and consider performance optimizations (memoization, avoiding heavy renders). For a Markdown editor, the heavy lifting might be text rendering; try to update only the changed parts (e.g., use a diff algorithm or virtualization for very large docs).
    
*   **Profiling**: Follow Electron’s advice to profile and measure regularly . Use Chrome DevTools’ performance tab to see what slows down a keystroke or an AI operation. Electron maintainers suggest iteratively finding bottlenecks and optimizing them, as done in apps like VS Code and Slack .
    
*   **Main vs Renderer**: Do not block the main process. Long-running tasks (like computing an AI suggestion or a big text manipulation) should be offloaded. You can use **Node’s worker threads** or an **offscreen renderer** for heavy tasks. For example, if you do a large Markdown to HTML conversion for preview, do it in a web worker or background process, so the UI stays responsive. Avoid blocking the renderer too – split work into async chunks if needed  .
    
*   **Bundle size**: Use Vite/Webpack to tree-shake and minimize your bundle. Electron apps often include tons of Node modules they don’t need. Audit your dependencies (“carelessly including modules” can bloat memory ). Only import what’s necessary. This will improve startup time and memory footprint.
    
*   **Menu/BrowserWindow optimizations**: If you don’t need a top menu, disable the default menu (Menu.setApplicationMenu(null) to save resources ). Also use BrowserWindow options like webPreferences: { contextIsolation: true, nodeIntegration: false } for security, and enable sandbox if possible. While security isn’t the focus of the question, it’s good practice to follow Electron’s security guidelines in parallel.
    

## **Conclusion**

**Summing up,** a robust stack for an AI-powered Electron app on Mac would be: **Electron + Node 22+, React/TypeScript front-end (with a Markdown editor library), Electron Forge + Vite for build**, and a local-first data store (files or SQLite) for offline use. Layer in the **Claude Code SDK** to handle AI features, using Claude’s powerful agent capabilities to assist with document tasks. For development, take advantage of **CLI and MCP tools**: Electron Forge for easy building, and MCP servers (Electron Debug, Circuit, Terminal, Doc fetcher) to let your AI coding assistant test and debug the app programmatically. This combination will let you build an _“AI document workspace”_ efficiently, with offline-first behavior and seamless online AI augmentation.

By choosing widely-supported tools and frameworks, you also ensure that **documentation and help are plentiful** – both for you and the AI pair-programmer. The LLMs you’re using have likely been trained on these technologies, and with accessible docs (and perhaps a few MCP hooks to fetch more), they can significantly accelerate development. With this stack and tooling, you’ll be set up for success to build a high-performance, cross-platform desktop app with intelligent features.

**Sources:**

*   Electron Forge official docs – modern Electron build tooling  
    
*   Reddit discussion on Electron dev tooling (Forge vs custom)  
    
*   StackOverflow on offline-first app architecture (local DB vs sync solutions)  
    
*   Anthropic Claude SDK docs – using Claude Code’s agent and tools  
    
*   Anthropic Claude SDK blog – best practices for documentation context  
    
*   GitHub – Electron Debug MCP (MCP server for Electron control)
    
*   Reddit – _Circuit_ MCP for automating Electron and web (uses Playwright)
    
*   LangDB AI – Electron Terminal MCP (run shell commands via MCP)
    
*   Electron Docs – Performance optimization checklist
