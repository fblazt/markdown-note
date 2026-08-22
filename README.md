# Markdown Note App

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4.5.2-00DC82?style=flat-square&logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5.41-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Dexie.js](https://img.shields.io/badge/IndexedDB-Dexie_4.4.5-008080?style=flat-square)](https://dexie.org/)
[![Marked.js](https://img.shields.io/badge/Marked-15.0.12-FF8800?style=flat-square&logo=markdown&logoColor=white)](https://marked.js.org/)
[![Mermaid.js](https://img.shields.io/badge/Mermaid-11.4.1-FF3670?style=flat-square&logo=mermaid&logoColor=white)](https://mermaid.js.org/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2.7-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

> A modern, local-first Markdown note editor with real-time live preview, interactive Mermaid.js diagrams, hierarchical folders, multi-format export, client-side IndexedDB persistence, and Kanagawa aesthetic.

---

## Key Features

### Local-First & Offline-Ready
- **Client-Side IndexedDB Storage**: Uses Dexie.js (`MarkdownNotesDB`) for pure client-side persistence with instant sub-millisecond queries.
- **Zero Server Dependency**: Fully functional offline single-page application (`ssr: false`) with no external database requirements.
- **Debounced Auto-Save**: Seamless 500ms auto-save with reactive save status indicators (`Saving...`, `Saved`, `Error`), plus synchronous flushing on page navigation, `beforeunload`, `pagehide`, and `visibilitychange`.

### Real-Time Live Preview & Split View
- **Hardware-Accelerated Panel Layout**: Toggle between **Editor Only**, **Split View**, and **Preview Only**.
- **Isolated Wrapper Architecture**: Prevents textarea cursor jitter, reflow artifacts, and scroll position loss during panel transitions.
- **Responsive Master-Detail**: Mobile card transitions with intuitive drill-down navigation and iOS safe-area adaptation.

### Interactive Mermaid Diagrams
- **Diagram Rendering**: Native support for Mermaid code blocks (`mermaid`), rendering flowcharts, sequence diagrams, state diagrams, class diagrams, Gantt charts, git graphs, and mindmaps.
- **Dynamic Kanagawa Theming**: Mermaid diagrams automatically adapt to active Kanagawa Dragon (Dark) and Lotus (Light) color tokens.
- **Resilient Typing Feedback**: Non-intrusive syntax error notices during live typing that gracefully resolve once diagram syntax is complete.

### Hierarchical Nested Folders & Drag-and-Drop
- **Multi-Level Subdirectories**: Organize notes into nested paths (e.g. `Projects/Frontend/Docs`) with automatic parent folder registration.
- **Cascading Operations**: Renaming or deleting folders automatically cascades across all descendant paths and note references.
- **Cycle Prevention**: Intelligent validation prevents moving folders into their own subtrees.
- **Visual Drag-and-Drop**: Drag notes into folders or re-parent folders with high-contrast drop indicator highlights.

### Multi-Format Export Suite
- **Markdown (`.md`)**: Full note contents including YAML frontmatter with title, tags, folder, and timestamps.
- **Standalone HTML5 (`.html`)**: Beautiful, self-contained HTML documents with embedded Kanagawa light/dark styling and print CSS.
- **Plain Text (`.txt`)**: Clean, formatted text stripped of Markdown syntax.
- **JSON (`.json`)**: Raw structured note data for developer backup and migration.
- **Print / PDF**: Direct browser print rendering optimized with dedicated `@media print` typography.
- **Bulk Export**: Export the entire note library as a consolidated Markdown digest with Table of Contents or a full JSON backup archive.

### Storage Quota Telemetry & Resilience
- **Proactive Quota Monitoring**: Real-time telemetry via `navigator.storage.estimate` and `navigator.storage.persisted`.
- **Status Indicators**: Sidebar indicator badge displaying storage percentage and byte breakdowns (`Warning` at ≥80% or <50MB, `Critical` at ≥95% or <10MB).
- **Persistent Storage Request**: In-app button to request persistent browser storage (`navigator.storage.persist`).
- **Quota Exceeded Recovery**: Automatic catch and notification for `QuotaExceededError` with emergency backup export links.

### Kanagawa Aesthetic & Accessibility
- **Kanagawa Themes**: Faithful implementation of Kanagawa Dragon (Dark) and Kanagawa Lotus (Light) palettes.
- **Theme Synchronization**: Automatic OS `prefers-color-scheme` matching with `localStorage` overrides.
- **Accessible Dialogs**: Modal `ConfirmDialog` replacing disruptive browser `confirm()` popups, featuring focus trapping, ESC dismissal, and autofocus on Cancel for destructive actions.
- **Mobile First Ergonomics**: 44px minimum touch targets, `100dvh` viewport handling, and iOS auto-zoom prevention (16px base input font).

### Security & Performance
- **XSS Protection**: Complete sanitization via `DOMPurify` while preserving safe SVG elements generated by Mermaid diagrams.
- **Contextual Stats**: Real-time word count, character count, and estimated reading time displayed directly in the editor status bar.

---

## License

MIT License. Open source for personal and commercial use.
