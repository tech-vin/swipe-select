import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '../../store/sessionStore';
import { useUIStore } from '../../store/uiStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useDecisionActions } from '../../hooks/useDecisionActions';
import { usePreloader } from '../../hooks/usePreloader';
import { originalSrc } from '../../lib/imagePath';
import { ProgressBar } from './ProgressBar';
import { StatsBar } from './StatsBar';
import { SwipeCard } from './SwipeCard';
import { ZoomViewer } from './ZoomViewer';
import './ReviewScreen.css';

export function ReviewScreen() {
  useKeyboardShortcuts();
  const { decide } = useDecisionActions();

  const images = useSessionStore((s) => s.images);
  const states = useSessionStore((s) => s.states);
  const currentIndex = useSessionStore((s) => s.currentIndex);
  const stats = useSessionStore(useShallow((s) => s.getStats()));
  const setScreen = useUIStore((s) => s.setScreen);
  const isZoomActive = useUIStore((s) => s.isZoomActive);
  const toggleZoom = useUIStore((s) => s.toggleZoom);

  // thumbUrls: photoId → asset URL (updated as thumbnails are ready)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const onThumbReady = useCallback((photoId: string, url: string) => {
    setThumbUrls((prev) => ({ ...prev, [photoId]: url }));
  }, []);

  usePreloader(images, currentIndex, onThumbReady);

  const photo = images[currentIndex];
  const photoState = photo ? states[photo.id] : undefined;
  const isComplete = images.length > 0 && currentIndex >= images.length;

  if (isComplete) {
    return (
      <div className="review-screen review-complete">
        <h2>Review complete!</h2>
        <StatsBar stats={stats} />
        <button className="review-btn" onClick={() => setScreen('import')}>
          Back to Import
        </button>
      </div>
    );
  }

  // Thumbnail-first: show thumb while full-res loads, then swap
  const thumbUrl = photo ? thumbUrls[photo.id] : undefined;
  const fullResSrc = photo ? originalSrc(photo.path) : '';

  return (
    <div className="review-screen">
      <div className="review-header">
        <ProgressBar current={currentIndex} total={images.length} />
        <StatsBar stats={stats} />
        <button className="review-dash-btn" onClick={() => setScreen('dashboard')} title="Dashboard">
          ⊞
        </button>
      </div>

      <div className="review-image-wrap">
        {photo && (
          <SwipeCard key={photo.id} onSwipe={decide} disabled={isZoomActive}>
            <ZoomViewer
              src={fullResSrc || thumbUrl || ''}
              alt={photo.fileName}
              active={isZoomActive}
              onToggle={toggleZoom}
            />

            {photoState && photoState.selectionState !== 'pending' && (
              <div className={`review-badge review-badge-${photoState.selectionState}`}>
                {photoState.selectionState.toUpperCase()}
              </div>
            )}

            {photoState?.isFavorite && <div className="review-favorite-badge">★ Favorite</div>}
          </SwipeCard>
        )}
      </div>

      <div className="review-footer">
        <div className="review-filename">{photo?.fileName}</div>
        <div className="review-shortcuts">
          <span>← Reject</span>
          <span>→ Select</span>
          <span>↑ Favorite</span>
          <span>↓ Skip</span>
          <span>Z Undo</span>
          <span>Space Zoom</span>
          <span>F Fullscreen</span>
        </div>
      </div>
    </div>
  );
}
