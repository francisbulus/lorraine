'use client';

import VisualMap from './VisualMap';
import type { VisualMapConcept, VisualMapEdge } from './VisualMap';
import type { TerritoryState } from '../lib/territory-state';

export interface MapViewProps {
  concepts: VisualMapConcept[];
  edges: VisualMapEdge[];
  territories: TerritoryState[];
  activeConcept?: string | null;
  goalConcept?: string | null;
  onConceptClick?: (conceptId: string) => void;
}

export default function MapView({
  concepts,
  edges,
  territories,
  activeConcept,
  goalConcept,
  onConceptClick,
}: MapViewProps) {
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
    </div>
  );
}
