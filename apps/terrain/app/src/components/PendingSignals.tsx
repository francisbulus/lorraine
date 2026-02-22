'use client';

import type { PendingSignal } from '@/lib/quiet-mode';
import TrustGlyph from './TrustGlyph';

export interface PendingSignalsProps {
  signals: PendingSignal[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function PendingSignals({
  signals,
  onAccept,
  onDismiss,
}: PendingSignalsProps) {
  if (signals.length === 0) return null;

  return (
    <div className="pending-signals">
      <h4 className="margin-section-title font-system">Pending Signals</h4>
      <ul className="pending-signals__list">
        {signals.map((ps) => (
          <li key={ps.id} className="pending-signals__item">
            <div className="pending-signals__info">
              <span className="pending-signals__concept font-data">
                {ps.signal.conceptId}
              </span>
              <span className="pending-signals__type font-data">
                {ps.signal.signalType}
              </span>
              <span className="pending-signals__evidence font-voice">
                {ps.signal.evidence}
              </span>
            </div>
            <div className="pending-signals__actions">
              <button
                className="pending-signals__accept font-system"
                onClick={() => onAccept(ps.id)}
                aria-label={`Accept signal for ${ps.signal.conceptId}`}
              >
                accept
              </button>
              <button
                className="pending-signals__dismiss font-system"
                onClick={() => onDismiss(ps.id)}
                aria-label={`Dismiss signal for ${ps.signal.conceptId}`}
              >
                dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
