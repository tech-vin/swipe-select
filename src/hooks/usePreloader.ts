import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { PhotoEntry } from '../types/image';
import { getThumbnail, generateThumbnailsBatch } from '../lib/tauriApi';
import { convertFileSrc } from '@tauri-apps/api/core';

const THUMB_WINDOW = 3;
const FULLRES_WINDOW = 2;

interface ThumbnailReadyPayload {
  photoId: string;
  thumbPath: string;
}

export type ThumbnailCache = Record<string, string>; // photoId → asset URL

interface UsePreloaderResult {
  thumbCache: React.MutableRefObject<ThumbnailCache>;
}

export function usePreloader(
  images: PhotoEntry[],
  currentIndex: number,
  onThumbReady: (photoId: string, url: string) => void,
): UsePreloaderResult {
  const thumbCache = useRef<ThumbnailCache>({});
  const inflight = useRef<Set<string>>(new Set());
  const fullresCache = useRef<Set<string>>(new Set());

  // Kick off batch generation for the whole session on mount
  useEffect(() => {
    if (images.length === 0) return;
    void generateThumbnailsBatch(images).catch(() => {});
  }, [images]);

  // Listen for batch-generated thumbnails
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<ThumbnailReadyPayload>('thumbnail-ready', (event) => {
      const { photoId, thumbPath } = event.payload;
      const url = convertFileSrc(thumbPath);
      thumbCache.current[photoId] = url;
      onThumbReady(photoId, url);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [onThumbReady]);

  // On-demand thumbnail requests for the sliding window
  useEffect(() => {
    if (images.length === 0) return;

    const start = Math.max(0, currentIndex - THUMB_WINDOW);
    const end = Math.min(images.length - 1, currentIndex + THUMB_WINDOW);

    for (let i = start; i <= end; i++) {
      const photo = images[i];
      if (!photo) continue;
      if (thumbCache.current[photo.id] || inflight.current.has(photo.id)) continue;

      inflight.current.add(photo.id);
      void getThumbnail(photo.id, photo.path, photo.modifiedAt, photo.sizeBytes)
        .then((absPath) => {
          const url = convertFileSrc(absPath);
          thumbCache.current[photo.id] = url;
          onThumbReady(photo.id, url);
        })
        .catch(() => {})
        .finally(() => inflight.current.delete(photo.id));
    }
  }, [images, currentIndex, onThumbReady]);

  // Preload full-res images into browser cache
  useEffect(() => {
    if (images.length === 0) return;

    const start = Math.max(0, currentIndex - FULLRES_WINDOW);
    const end = Math.min(images.length - 1, currentIndex + FULLRES_WINDOW);

    for (let i = start; i <= end; i++) {
      const photo = images[i];
      if (!photo || fullresCache.current.has(photo.id)) continue;
      fullresCache.current.add(photo.id);

      const img = new Image();
      img.src = convertFileSrc(photo.path);
    }
  }, [images, currentIndex]);

  return { thumbCache };
}
