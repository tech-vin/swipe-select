import { create } from 'zustand';

export type ZoomLevel = 1 | 2 | 4;
export type ScreenName = 'import' | 'review' | 'dashboard' | 'export';

interface UIStore {
  currentScreen: ScreenName;
  zoomLevel: ZoomLevel;
  isZoomActive: boolean;
  isFullscreen: boolean;
  setScreen: (screen: ScreenName) => void;
  setZoomLevel: (level: ZoomLevel) => void;
  toggleZoom: () => void;
  setFullscreen: (value: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentScreen: 'import',
  zoomLevel: 1,
  isZoomActive: false,
  isFullscreen: false,
  setScreen: (screen) => set({ currentScreen: screen }),
  setZoomLevel: (level) => set({ zoomLevel: level }),
  toggleZoom: () => set((s) => ({ isZoomActive: !s.isZoomActive })),
  setFullscreen: (value) => set({ isFullscreen: value }),
}));
