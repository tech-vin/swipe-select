import { create } from 'zustand';
import type { PhotoEntry, PhotoState } from '../types/image';
import type { SessionFile, SessionStats } from '../types/session';
import { updatePhotoState as persistPhotoState } from '../lib/tauriApi';

interface SessionStore {
  sessionId: string | null;
  folderPath: string | null;
  recursive: boolean;
  images: PhotoEntry[];
  states: Record<string, PhotoState>;
  currentIndex: number;
  reviewStartedAt: number | null;

  loadSession: (session: SessionFile) => void;
  setPhotoState: (photoState: PhotoState, newIndex: number) => void;
  goToIndex: (index: number) => void;
  getStats: () => SessionStats;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: null,
  folderPath: null,
  recursive: false,
  images: [],
  states: {},
  currentIndex: 0,
  reviewStartedAt: null,

  loadSession: (session) =>
    set({
      sessionId: session.id,
      folderPath: session.folderPath,
      recursive: session.recursive,
      images: session.images,
      states: session.states,
      currentIndex: session.currentIndex,
      reviewStartedAt: Date.now(),
    }),

  setPhotoState: (photoState, newIndex) => {
    set((s) => ({
      states: { ...s.states, [photoState.photoId]: photoState },
      currentIndex: newIndex,
    }));

    const { sessionId } = get();
    if (sessionId) {
      void persistPhotoState(sessionId, photoState, newIndex).catch((err) => {
        console.error('Failed to persist photo state', err);
      });
    }
  },

  goToIndex: (index) => set({ currentIndex: index }),

  getStats: () => {
    const { images, states, reviewStartedAt } = get();
    const total = images.length;
    let selected = 0;
    let rejected = 0;
    let skipped = 0;
    let favorites = 0;
    const decidedTimes: number[] = [];

    for (const img of images) {
      const st = states[img.id];
      if (!st) continue;
      if (st.selectionState === 'selected') selected++;
      else if (st.selectionState === 'rejected') rejected++;
      else if (st.selectionState === 'skipped') skipped++;
      if (st.isFavorite) favorites++;
      if (st.decidedAt !== null) decidedTimes.push(st.decidedAt);
    }

    const decided = selected + rejected + skipped;
    const pending = total - decided;
    const completionPercent = total > 0 ? (decided / total) * 100 : 0;

    let avgSecondsPerPhoto: number | null = null;
    let estimatedSecondsRemaining: number | null = null;

    if (decided > 0 && reviewStartedAt !== null) {
      const elapsed = (Date.now() - reviewStartedAt) / 1000;
      avgSecondsPerPhoto = elapsed / decided;
      estimatedSecondsRemaining = pending > 0 ? avgSecondsPerPhoto * pending : 0;
    }

    return {
      total,
      selected,
      rejected,
      skipped,
      favorites,
      pending,
      completionPercent,
      avgSecondsPerPhoto,
      estimatedSecondsRemaining,
    };
  },
}));
