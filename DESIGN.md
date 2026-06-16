# Design Document — Swipe Select

## Overview

Swipe Select is a desktop photo culling tool built on Tauri 2 (Rust backend) + React + TypeScript. The core design goal is to make reviewing large photo collections as fast as possible while guaranteeing that original files are never modified.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     React Frontend                   │
│                                                     │
│  ImportScreen  ReviewScreen  Dashboard  ExportDialog│
│       │             │            │           │      │
│  ─────────────── Zustand Stores ──────────────────  │
│  sessionStore    undoStore    uiStore               │
│       │                                             │
│  ─────────────── tauriApi.ts ─────────────────────  │
└────────────────────┬────────────────────────────────┘
                     │ Tauri IPC (invoke / emit)
┌────────────────────▼────────────────────────────────┐
│                   Rust Backend                       │
│                                                     │
│  commands/                                          │
│    scan.rs       — walkdir folder scan              │
│    session.rs    — SQLite read/write                │
│    thumbnail.rs  — image resize + HEIC placeholder  │
│    export.rs     — copy/move + SHA-256 verify       │
│                                                     │
│  thumbnails/generate.rs — cache-keyed thumb gen     │
│  fsutil/copy.rs         — mtime-preserving copy     │
│  fsutil/hash.rs         — streaming SHA-256         │
│  db/sqlite.rs           — schema + AppState         │
└─────────────────────────────────────────────────────┘
```

---

## Data Model

### Selection State

Two independent axes per photo:

| Axis | Values |
|------|--------|
| `selectionState` | `pending` \| `selected` \| `rejected` \| `skipped` |
| `isFavorite` | `true` \| `false` |

These are orthogonal. A photo can be `selected` without being a favorite, or `rejected` and still favorited (though unusual). The Up Arrow key **cascades**: it sets both `selectionState = selected` and `isFavorite = true` in one atomic action.

### SQLite Schema

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  folder_path TEXT UNIQUE NOT NULL,
  recursive INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  total_images INTEGER NOT NULL
);

CREATE TABLE photo_states (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL,
  path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  modified_at INTEGER NOT NULL,
  sort_index INTEGER NOT NULL,
  selection_state TEXT NOT NULL DEFAULT 'pending',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  decided_at INTEGER,
  PRIMARY KEY (session_id, photo_id)
);

CREATE INDEX idx_photo_states_session ON photo_states(session_id, sort_index);
```

`folder_path` is UNIQUE in `sessions` so rescanning the same folder reuses (upserts) the existing session row. Photo state rows are deleted and reinserted on every fresh scan.

---

## Frontend State

### Zustand Stores

**`sessionStore`** — primary session state

```typescript
{
  sessionId, folderPath, recursive,
  images: PhotoEntry[],          // ordered, immutable after load
  states: Record<string, PhotoState>,  // mutated on each decision
  currentIndex: number,
  reviewStartedAt: number | null,

  loadSession(session): void,
  setPhotoState(state, newIndex): void,  // also persists to SQLite
  getStats(): SessionStats,
}
```

**`undoStore`** — in-memory undo stack

```typescript
{
  stack: UndoAction[],
  push(action): void,
  pop(): UndoAction | undefined,
  clear(): void,
}
```

Each `UndoAction` captures `{ fromIndex, toIndex, previousState, newState }`, enabling full undo of both the state change and the index navigation.

**`uiStore`** — transient UI state (not persisted)

```typescript
{
  currentScreen: 'import' | 'review' | 'dashboard',
  isZoomActive: boolean,
  isFullscreen: boolean,
}
```

### Key Design Decisions

**No router.** The app has three screens; a simple switch on `currentScreen` in `App.tsx` is sufficient and avoids URL-state complexity in a desktop context.

**Undo is in-memory only.** Undo history resets on restart. This is an intentional trade-off: persisting undo stacks across sessions would require a full event-sourcing database design. The current index and all selection states are persisted, so progress is never lost — just undo history.

**`getStats()` uses `useShallow`.** The selector returns a plain object with primitive values. Without shallow equality, Zustand's `useSyncExternalStore` would detect a new reference on every render and cause an infinite re-render loop.

---

## Image Loading

Images are loaded using Tauri's asset protocol — zero IPC overhead, no base64 encoding:

```typescript
import { convertFileSrc } from '@tauri-apps/api/core';
const url = convertFileSrc('/absolute/path/to/photo.jpg');
// → "asset://localhost/%2Fabsolute%2Fpath%2Fto%2Fphoto.jpg"
```

The `@tauri-apps/plugin-dialog` folder picker auto-adds the selected path to the asset protocol scope. The `tauri.conf.json` has `assetProtocol.scope: ["**"]` as a broad fallback.

### Thumbnail Pipeline

1. On session load, `generate_thumbnails_batch` is fired — rayon parallel, 400px thumbnails, cached to `app_data_dir/thumbnails/<sha256(path+mtime+size)>.jpg`.
2. A ±3 sliding window of on-demand `get_thumbnail` calls keeps the visible range populated.
3. A ±2 sliding window preloads full-res images into the browser cache via `new Image().src = ...`.
4. `thumbnail-ready` events from the batch job update the React cache map as thumbnails complete.
5. ReviewScreen shows `originalSrc(photo.path)` (full-res via asset protocol) as the primary src; thumbnail is a fallback for the instant-display before full-res is cached.

HEIC/HEIF files receive a 1×1 grey JPEG placeholder instead of a decode attempt (no libheif dependency).

---

## Swipe Animation

`SwipeCard.tsx` uses framer-motion motion values and `@use-gesture/react`:

- **Drag**: `useDrag` → sets `x`/`y` motion values directly (no React state → no re-renders during drag)
- **Rotation**: `useTransform(x, [-600, 600], [-30, 30])` — CSS transform derived from motion value
- **Overlays**: `useTransform(x, [20, 120], [0, 1])` for SELECT label opacity; mirrored for REJECT
- **Fly-off**: `animate(x, ±900, { type: 'tween' }).then(() => onSwipe(...))` — commits the decision after animation completes, then resets x/y to 0 for the next photo (keyed by `photo.id`)
- **Spring-back**: if drag doesn't cross the 120px threshold, spring animation returns card to center
- **Keyboard**: calls the same `decide()` function as swipe commit — unified path

Swipe is disabled when zoom is active (`disabled` prop).

---

## Export System

`export_files` Rust command:

1. Queries `photo_states` for the session filtered by requested categories
2. For each matching file: resolves destination path (with collision-safe `_1`, `_2` suffix)
3. **Copy**: `fs::copy` + `filetime::set_file_mtime` (preserves mtime)
4. **Move**: `fs::rename` (same volume, atomic) → fallback to copy+delete across volumes
5. **SHA-256 verify**: streaming hash of source and destination, compared byte-for-byte
6. Emits `export-progress` events for the frontend progress bar
7. Returns `ExportReport` with succeeded/failed/missing/duration

---

## Session Resume

When the user scans a folder that already has a session in the DB:

- If image count matches → offer **Resume** (load the existing session states + current index)
- If image count differs → offer **Start Over** (rescan, reuse the same session ID to avoid FK violations on the ON CONFLICT upsert)

The session ID is always fetched from the DB before creating a new session (`existingSessionId ?? crypto.randomUUID()`).

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Scan 5,000 images | < 30s |
| Image navigation | < 100ms (post-preload) |
| Thumbnail generation | ~50ms/image (rayon parallel) |
| Export 1,000 files (copy) | ~2–5s (I/O bound) |
| SQLite write per decision | < 5ms |

---

## Future Work

- **Full HEIC decode** via `libheif-rs` (currently placeholder only)
- **AI blur detection** — flag visibly blurry images automatically
- **Duplicate clustering** — group near-identical shots, pick the best
- **Best-shot selection** — auto-rank burst sequences
- **Windows build** — currently developed on macOS; Tauri supports Windows but untested
- **Touch/trackpad swipe** — gesture recognition for macOS trackpad force-touch
