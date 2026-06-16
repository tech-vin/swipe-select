export type SelectionState = 'pending' | 'selected' | 'rejected' | 'skipped';

export interface PhotoEntry {
  id: string;
  path: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: number;
  sortIndex: number;
}

export interface PhotoState {
  photoId: string;
  selectionState: SelectionState;
  isFavorite: boolean;
  decidedAt: number | null;
}
