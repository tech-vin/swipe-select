import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useUndoStore } from '../store/undoStore';
import type { PhotoState, SelectionState } from '../types/image';

export function useDecisionActions() {
  const decide = useCallback((selectionState: SelectionState, cascadeFavorite = false) => {
    const session = useSessionStore.getState();
    const { images, states, currentIndex } = session;
    const photo = images[currentIndex];
    if (!photo) return;

    const previousState: PhotoState = states[photo.id] ?? {
      photoId: photo.id,
      selectionState: 'pending',
      isFavorite: false,
      decidedAt: null,
    };

    const newState: PhotoState = {
      photoId: photo.id,
      selectionState,
      isFavorite: cascadeFavorite ? true : previousState.isFavorite,
      decidedAt: Date.now(),
    };

    const fromIndex = currentIndex;
    const toIndex = Math.min(currentIndex + 1, images.length);

    session.setPhotoState(newState, toIndex);
    useUndoStore.getState().push({ fromIndex, toIndex, previousState, newState });
  }, []);

  const undo = useCallback(() => {
    const action = useUndoStore.getState().pop();
    if (!action) return;
    useSessionStore.getState().setPhotoState(action.previousState, action.fromIndex);
  }, []);

  return { decide, undo };
}
