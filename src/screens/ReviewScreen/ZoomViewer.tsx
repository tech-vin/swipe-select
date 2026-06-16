import { useState, useCallback, useEffect } from 'react';
import { useWheel, useDrag } from '@use-gesture/react';
import './ZoomViewer.css';

const ZOOM_LEVELS = [1, 2, 4] as const;

interface ZoomViewerProps {
  src: string;
  alt: string;
  active: boolean;
  onToggle: () => void;
}

export function ZoomViewer({ src, alt, active, onToggle }: ZoomViewerProps) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const scale = ZOOM_LEVELS[zoomIndex];

  const resetPan = useCallback(() => setPan({ x: 0, y: 0 }), []);

  // Reset zoom/pan when zoom mode is deactivated (Space key)
  useEffect(() => {
    if (!active) {
      setZoomIndex(0);
      setPan({ x: 0, y: 0 });
    }
  }, [active]);

  const cycleZoom = useCallback(() => {
    setZoomIndex((i) => {
      const next = (i + 1) % ZOOM_LEVELS.length;
      if (next === 0) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (!active) {
      onToggle();
    } else {
      cycleZoom();
    }
  }, [active, onToggle, cycleZoom]);

  const wheelBind = useWheel(({ delta: [, dy] }) => {
    if (!active) return;
    setZoomIndex((i) => {
      const next = dy > 0 ? Math.max(0, i - 1) : Math.min(ZOOM_LEVELS.length - 1, i + 1);
      if (next === 0) resetPan();
      return next;
    });
  });

  const dragBind = useDrag(
    ({ delta: [dx, dy] }) => {
      if (!active || scale === 1) return;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    },
    { filterTaps: true },
  );

  const style: React.CSSProperties = {
    transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
    transformOrigin: 'center center',
    cursor: scale > 1 ? 'move' : active ? 'zoom-in' : 'default',
    touchAction: 'none',
  };

  return (
    <div
      className={`zoom-viewer ${active ? 'zoom-active' : ''}`}
      onDoubleClick={handleDoubleClick}
      {...(wheelBind() as object)}
      {...(dragBind() as object)}
    >
      <img src={src} alt={alt} className="zoom-image" style={style} draggable={false} />
    </div>
  );
}
