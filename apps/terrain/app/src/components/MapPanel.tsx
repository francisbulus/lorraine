'use client';

import { useState } from 'react';
import TerritoryCard from './TerritoryCard';
import VisualMap from './VisualMap';
import type { TerritoryState, ThresholdReadiness } from '@/lib/territory-state';
import type { VisualMapConcept, VisualMapEdge } from './VisualMap';

export type MapView = 'list' | 'graph';

export interface MapPanelProps {
  open: boolean;
  territories?: TerritoryState[];
  thresholds?: Map<string, ThresholdReadiness>;
  activeTerritory?: string | null;
  onTerritoryClick?: (territoryId: string) => void;
  concepts?: VisualMapConcept[];
  edges?: VisualMapEdge[];
  activeConcept?: string | null;
  goalConcept?: string | null;
  onConceptClick?: (conceptId: string) => void;
  defaultView?: MapView;
}

export default function MapPanel({
  open,
  territories = [],
  thresholds,
  activeTerritory = null,
  onTerritoryClick,
  concepts = [],
  edges = [],
  activeConcept = null,
  goalConcept = null,
  onConceptClick,
  defaultView = 'list',
}: MapPanelProps) {
  const [view, setView] = useState<MapView>(defaultView);

  return (
    <aside
      className={`map-panel ${open ? 'map-panel--open' : 'map-panel--closed'}`}
      aria-label="Map"
    >
      <div className="map-panel__content">
        {/* View toggle */}
        <div className="map-panel__toggle">
          <button
            className={`map-panel__toggle-btn font-system ${view === 'list' ? 'map-panel__toggle-btn--active' : ''}`}
            onClick={() => setView('list')}
          >
            list
          </button>
          <button
            className={`map-panel__toggle-btn font-system ${view === 'graph' ? 'map-panel__toggle-btn--active' : ''}`}
            onClick={() => setView('graph')}
          >
            graph
          </button>
        </div>

        {view === 'list' ? (
          territories.length === 0 ? (
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
          )
        ) : (
          <div className="map-panel__graph">
            <VisualMap
              concepts={concepts}
              edges={edges}
              activeConcept={activeConcept}
              goalConcept={goalConcept}
              onConceptClick={onConceptClick}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
