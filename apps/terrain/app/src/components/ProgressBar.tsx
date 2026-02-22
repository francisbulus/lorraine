'use client';

export interface ProgressBarProps {
  percent: number;
  color?: string;
}

export default function ProgressBar({
  percent,
  color = 'var(--verified)',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={clamped}>
      <div className="progress-bar__track">
        <div
          className="progress-bar__fill"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="progress-bar__label font-data">{Math.round(clamped)}%</span>
    </div>
  );
}
