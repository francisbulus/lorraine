import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VisualMap from './VisualMap';
import MapPanel from './MapPanel';
import type { VisualMapConcept, VisualMapEdge } from './VisualMap';

const concepts: VisualMapConcept[] = [
  { id: 'tcp-basics', name: 'TCP Basics', trustLevel: 'verified' },
  { id: 'tcp-handshake', name: 'TCP Handshake', trustLevel: 'inferred' },
  { id: 'tcp-retransmission', name: 'TCP Retransmission', trustLevel: 'contested' },
  { id: 'flow-control', name: 'Flow Control', trustLevel: 'untested' },
];

const edges: VisualMapEdge[] = [
  { from: 'tcp-basics', to: 'tcp-handshake', type: 'prerequisite' },
  { from: 'tcp-basics', to: 'tcp-retransmission', type: 'prerequisite' },
];

describe('VisualMap', () => {
  it('renders the concept map', () => {
    render(<VisualMap concepts={concepts} edges={edges} />);
    expect(screen.getByRole('img', { name: 'Concept map' })).toBeDefined();
  });

  it('renders nodes for each concept', () => {
    render(<VisualMap concepts={concepts} edges={edges} />);
    for (const c of concepts) {
      expect(screen.getByRole('button', { name: `${c.name}: ${c.trustLevel}` })).toBeDefined();
    }
  });

  it('calls onConceptClick when node is clicked', () => {
    const onClick = vi.fn();
    render(<VisualMap concepts={concepts} edges={edges} onConceptClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'TCP Basics: verified' }));
    expect(onClick).toHaveBeenCalledWith('tcp-basics');
  });

  it('shows empty state when no concepts', () => {
    render(<VisualMap concepts={[]} edges={[]} />);
    expect(screen.getByText('No concepts loaded yet.')).toBeDefined();
  });

  it('renders SVG elements for edges', () => {
    const { container } = render(<VisualMap concepts={concepts} edges={edges} />);
    const lines = container.querySelectorAll('line');
    // edges + possibly goal path lines
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('renders goal path when active and goal are set', () => {
    const { container } = render(
      <VisualMap
        concepts={concepts}
        edges={edges}
        activeConcept="tcp-basics"
        goalConcept="flow-control"
      />
    );
    const dashedLines = container.querySelectorAll('line[stroke-dasharray]');
    expect(dashedLines.length).toBe(1);
  });

  it('renders territory zones when territories provided', () => {
    const { container } = render(
      <VisualMap
        concepts={concepts}
        edges={edges}
        territories={[
          { id: 'tcp', name: 'TCP Fundamentals', conceptIds: ['tcp-basics', 'tcp-handshake'] },
        ]}
      />
    );
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses.length).toBe(1);
    // Territory label
    const texts = container.querySelectorAll('text');
    const zoneLabel = Array.from(texts).find((t) => t.textContent === 'TCP Fundamentals');
    expect(zoneLabel).toBeDefined();
  });

  it('renders persistent labels on nodes', () => {
    const { container } = render(<VisualMap concepts={concepts} edges={edges} />);
    const texts = container.querySelectorAll('text');
    const labels = Array.from(texts).map((t) => t.textContent);
    expect(labels).toContain('TCP Basics');
    expect(labels).toContain('Flow Control');
  });
});

describe('MapPanel view toggle', () => {
  it('shows list view by default', () => {
    render(<MapPanel open concepts={concepts} edges={edges} />);
    expect(screen.getByText('No terrain yet.')).toBeDefined();
  });

  it('switches to graph view', () => {
    render(<MapPanel open concepts={concepts} edges={edges} />);
    fireEvent.click(screen.getByText('graph'));
    expect(screen.getByRole('img', { name: 'Concept map' })).toBeDefined();
  });

  it('switches back to list view', () => {
    render(<MapPanel open concepts={concepts} edges={edges} />);
    fireEvent.click(screen.getByText('graph'));
    fireEvent.click(screen.getByText('list'));
    expect(screen.getByText('No terrain yet.')).toBeDefined();
  });

  it('renders view toggle buttons', () => {
    render(<MapPanel open concepts={concepts} edges={edges} />);
    expect(screen.getByText('list')).toBeDefined();
    expect(screen.getByText('graph')).toBeDefined();
  });
});
