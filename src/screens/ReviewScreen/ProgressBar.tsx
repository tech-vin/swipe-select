interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = total > 0 ? (Math.min(current, total) / total) * 100 : 0;

  return (
    <div className="progress-bar">
      <div className="progress-bar-label">
        Image {Math.min(current + 1, total)} / {total}
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
