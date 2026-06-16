import { invoke } from '@tauri-apps/api/core';
import type { PhotoEntry, PhotoState } from '../types/image';
import type { ScanResult, SessionFile } from '../types/session';
import type { ExportRequest, ExportReport } from '../types/export';

export function scanFolder(folderPath: string, recursive: boolean): Promise<ScanResult> {
  return invoke('scan_folder', { folderPath, recursive });
}

export function createSession(session: SessionFile): Promise<void> {
  return invoke('create_session', { session });
}

export function loadSession(folderPath: string): Promise<SessionFile | null> {
  return invoke('load_session', { folderPath });
}

export function updatePhotoState(
  sessionId: string,
  photoState: PhotoState,
  currentIndex: number,
): Promise<void> {
  return invoke('update_photo_state', { sessionId, photoState, currentIndex });
}

export function updateCurrentIndex(sessionId: string, currentIndex: number): Promise<void> {
  return invoke('update_current_index', { sessionId, currentIndex });
}

export function getThumbnail(
  photoId: string,
  path: string,
  mtime: number,
  sizeBytes: number,
): Promise<string> {
  return invoke('get_thumbnail', { photoId, path, mtime, sizeBytes });
}

export function generateThumbnailsBatch(photos: PhotoEntry[]): Promise<void> {
  return invoke('generate_thumbnails_batch', { photos });
}

export function exportFiles(request: ExportRequest): Promise<ExportReport> {
  return invoke('export_files', { request });
}
