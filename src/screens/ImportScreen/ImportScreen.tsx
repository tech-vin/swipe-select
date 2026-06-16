import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useSessionStore } from '../../store/sessionStore';
import { useUIStore } from '../../store/uiStore';
import { createSession, loadSession, scanFolder } from '../../lib/tauriApi';
import type { PhotoState } from '../../types/image';
import type { ScanResult, SessionFile } from '../../types/session';
import './ImportScreen.css';

export function ImportScreen() {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [recursive, setRecursive] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [resumableSession, setResumableSession] = useState<SessionFile | null>(null);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSessionIntoStore = useSessionStore((s) => s.loadSession);
  const setScreen = useUIStore((s) => s.setScreen);

  const handleChooseFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === 'string') {
      setFolderPath(selected);
      setScanResult(null);
      setResumableSession(null);
      setExistingSessionId(null);
      setError(null);
    }
  };

  const handleScan = async () => {
    if (!folderPath) return;
    setScanning(true);
    setScannedCount(0);
    setError(null);

    const unlisten = await listen<{ scanned: number }>('scan-progress', (event) => {
      setScannedCount(event.payload.scanned);
    });

    try {
      const result = await scanFolder(folderPath, recursive);
      setScanResult(result);

      const existing = await loadSession(folderPath);
      if (existing) {
        setExistingSessionId(existing.id);
        setResumableSession(existing.images.length === result.images.length ? existing : null);
      } else {
        setExistingSessionId(null);
        setResumableSession(null);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      unlisten();
      setScanning(false);
    }
  };

  const handleStartFresh = async () => {
    if (!folderPath || !scanResult) return;
    setError(null);

    const now = Date.now();
    const states: Record<string, PhotoState> = {};
    for (const img of scanResult.images) {
      states[img.id] = {
        photoId: img.id,
        selectionState: 'pending',
        isFavorite: false,
        decidedAt: null,
      };
    }

    const session: SessionFile = {
      id: existingSessionId ?? crypto.randomUUID(),
      folderPath,
      recursive,
      createdAt: now,
      updatedAt: now,
      currentIndex: 0,
      images: scanResult.images,
      states,
    };

    try {
      await createSession(session);
      loadSessionIntoStore(session);
      setScreen('review');
    } catch (err) {
      setError(String(err));
    }
  };

  const handleResume = () => {
    if (!resumableSession) return;
    loadSessionIntoStore(resumableSession);
    setScreen('review');
  };

  return (
    <div className="import-screen">
      <h1 className="import-title">Photo Swipe Selector</h1>
      <p className="import-subtitle">Pick a folder of photos to start reviewing.</p>

      <div className="import-card">
        <button className="import-btn import-btn-primary" onClick={handleChooseFolder}>
          Choose Folder
        </button>

        {folderPath && <div className="import-folder-path">{folderPath}</div>}

        <label className="import-checkbox">
          <input
            type="checkbox"
            checked={recursive}
            onChange={(e) => setRecursive(e.target.checked)}
          />
          Include subfolders
        </label>

        <button
          className="import-btn import-btn-primary"
          onClick={handleScan}
          disabled={!folderPath || scanning}
        >
          {scanning ? `Scanning... (${scannedCount})` : 'Scan Folder'}
        </button>

        {error && <div className="import-error">{error}</div>}

        {scanResult && (
          <div className="import-result">
            <div className="import-count">{scanResult.total} photos found</div>
            <div className="import-elapsed">Scanned in {scanResult.elapsedMs} ms</div>

            {resumableSession && (
              <div className="import-resume">
                <div className="import-resume-text">
                  A previous session for this folder was found at photo{' '}
                  {Math.min(resumableSession.currentIndex + 1, resumableSession.images.length)} of{' '}
                  {resumableSession.images.length}.
                </div>
                <button className="import-btn import-btn-primary" onClick={handleResume}>
                  Resume Session
                </button>
              </div>
            )}

            <button className="import-btn" onClick={handleStartFresh}>
              {resumableSession ? 'Start Over' : 'Start Review'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
