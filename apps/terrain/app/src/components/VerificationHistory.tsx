'use client';

import type { VerificationEvent } from '@engine/types';

export interface VerificationHistoryProps {
  events: VerificationEvent[];
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

function resultLabel(result: string): string {
  switch (result) {
    case 'demonstrated': return 'demonstrated';
    case 'failed': return 'failed';
    case 'partial': return 'partial';
    default: return result;
  }
}

export default function VerificationHistory({ events }: VerificationHistoryProps) {
  if (events.length === 0) return null;

  // Show most recent first.
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="verification-history">
      <h4 className="margin-section-title font-system">Verification History</h4>
      <ul className="verification-history__list">
        {sorted.map((event) => (
          <li key={event.id} className="verification-history__item">
            <span className="verification-history__result font-data" data-result={event.result}>
              {resultLabel(event.result)}
            </span>
            <span className="verification-history__modality font-data">
              {event.modality}
            </span>
            <span className="verification-history__time font-data">
              {formatTime(event.timestamp)}
            </span>
            {event.context && (
              <span className="verification-history__context font-voice">
                {event.context}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
