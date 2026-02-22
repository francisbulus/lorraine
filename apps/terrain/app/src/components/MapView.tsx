'use client';

import VisualMap from './VisualMap';
import TerritoryCard from './TerritoryCard';
import type { VisualMapConcept, VisualMapEdge } from './VisualMap';
import type { TerritoryState } from '../lib/territory-state';

export interface MapViewProps {
  concepts: VisualMapConcept[];
  edges: VisualMapEdge[];
  territories: TerritoryState[];
  activeConcept?: string | null;
  goalConcept?: string | null;
  onConceptClick?: (conceptId: string) => void;
  onTerritoryClick?: (territoryId: string) => void;
}

export default function MapView({
  concepts,
  edges,
  territories,
  activeConcept,
  goalConcept,
  onConceptClick,
  onTerritoryClick,
}: MapViewProps) {
  const activeTerritoryName = activeConcept
    ? territories.find((t) =>
        t.territory.conceptIds.includes(activeConcept)
      )?.territory.name ?? null
    : null;

  const territoryGroups = territories.map((t) => t.territory);

  return (
    <div className="map-view">
      <div className="map-view__graph">
        <VisualMap
          concepts={concepts}
          edges={edges}
          territories={territoryGroups}
          activeConcept={activeConcept}
          goalConcept={goalConcept}
          onConceptClick={onConceptClick}
        />
      </div>
      {territories.length > 0 && (
        <div className="map-view__territories">
          {territories.map((t) => (
            <TerritoryCard
              key={t.territory.name}
              state={t}
              active={t.territory.name === activeTerritoryName}
              onClick={() => onTerritoryClick?.(t.territory.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
