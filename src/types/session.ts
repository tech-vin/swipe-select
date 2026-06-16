import type { PhotoEntry, PhotoState } from './image';

export interface SessionFile {
  id: string;
  folderPath: string;
  recursive: boolean;
  createdAt: number;
  updatedAt: number;
  currentIndex: number;
  images: PhotoEntry[];
  states: Record<string, PhotoState>;
}

export interface SessionStats {
  total: number;
  selected: number;
  rejected: number;
  favorites: number;
  skipped: number;
  pending: number;
  completionPercent: number;
  avgSecondsPerPhoto: number | null;
  estimatedSecondsRemaining: number | null;
}

export interface ScanResult {
  images: PhotoEntry[];
  total: number;
  elapsedMs: number;
}
