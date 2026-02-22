'use client';

import type { ActiveZone } from './AppShell';

const ZONES: { id: ActiveZone; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'modes', label: 'Modes' },
  { id: 'calibration', label: 'Calibration' },
];

export interface BottomBarProps {
  activeZone: ActiveZone;
  onZoneClick: (zone: ActiveZone) => void;
}

export default function BottomBar({ activeZone, onZoneClick }: BottomBarProps) {
  return (
    <nav className="bottom-bar font-system" aria-label="Zone navigation">
      {ZONES.map((zone) => (
        <button
          key={zone.id}
          className={`bottom-bar__zone ${activeZone === zone.id ? 'bottom-bar__zone--active' : ''}`}
          onClick={() => onZoneClick(zone.id)}
          aria-current={activeZone === zone.id ? 'true' : undefined}
        >
          {zone.label}
        </button>
      ))}
    </nav>
  );
}
