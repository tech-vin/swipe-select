import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useDecisionActions } from './useDecisionActions';
import { useUIStore } from '../store/uiStore';

export function useKeyboardShortcuts() {
  const { decide, undo } = useDecisionActions();
  const toggleZoom = useUIStore((s) => s.toggleZoom);
  const isFullscreen = useUIStore((s) => s.isFullscreen);
  const setFullscreen = useUIStore((s) => s.setFullscreen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          decide('selected');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          decide('rejected');
          break;
        case 'ArrowDown':
          e.preventDefault();
          decide('skipped');
          break;
        case 'ArrowUp':
          e.preventDefault();
          decide('selected', true);
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          undo();
          break;
        case ' ':
          e.preventDefault();
          toggleZoom();
          break;
        case 'f':
        case 'F': {
          e.preventDefault();
          const next = !isFullscreen;
          void getCurrentWindow()
            .setFullscreen(next)
            .then(() => setFullscreen(next));
          break;
        }
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            void getCurrentWindow()
              .setFullscreen(false)
              .then(() => setFullscreen(false));
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [decide, undo, toggleZoom, isFullscreen, setFullscreen]);
}
