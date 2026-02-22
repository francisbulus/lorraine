'use client';

import { useState } from 'react';

export interface TopBarProps {
  onCalibrationClick: () => void;
  sessionStart: number;
  hasCalibrationData?: boolean;
  focusedConcept?: string | null;
}

export default function TopBar({
  onCalibrationClick,
  sessionStart,
  hasCalibrationData = false,
  focusedConcept,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <span className="top-bar__title font-system">terrain</span>

      <div className="top-bar__actions">
        {focusedConcept && (
          <span className="top-bar__focus font-data">{focusedConcept}</span>
        )}

        {hasCalibrationData && (
          <button
            className="top-bar__calibration font-system"
            onClick={onCalibrationClick}
            title="Your calibration"
            aria-label="Open calibration"
          >
            &#x2298;
          </button>
        )}

        <SessionDuration startTime={sessionStart} />
      </div>
    </header>
  );
}

function SessionDuration({ startTime }: { startTime: number }) {
  const [, setTick] = useState(0);

  if (typeof window !== 'undefined') {
    setTimeout(() => setTick((t) => t + 1), 60_000);
  }

  const elapsed = Math.floor((Date.now() - startTime) / 60_000);
  const display = elapsed < 1 ? '<1 min' : `${elapsed} min`;

  return (
    <span className="top-bar__timer font-data">{display}</span>
  );
}
