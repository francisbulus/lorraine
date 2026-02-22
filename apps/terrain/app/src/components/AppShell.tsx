'use client';

import { useState } from 'react';
import MapPanel from './MapPanel';
import ConversationPanel from './ConversationPanel';
import MarginPanel from './MarginPanel';
import BottomBar from './BottomBar';

export type ActiveZone = 'map' | 'conversation' | 'modes' | 'calibration';

export default function AppShell() {
  const [mapOpen, setMapOpen] = useState(true);
  const [marginOpen, setMarginOpen] = useState(true);
  const [activeZone, setActiveZone] = useState<ActiveZone>('conversation');
  const [sessionStart] = useState(() => Date.now());

  function handleZoneClick(zone: ActiveZone) {
    setActiveZone(zone);
    if (zone === 'map') {
      setMapOpen((prev) => !prev);
    } else if (zone === 'calibration') {
      setMarginOpen((prev) => !prev);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title font-system">terrain</span>
        <SessionDuration startTime={sessionStart} />
      </header>

      <div className="app-panels">
        <MapPanel open={mapOpen} />
        <ConversationPanel />
        <MarginPanel open={marginOpen} />
      </div>

      <BottomBar activeZone={activeZone} onZoneClick={handleZoneClick} />
    </div>
  );
}

function SessionDuration({ startTime }: { startTime: number }) {
  const [, setTick] = useState(0);

  // Update every minute
  if (typeof window !== 'undefined') {
    setTimeout(() => setTick((t) => t + 1), 60_000);
  }

  const elapsed = Math.floor((Date.now() - startTime) / 60_000);
  const display = elapsed < 1 ? '<1 min' : `${elapsed} min`;

  return (
    <span className="session-duration font-data">
      {display}
    </span>
  );
}
