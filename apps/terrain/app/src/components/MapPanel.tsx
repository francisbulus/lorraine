'use client';

import TerritoryCard from './TerritoryCard';
import type { TerritoryState, ThresholdReadiness } from '@/lib/territory-state';

export interface MapPanelProps {
  open: boolean;
  territories?: TerritoryState[];
  thresholds?: Map<string, ThresholdReadiness>;
  activeTerritory?: string | null;
  onTerritoryClick?: (territoryId: string) => void;
}

export default function MapPanel({
  open,
  territories = [],
  thresholds,
  activeTerritory = null,
  onTerritoryClick,
}: MapPanelProps) {
  return (
    <aside
      className={`map-panel ${open ? 'map-panel--open' : 'map-panel--closed'}`}
      aria-label="Map"
    >
      <div className="map-panel__content">
        {territories.length === 0 ? (
          <p className="map-panel__empty font-data">
            No terrain yet.
          </p>
        ) : (
          territories.map((state) => (
            <TerritoryCard
              key={state.territory.id}
              state={state}
              active={state.territory.id === activeTerritory}
              threshold={thresholds?.get(state.territory.id)}
              onClick={() => onTerritoryClick?.(state.territory.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
