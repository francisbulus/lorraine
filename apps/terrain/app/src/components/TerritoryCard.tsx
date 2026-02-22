'use client';

import TrustGlyph from './TrustGlyph';
import ProgressBar from './ProgressBar';
import type { TerritoryState, ThresholdReadiness } from '@/lib/territory-state';

export interface TerritoryCardProps {
  state: TerritoryState;
  active?: boolean;
  threshold?: ThresholdReadiness;
  onClick?: () => void;
}

export default function TerritoryCard({
  state,
  active = false,
  threshold,
  onClick,
}: TerritoryCardProps) {
  const {
    territory,
    verifiedCount,
    inferredCount,
    contestedCount,
    untestedCount,
    progressPercent,
    contestedConcepts,
  } = state;

  return (
    <div
      className={`territory-card ${active ? 'territory-card--active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      aria-label={`${territory.name} territory`}
    >
      <h3 className="territory-card__name font-voice">{territory.name}</h3>

      <ProgressBar percent={progressPercent} />

      <div className="territory-card__breakdown font-data">
        {verifiedCount > 0 && (
          <span className="territory-card__stat">
            <TrustGlyph level="verified" /> {verifiedCount} verified
          </span>
        )}
        {inferredCount > 0 && (
          <span className="territory-card__stat">
            <TrustGlyph level="inferred" /> {inferredCount} inferred
          </span>
        )}
        {contestedCount > 0 && (
          <span className="territory-card__stat">
            <TrustGlyph level="contested" /> {contestedCount} contested
          </span>
        )}
        {untestedCount > 0 && (
          <span className="territory-card__stat">
            <TrustGlyph level="untested" /> {untestedCount} untested
          </span>
        )}
      </div>

      {contestedConcepts.length > 0 && (
        <div className="territory-card__contested font-data">
          Contested: {contestedConcepts.join(', ')}
        </div>
      )}

      {threshold && !threshold.isReady && (
        <div className="territory-card__threshold font-data">
          <span className="territory-card__threshold-label">
            → Threshold: {threshold.threshold.to}
          </span>
          <span className="territory-card__threshold-progress">
            Ready: {threshold.ready.length}/{threshold.totalRequired} concepts
            {threshold.missing.length > 0 && (
              <> (missing: {threshold.missing.join(', ')})</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
