'use client';

import { useState } from 'react';

export type AppState = 'conversation' | 'map';

export interface TopBarProps {
  appState: AppState;
  onToggleState: () => void;
  onCalibrationClick: () => void;
  sessionStart: number;
  hasCalibrationData?: boolean;
}

export default function TopBar({
  appState,
  onToggleState,
  onCalibrationClick,
  sessionStart,
  hasCalibrationData = false,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <span className="top-bar__title font-system">terrain</span>

      <div className="top-bar__actions">
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

        <button
          className="top-bar__toggle font-system"
          onClick={onToggleState}
          aria-label={appState === 'conversation' ? 'Switch to map' : 'Switch to conversation'}
        >
          {appState === 'conversation' ? 'map' : '← conversation'}
        </button>
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
