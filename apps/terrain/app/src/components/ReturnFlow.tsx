'use client';

import type { DecayResult } from '@engine/types';
import type { SessionSummary } from '@/lib/session';

export interface ReturnFlowProps {
  lastSession: SessionSummary;
  decayResults: DecayResult[];
  onResume: () => void;
  onNewSession: () => void;
}

function formatDaysSince(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'earlier today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function ReturnFlow({
  lastSession,
  decayResults,
  onResume,
  onNewSession,
}: ReturnFlowProps) {
  const significantDecay = decayResults.filter(
    (d) => d.previousConfidence - d.decayedConfidence > 0.05
  );

  return (
    <div className="return-flow">
      <div className="return-flow__orientation font-voice">
        <p>
          You were last here {formatDaysSince(lastSession.lastActiveAt)}.
          You touched {lastSession.conceptsTouched} concept{lastSession.conceptsTouched !== 1 ? 's' : ''}.
        </p>

        {significantDecay.length > 0 && (
          <p className="return-flow__decay">
            {significantDecay.length === 1
              ? `It's been a while since you worked with ${significantDecay[0].conceptId} directly. The foundation is probably still solid, but it's your call whether to check.`
              : `Some concepts have gone untouched for a while — ${significantDecay.map((d) => d.conceptId).join(', ')}. The foundations are probably still there, but you might want to check.`}
          </p>
        )}

        {significantDecay.length === 0 && (
          <p className="return-flow__no-decay">
            Your terrain looks stable. Nothing has drifted much since last time.
          </p>
        )}
      </div>

      {significantDecay.length > 0 && (
        <div className="return-flow__decay-list font-data">
          {significantDecay.map((d) => (
            <div key={d.conceptId} className="return-flow__decay-item">
              {d.conceptId}: {(d.previousConfidence * 100).toFixed(0)}% → {(d.decayedConfidence * 100).toFixed(0)}%
              <span className="return-flow__days">
                ({Math.round(d.daysSinceVerified)}d since verified)
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="return-flow__actions">
        <button
          className="return-flow__resume font-system"
          onClick={onResume}
        >
          pick up where I left off
        </button>
        <button
          className="return-flow__new font-system"
          onClick={onNewSession}
        >
          start fresh
        </button>
      </div>
    </div>
  );
}
