# Swipe Select — Photo Culling App

A desktop app for rapidly culling large photo collections. Review thousands of images one at a time, swipe or use keyboard shortcuts to keep, reject, or favorite them, then export your selections in one click.

Built with **Tauri 2 + Rust + React + TypeScript**.

---

## What Problem It Solves

After a photo shoot you might have 500–5,000 images. Opening them one by one in a file browser or Lightroom is slow. Swipe Select gives you a focused, distraction-free interface where every image gets a single, instant decision — just like swiping on Tinder. A session of 1,000 photos takes 15–30 minutes instead of hours.

**Original files are never modified.** Selections are recorded in a local database; exporting copies (or moves) files to a folder you choose.

---

## Features

- **Tinder-style swipe gestures** — drag left to reject, drag right to select, or use arrow keys
- **Keyboard-first** — arrow keys, Z to undo, Space to zoom, F for fullscreen
- **Favorites** — Up Arrow marks a photo as both Selected and Favorite in one action
- **Undo** — unlimited undo for the current session
- **Session persistence** — close and reopen; your decisions are saved and you resume exactly where you left off
- **Thumbnail preloading** — ±3 sliding window keeps navigation instant even for large collections
- **Zoom viewer** — 1×/2×/4× zoom with drag-pan and scroll wheel support
- **Dashboard** — live stats (Selected / Rejected / Favorites / Skipped), completion %, rolling ETA
- **Export** — copy or move files to a destination folder, optionally organized into category subfolders, with optional SHA-256 integrity verification
- **HEIC support** — HEIC/HEIF files scan and export normally; preview shows a placeholder (full decode coming in a future release)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| → | Select (keep) |
| ← | Reject |
| ↓ | Skip (decide later) |
| ↑ | Favorite + Select |
| Z | Undo last action |
| Space | Toggle zoom |
| F | Toggle fullscreen |
| Esc | Exit fullscreen |

---

## How to Use

### 1. Open a folder

Launch the app and click **Choose Folder**. Tick **Include subfolders** if your images are nested. Click **Scan Folder** — the app counts all supported images (JPG, PNG, WebP, HEIC).

If you've reviewed this folder before, you'll be offered to **Resume** from where you left off.

### 2. Review photos

Each photo fills the screen. Make a decision:

- **Swipe right** or press **→** to select
- **Swipe left** or press **←** to reject
- Press **↑** to mark as a favorite (also selects it)
- Press **↓** to skip and decide later
- Press **Z** to undo the last action

The progress bar and stats update in real time. Press **⊞** (top-right) to open the Dashboard at any time.

### 3. Export

From the Dashboard, click **Export…**:

1. Choose which categories to export (Selected, Rejected, Favorites, Skipped)
2. Click **Browse…** to pick a destination folder
3. Choose **Copy** (originals stay) or **Move** (originals removed)
4. Optionally enable **Organize into category subfolders** and **Verify SHA-256 integrity**
5. Click **Start Export**

The export report shows how many files succeeded, any failures, and duration.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Rust](https://rustup.rs) (stable toolchain)
- macOS: `xcode-select --install`
- Windows: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### Development

```bash
git clone https://github.com/tech-vin/swipe-select.git
cd swipe-select
npm install
npm run tauri dev
```

First build takes 2–3 minutes while Rust compiles dependencies. Subsequent runs are fast.

### Production build

```bash
npm run tauri build
```

The installer is output to `src-tauri/target/release/bundle/`.

---

## Supported File Types

| Format | Preview | Export |
|--------|---------|--------|
| JPG / JPEG | Full | Yes |
| PNG | Full | Yes |
| WebP | Full | Yes |
| HEIC / HEIF | Placeholder | Yes |

---

## Data Storage

Session data (your decisions and progress) is stored locally at:

- **macOS**: `~/Library/Application Support/com.photoswipeselector.app/photo-swipe-selector/sessions.db`
- **Windows**: `%APPDATA%\com.photoswipeselector.app\photo-swipe-selector\sessions.db`

Thumbnail cache:

- **macOS**: `~/Library/Application Support/com.photoswipeselector.app/photo-swipe-selector/thumbnails/`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 |
| Backend | Rust (tokio, rayon, rusqlite, image, walkdir) |
| Frontend | React 19 + TypeScript + Vite |
| State | Zustand |
| Animations | framer-motion + @use-gesture/react |
| Database | SQLite (bundled via rusqlite) |

---

## License

MIT
