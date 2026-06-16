import type { SessionStats } from '../../types/session';

interface StatsBarProps {
  stats: SessionStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="stats-bar">
      <div className="stats-item stats-selected">
        <span className="stats-value">{stats.selected}</span>
        <span className="stats-label">Selected</span>
      </div>
      <div className="stats-item stats-rejected">
        <span className="stats-value">{stats.rejected}</span>
        <span className="stats-label">Rejected</span>
      </div>
      <div className="stats-item stats-favorite">
        <span className="stats-value">{stats.favorites}</span>
        <span className="stats-label">Favorites</span>
      </div>
      <div className="stats-item stats-skipped">
        <span className="stats-value">{stats.skipped}</span>
        <span className="stats-label">Skipped</span>
      </div>
      <div className="stats-item">
        <span className="stats-value">{stats.pending}</span>
        <span className="stats-label">Remaining</span>
      </div>
    </div>
  );
}
