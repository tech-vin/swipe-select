import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useSessionStore } from '../../store/sessionStore';
import { exportFiles } from '../../lib/tauriApi';
import type { ExportCategory, ExportReport } from '../../types/export';
import './ExportDialog.css';

interface Props {
  onClose: () => void;
}

interface ExportProgressPayload {
  done: number;
  total: number;
  currentFile: string;
}

const ALL_CATEGORIES: ExportCategory[] = ['selected', 'rejected', 'favorite', 'skipped'];
const CATEGORY_LABELS: Record<ExportCategory, string> = {
  selected: 'Selected',
  rejected: 'Rejected',
  favorite: 'Favorites',
  skipped: 'Skipped',
};

export function ExportDialog({ onClose }: Props) {
  const sessionId = useSessionStore((s) => s.sessionId);
  const stats = useSessionStore(useShallow((s) => s.getStats()));

  const [categories, setCategories] = useState<ExportCategory[]>(['selected', 'favorite']);
  const [destPath, setDestPath] = useState('');
  const [mode, setMode] = useState<'copy' | 'move'>('copy');
  const [organizeByCategory, setOrganizeByCategory] = useState(true);
  const [verifyHashes, setVerifyHashes] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; file: string } | null>(null);
  const [report, setReport] = useState<ExportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryCounts: Record<ExportCategory, number> = {
    selected: stats.selected,
    rejected: stats.rejected,
    favorite: stats.favorites,
    skipped: stats.skipped,
  };

  const toggleCategory = (cat: ExportCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const pickFolder = async () => {
    const result = await open({ directory: true, title: 'Choose export destination' });
    if (result) setDestPath(result as string);
  };

  const startExport = async () => {
    if (!sessionId || !destPath || categories.length === 0) return;
    setRunning(true);
    setError(null);
    setReport(null);

    const unlisten = await listen<ExportProgressPayload>('export-progress', (e) => {
      setProgress({ done: e.payload.done, total: e.payload.total, file: e.payload.currentFile });
    });

    try {
      const result = await exportFiles({
        sessionId,
        categories,
        destinationRoot: destPath,
        mode,
        organizeByCategory,
        verifyHashes,
      });
      setReport(result);
    } catch (e) {
      setError(String(e));
    } finally {
      unlisten();
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <div className="export-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="export-dialog">
        <div className="export-header">
          <h2>Export Photos</h2>
          <button className="export-close" onClick={onClose}>✕</button>
        </div>

        {!report ? (
          <>
            <div className="export-section">
              <div className="export-label">Export categories</div>
              <div className="export-categories">
                {ALL_CATEGORIES.map((cat) => (
                  <label key={cat} className={`export-cat-toggle ${categories.includes(cat) ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={categories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    {CATEGORY_LABELS[cat]} ({categoryCounts[cat]})
                  </label>
                ))}
              </div>
            </div>

            <div className="export-section">
              <div className="export-label">Destination folder</div>
              <div className="export-dest-row">
                <div className="export-dest-path">{destPath || 'No folder selected'}</div>
                <button className="export-pick-btn" onClick={pickFolder}>Browse…</button>
              </div>
            </div>

            <div className="export-section">
              <div className="export-label">Options</div>
              <div className="export-options">
                <label className="export-opt">
                  <input type="radio" name="mode" value="copy" checked={mode === 'copy'} onChange={() => setMode('copy')} />
                  Copy files (originals stay in place)
                </label>
                <label className="export-opt">
                  <input type="radio" name="mode" value="move" checked={mode === 'move'} onChange={() => setMode('move')} />
                  Move files (originals removed)
                </label>
                <label className="export-opt">
                  <input type="checkbox" checked={organizeByCategory} onChange={(e) => setOrganizeByCategory(e.target.checked)} />
                  Organize into category subfolders
                </label>
                <label className="export-opt">
                  <input type="checkbox" checked={verifyHashes} onChange={(e) => setVerifyHashes(e.target.checked)} />
                  Verify SHA-256 integrity after copy
                </label>
              </div>
            </div>

            {error && <div className="export-error">{error}</div>}

            {running && progress && (
              <div className="export-progress">
                <div className="export-progress-bar">
                  <div
                    className="export-progress-fill"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
                <div className="export-progress-label">
                  {progress.done} / {progress.total} — {progress.file}
                </div>
              </div>
            )}

            <div className="export-footer">
              <button className="export-btn-secondary" onClick={onClose} disabled={running}>Cancel</button>
              <button
                className="export-btn-primary"
                onClick={startExport}
                disabled={running || !destPath || categories.length === 0}
              >
                {running ? 'Exporting…' : 'Start Export'}
              </button>
            </div>
          </>
        ) : (
          <div className="export-report">
            <div className="export-report-row">
              <span>Files exported</span>
              <span className="export-report-success">{report.succeeded}</span>
            </div>
            {report.verifiedHashes > 0 && (
              <div className="export-report-row">
                <span>Hashes verified</span>
                <span className="export-report-success">{report.verifiedHashes}</span>
              </div>
            )}
            {report.failed.length > 0 && (
              <div className="export-report-row">
                <span>Failed</span>
                <span className="export-report-error">{report.failed.length}</span>
              </div>
            )}
            {report.missingSources.length > 0 && (
              <div className="export-report-row">
                <span>Missing sources</span>
                <span className="export-report-error">{report.missingSources.length}</span>
              </div>
            )}
            {report.skippedExisting.length > 0 && (
              <div className="export-report-row">
                <span>Renamed (collision)</span>
                <span>{report.skippedExisting.length}</span>
              </div>
            )}
            <div className="export-report-row">
              <span>Duration</span>
              <span>{(report.durationMs / 1000).toFixed(1)}s</span>
            </div>

            {report.failed.length > 0 && (
              <details className="export-failures">
                <summary>Failed files ({report.failed.length})</summary>
                {report.failed.map((f, i) => (
                  <div key={i} className="export-failure-item">
                    <div className="export-failure-path">{f.path}</div>
                    <div className="export-failure-reason">{f.reason}</div>
                  </div>
                ))}
              </details>
            )}

            <div className="export-footer">
              <button className="export-btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
