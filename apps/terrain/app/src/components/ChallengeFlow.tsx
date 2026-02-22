'use client';

import type { TrustState } from '@engine/types';
import TrustGlyph from './TrustGlyph';

export interface ChallengeFlowProps {
  conceptId: string;
  conceptName: string;
  trustState: TrustState;
  onChallenge: (conceptId: string) => void;
}

export default function ChallengeFlow({
  conceptId,
  conceptName,
  trustState,
  onChallenge,
}: ChallengeFlowProps) {
  const { level, decayedConfidence, verificationHistory, inferredFrom } = trustState;

  return (
    <div className="challenge-flow">
      <div className="challenge-flow__header">
        <TrustGlyph level={level} />
        <span className="challenge-flow__name font-voice">{conceptName}</span>
        <span className="challenge-flow__confidence font-data">
          {(decayedConfidence * 100).toFixed(0)}%
        </span>
      </div>

      <div className="challenge-flow__basis font-data">
        {level === 'inferred' && inferredFrom.length > 0 && (
          <p className="challenge-flow__inferred">
            Inferred from: {inferredFrom.join(', ')}
          </p>
        )}
        {verificationHistory.length > 0 && (
          <p className="challenge-flow__history">
            {verificationHistory.length} verification event{verificationHistory.length !== 1 ? 's' : ''}
          </p>
        )}
        {verificationHistory.length === 0 && level === 'untested' && (
          <p className="challenge-flow__no-evidence">No evidence yet.</p>
        )}
      </div>

      <button
        className="challenge-flow__button font-system"
        onClick={() => onChallenge(conceptId)}
        aria-label={`Challenge ${conceptName}`}
      >
        test me on this
      </button>
    </div>
  );
}
