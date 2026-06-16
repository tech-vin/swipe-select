import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '../../store/sessionStore';
import { useUIStore } from '../../store/uiStore';
import { ExportDialog } from '../ExportDialog/ExportDialog';
import './DashboardScreen.css';

function formatETA(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function DashboardScreen() {
  const folderPath = useSessionStore((s) => s.folderPath);
  const stats = useSessionStore(useShallow((s) => s.getStats()));
  const setScreen = useUIStore((s) => s.setScreen);
  const [showExport, setShowExport] = useState(false);

  const { total, selected, rejected, favorites, skipped, pending, completionPercent,
    avgSecondsPerPhoto, estimatedSecondsRemaining } = stats;

  const isComplete = pending === 0 && total > 0;
  const hasDecided = selected + rejected + skipped > 0;

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h1 className="dash-title">Dashboard</h1>
        <div className="dash-folder">{folderPath}</div>
      </div>

      <div className="dash-progress-section">
        <div className="dash-completion">
          <span className="dash-completion-pct">{Math.round(completionPercent)}%</span>
          <span className="dash-completion-label">complete</span>
        </div>
        <div className="dash-progress-track">
          <div className="dash-progress-fill" style={{ width: `${completionPercent}%` }} />
        </div>
        <div className="dash-progress-counts">{total - pending} of {total} reviewed</div>
      </div>

      <div className="dash-tiles">
        <div className="dash-tile dash-tile-selected">
          <div className="dash-tile-value">{selected}</div>
          <div className="dash-tile-label">Selected</div>
        </div>
        <div className="dash-tile dash-tile-rejected">
          <div className="dash-tile-value">{rejected}</div>
          <div className="dash-tile-label">Rejected</div>
        </div>
        <div className="dash-tile dash-tile-favorite">
          <div className="dash-tile-value">{favorites}</div>
          <div className="dash-tile-label">Favorites</div>
        </div>
        <div className="dash-tile dash-tile-skipped">
          <div className="dash-tile-value">{skipped}</div>
          <div className="dash-tile-label">Skipped</div>
        </div>
        <div className="dash-tile dash-tile-pending">
          <div className="dash-tile-value">{pending}</div>
          <div className="dash-tile-label">Pending</div>
        </div>
      </div>

      {avgSecondsPerPhoto !== null && (
        <div className="dash-meta">
          <span>Avg: {avgSecondsPerPhoto.toFixed(1)}s / photo</span>
          {estimatedSecondsRemaining !== null && estimatedSecondsRemaining > 0 && (
            <span>ETA: {formatETA(estimatedSecondsRemaining)}</span>
          )}
        </div>
      )}

      <div className="dash-actions">
        {!isComplete && (
          <button className="dash-btn dash-btn-primary" onClick={() => setScreen('review')}>
            Continue Review
          </button>
        )}
        {hasDecided && (
          <button className="dash-btn dash-btn-export" onClick={() => setShowExport(true)}>
            Export…
          </button>
        )}
        <button className="dash-btn dash-btn-secondary" onClick={() => setScreen('import')}>
          New Session
        </button>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
