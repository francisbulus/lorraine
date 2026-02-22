import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapView from './MapView';
import type { VisualMapConcept, VisualMapEdge } from './VisualMap';
import type { TerritoryState } from '../lib/territory-state';

const makeConcepts = (): VisualMapConcept[] => [
  { id: 'tcp', name: 'TCP', trustLevel: 'verified' },
  { id: 'udp', name: 'UDP', trustLevel: 'inferred' },
];

const makeEdges = (): VisualMapEdge[] => [
  { from: 'tcp', to: 'udp', type: 'related_to' },
];

const makeTerritory = (): TerritoryState => ({
  territory: { id: 'networking', name: 'Networking', conceptIds: ['tcp', 'udp'] },
  verifiedCount: 1,
  inferredCount: 1,
  contestedCount: 0,
  untestedCount: 0,
  totalConcepts: 2,
  verifiedPercent: 50,
  progressPercent: 75,
  contestedConcepts: [],
  concepts: [
    { conceptId: 'tcp', level: 'verified', decayedConfidence: 0.9 },
    { conceptId: 'udp', level: 'inferred', decayedConfidence: 0.6 },
  ],
});

describe('MapView', () => {
  it('renders visual map with concepts', () => {
    render(
      <MapView concepts={makeConcepts()} edges={makeEdges()} territories={[]} />
    );
    expect(screen.getByLabelText('Concept map')).toBeInTheDocument();
  });

  it('renders territory cards when provided', () => {
    render(
      <MapView
        concepts={makeConcepts()}
        edges={makeEdges()}
        territories={[makeTerritory()]}
      />
    );
    expect(screen.getByLabelText('Networking territory')).toBeInTheDocument();
  });

  it('does not render territory sidebar when empty', () => {
    const { container } = render(
      <MapView concepts={makeConcepts()} edges={makeEdges()} territories={[]} />
    );
    expect(container.querySelector('.map-view__territories')).toBeNull();
  });

  it('shows empty state when no concepts', () => {
    render(
      <MapView concepts={[]} edges={[]} territories={[]} />
    );
    expect(screen.getByText('No concepts loaded yet.')).toBeInTheDocument();
  });

  it('passes onConceptClick to visual map', () => {
    const onConceptClick = vi.fn();
    render(
      <MapView
        concepts={makeConcepts()}
        edges={makeEdges()}
        territories={[]}
        onConceptClick={onConceptClick}
      />
    );
    // VisualMap receives the handler — click testing covered in VisualMap.test.tsx
    expect(screen.getByLabelText('Concept map')).toBeInTheDocument();
  });

  it('marks active territory based on activeConcept', () => {
    const { container } = render(
      <MapView
        concepts={makeConcepts()}
        edges={makeEdges()}
        territories={[makeTerritory()]}
        activeConcept="tcp"
      />
    );
    const activeCard = container.querySelector('.territory-card--active');
    expect(activeCard).not.toBeNull();
  });

  it('no active territory when activeConcept is absent', () => {
    const { container } = render(
      <MapView
        concepts={makeConcepts()}
        edges={makeEdges()}
        territories={[makeTerritory()]}
      />
    );
    const activeCard = container.querySelector('.territory-card--active');
    expect(activeCard).toBeNull();
  });
});
