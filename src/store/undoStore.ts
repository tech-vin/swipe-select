import { create } from 'zustand';
import type { PhotoState } from '../types/image';

export interface UndoAction {
  fromIndex: number;
  toIndex: number;
  previousState: PhotoState;
  newState: PhotoState;
}

interface UndoStore {
  stack: UndoAction[];
  push: (action: UndoAction) => void;
  pop: () => UndoAction | undefined;
  clear: () => void;
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  stack: [],

  push: (action) => set((s) => ({ stack: [...s.stack, action] })),

  pop: () => {
    const { stack } = get();
    if (stack.length === 0) return undefined;
    const last = stack[stack.length - 1];
    set({ stack: stack.slice(0, -1) });
    return last;
  },

  clear: () => set({ stack: [] }),
}));
