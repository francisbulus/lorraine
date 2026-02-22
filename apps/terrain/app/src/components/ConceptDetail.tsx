'use client';

import type { TrustState, RelationshipEdge } from '@engine/types';
import TrustGlyph from './TrustGlyph';
import VerificationHistory from './VerificationHistory';
import ClaimHistory from './ClaimHistory';
import type { GlyphLevel } from './TrustGlyph';

export interface RelatedConcept {
  id: string;
  name: string;
  level: GlyphLevel;
  edgeType: string;
}

export interface ConceptDetailProps {
  conceptName: string;
  trustState: TrustState;
  relatedConcepts?: RelatedConcept[];
  reasoning?: string;
}

function formatTime(timestamp: number | null): string {
  if (!timestamp) return 'never';
  const d = new Date(timestamp);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConceptDetail({
  conceptName,
  trustState,
  relatedConcepts = [],
  reasoning,
}: ConceptDetailProps) {
  const { level, decayedConfidence, modalitiesTested, lastVerified } = trustState;

  return (
    <div className="concept-detail">
      <div className="concept-detail__header">
        <h3 className="concept-detail__name font-voice">{conceptName}</h3>
        <div className="concept-detail__trust font-data">
          <TrustGlyph level={level} />
          <span className="concept-detail__level">{level}</span>
          <span className="concept-detail__confidence">
            {(decayedConfidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="concept-detail__meta font-data">
        <div className="concept-detail__modalities">
          Modalities: {modalitiesTested.length > 0 ? modalitiesTested.join(', ') : 'none'}
        </div>
        <div className="concept-detail__last-verified">
          Last verified: {formatTime(lastVerified)}
        </div>
      </div>

      {relatedConcepts.length > 0 && (
        <div className="concept-detail__related">
          <h4 className="margin-section-title font-system">Related</h4>
          <ul className="concept-detail__related-list">
            {relatedConcepts.map((rc) => (
              <li key={rc.id} className="concept-detail__related-item font-data">
                <TrustGlyph level={rc.level} /> {rc.name}
                <span className="concept-detail__edge-type">({rc.edgeType})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <VerificationHistory events={trustState.verificationHistory} />

      <ClaimHistory
        claims={trustState.claimHistory}
        calibrationGap={trustState.calibrationGap}
      />

      {reasoning && (
        <div className="concept-detail__reasoning">
          <h4 className="margin-section-title font-system">Reasoning</h4>
          <p className="concept-detail__reasoning-text font-voice">{reasoning}</p>
        </div>
      )}
    </div>
  );
}
