'use client';

import type { ClaimEvent } from '@engine/types';

export interface ClaimHistoryProps {
  claims: ClaimEvent[];
  calibrationGap: number | null;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function gapLabel(gap: number): string {
  if (gap > 0.1) return 'overclaiming';
  if (gap < -0.1) return 'underclaiming';
  return 'aligned';
}

export default function ClaimHistory({ claims, calibrationGap }: ClaimHistoryProps) {
  if (claims.length === 0 && calibrationGap === null) return null;

  const sorted = [...claims].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="claim-history">
      <h4 className="margin-section-title font-system">Claims</h4>

      {calibrationGap !== null && (
        <div className="claim-history__gap font-data" data-gap={gapLabel(calibrationGap)}>
          Calibration gap: {calibrationGap > 0 ? '+' : ''}{(calibrationGap * 100).toFixed(0)}%
          <span className="claim-history__gap-label"> ({gapLabel(calibrationGap)})</span>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="claim-history__list">
          {sorted.map((claim) => (
            <li key={claim.id} className="claim-history__item">
              <span className="claim-history__confidence font-data">
                {(claim.selfReportedConfidence * 100).toFixed(0)}% confident
              </span>
              <span className="claim-history__context font-voice">
                &ldquo;{claim.context}&rdquo;
              </span>
              <span className="claim-history__time font-data">
                {formatTime(claim.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
