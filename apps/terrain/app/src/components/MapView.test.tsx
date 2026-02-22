import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapView from './MapView';
import type { VisualMapConcept, VisualMapEdge } from './VisualMap';

const makeConcepts = (): VisualMapConcept[] => [
  { id: 'tcp', name: 'TCP', trustLevel: 'verified' },
  { id: 'udp', name: 'UDP', trustLevel: 'inferred' },
];

const makeEdges = (): VisualMapEdge[] => [
  { from: 'tcp', to: 'udp', type: 'related_to' },
];

describe('MapView', () => {
  it('renders visual map with concepts', () => {
    render(
      <MapView concepts={makeConcepts()} edges={makeEdges()} territories={[]} />
    );
    expect(screen.getByLabelText('Concept map')).toBeInTheDocument();
  });

  it('does not render territory sidebar', () => {
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
    expect(screen.getByLabelText('Concept map')).toBeInTheDocument();
  });
});
