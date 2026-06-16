# Contributing to Swipe Select

Thank you for your interest in contributing. This document covers how to set up a development environment, the project structure, and the conventions used throughout the codebase.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Rust](https://rustup.rs) stable toolchain
- macOS: `xcode-select --install`
- Windows: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### Setup

```bash
git clone https://github.com/tech-vin/swipe-select.git
cd swipe-select
npm install
npm run tauri dev
```

The first Rust compilation takes 2–3 minutes. Subsequent `tauri dev` runs are fast (incremental).

---

## Project Structure

```
swipe-select/
├── src/                          # React frontend
│   ├── screens/
│   │   ├── ImportScreen/         # Folder picker + scan
│   │   ├── ReviewScreen/         # Main review UI + SwipeCard + ZoomViewer
│   │   ├── DashboardScreen/      # Stats + ETA
│   │   └── ExportDialog/         # Export flow
│   ├── hooks/
│   │   ├── useDecisionActions.ts # decide() + undo() logic
│   │   ├── useKeyboardShortcuts.ts
│   │   └── usePreloader.ts       # Thumbnail sliding window
│   ├── store/
│   │   ├── sessionStore.ts       # Primary session state (Zustand)
│   │   ├── undoStore.ts          # In-memory undo stack
│   │   └── uiStore.ts            # Screen + zoom + fullscreen
│   ├── lib/
│   │   ├── tauriApi.ts           # Typed invoke() wrappers
│   │   └── imagePath.ts          # convertFileSrc helper
│   └── types/                    # TypeScript types
│
└── src-tauri/src/                # Rust backend
    ├── commands/
    │   ├── scan.rs               # Folder scan + progress events
    │   ├── session.rs            # SQLite session CRUD
    │   ├── thumbnail.rs          # Thumbnail generation + batch
    │   └── export.rs             # File copy/move + SHA-256
    ├── thumbnails/generate.rs    # Image resize + HEIC placeholder
    ├── fsutil/
    │   ├── copy.rs               # mtime-preserving copy/move
    │   └── hash.rs               # Streaming SHA-256
    ├── models/                   # Serde structs
    ├── db/sqlite.rs              # Schema + AppState
    └── lib.rs                    # Tauri builder + command registration
```

---

## Development Workflow

### Running the app

```bash
npm run tauri dev
```

Vite HMR is active for frontend changes — they apply without restarting. Rust changes require a recompile (automatic, ~5–15s for incremental builds).

### Type checking

```bash
npx tsc --noEmit          # Frontend
cargo check --manifest-path src-tauri/Cargo.toml  # Backend
```

Both must pass before submitting a PR.

### Linting

```bash
npm run lint              # ESLint
cargo clippy --manifest-path src-tauri/Cargo.toml
```

---

## Conventions

### Frontend

- **Components**: function components only, no class components (except `ErrorBoundary`)
- **State**: Zustand for app state, `useState` for local component state
- **Selectors returning objects**: always wrap with `useShallow` from `zustand/react/shallow` to avoid infinite render loops
- **Tauri calls**: always go through `src/lib/tauriApi.ts` (typed wrappers), never call `invoke` directly in components
- **No comments** unless the reason is non-obvious (a constraint, workaround, or subtle invariant)
- **CSS**: plain CSS modules per component, no Tailwind or CSS-in-JS
- **Imports**: no barrel `index.ts` files — import directly from the source file

### Rust

- All commands return `Result<T, String>` — errors are surfaced to the frontend as strings
- Blocking I/O goes through `tokio::task::spawn_blocking` or `block_in_place`
- Parallel work uses `rayon`; async coordination uses `tokio`
- The SQLite connection is shared as `Mutex<Connection>` in `AppState`; keep lock durations short
- No `unwrap()` in command handlers — use `?` and `map_err(|e| e.to_string())`

---

## Adding a New Tauri Command

1. Write the handler function in the appropriate `src-tauri/src/commands/*.rs` file with `#[tauri::command]`
2. Re-export it from `commands/mod.rs`
3. Register it in `lib.rs` inside `tauri::generate_handler![...]`
4. Add a typed wrapper in `src/lib/tauriApi.ts`
5. Add the TypeScript types in `src/types/` if needed

---

## Submitting a Pull Request

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes — keep PRs focused on a single concern
3. Ensure `tsc --noEmit` and `cargo check` both pass
4. Open a PR with a clear description of what changed and why
5. Reference any related issues

### PR checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `cargo check` passes
- [ ] No new `unwrap()` calls in Rust command handlers
- [ ] No `getStats()` (or any object-returning selector) called without `useShallow`
- [ ] Original files are never written to (read-only guarantee preserved)

---

## Reporting Bugs

Open a GitHub Issue with:

- macOS / Windows version
- Steps to reproduce
- What you expected vs. what happened
- Any errors from the app window (right-click → Inspect → Console)

---

## Feature Requests

Open a GitHub Issue with the `enhancement` label. Check [DESIGN.md](DESIGN.md) first — the "Future Work" section lists features already planned.
