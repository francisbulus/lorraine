import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TerritoryCard from './TerritoryCard';
import type { TerritoryState, ThresholdReadiness } from '@/lib/territory-state';

function makeState(overrides: Partial<TerritoryState> = {}): TerritoryState {
  return {
    territory: { id: 'tcp-reliability', name: 'TCP Reliability', conceptIds: ['tcp-basics', 'tcp-ack'] },
    verifiedCount: 1,
    inferredCount: 0,
    contestedCount: 0,
    untestedCount: 1,
    totalConcepts: 2,
    verifiedPercent: 50,
    progressPercent: 50,
    contestedConcepts: [],
    concepts: [
      { conceptId: 'tcp-basics', level: 'verified', decayedConfidence: 0.8 },
      { conceptId: 'tcp-ack', level: 'untested', decayedConfidence: 0 },
    ],
    ...overrides,
  };
}

describe('TerritoryCard', () => {
  it('renders territory name in font-voice', () => {
    render(<TerritoryCard state={makeState()} />);
    const name = screen.getByText('TCP Reliability');
    expect(name.classList.contains('font-voice')).toBe(true);
  });

  it('renders progress bar with percentage', () => {
    render(<TerritoryCard state={makeState()} />);
    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('renders trust state breakdown', () => {
    render(<TerritoryCard state={makeState()} />);
    expect(screen.getByText(/1 verified/)).toBeDefined();
    expect(screen.getByText(/1 untested/)).toBeDefined();
  });

  it('shows contested concepts when present', () => {
    render(
      <TerritoryCard
        state={makeState({
          contestedCount: 1,
          contestedConcepts: ['tcp-ack'],
        })}
      />
    );
    expect(screen.getByText(/Contested: tcp-ack/)).toBeDefined();
  });

  it('applies active styling class', () => {
    const { container } = render(<TerritoryCard state={makeState()} active />);
    const card = container.querySelector('.territory-card--active');
    expect(card).not.toBeNull();
  });

  it('does not apply active styling when not active', () => {
    const { container } = render(<TerritoryCard state={makeState()} />);
    const card = container.querySelector('.territory-card--active');
    expect(card).toBeNull();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<TerritoryCard state={makeState()} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders threshold readiness when provided', () => {
    const threshold: ThresholdReadiness = {
      threshold: { id: 'tcp-to-adv', from: 'tcp-reliability', to: 'TCP Advanced', readinessCriteria: { conceptIds: ['tcp-basics', 'tcp-ack', 'tcp-retransmission'], minimumLevel: 'verified' } },
      ready: ['tcp-basics'],
      missing: ['tcp-ack', 'tcp-retransmission'],
      totalRequired: 3,
      isReady: false,
    };

    render(<TerritoryCard state={makeState()} threshold={threshold} />);
    expect(screen.getByText(/Threshold: TCP Advanced/)).toBeDefined();
    expect(screen.getByText(/Ready: 1\/3 concepts/)).toBeDefined();
    expect(screen.getByText(/missing: tcp-ack, tcp-retransmission/)).toBeDefined();
  });

  it('hides threshold when already ready', () => {
    const threshold: ThresholdReadiness = {
      threshold: { id: 'test', from: 'a', to: 'b', readinessCriteria: { conceptIds: ['tcp-basics'], minimumLevel: 'verified' } },
      ready: ['tcp-basics'],
      missing: [],
      totalRequired: 1,
      isReady: true,
    };

    render(<TerritoryCard state={makeState()} threshold={threshold} />);
    expect(screen.queryByText(/Threshold/)).toBeNull();
  });

  it('renders trust glyphs with correct symbols', () => {
    render(
      <TerritoryCard
        state={makeState({
          verifiedCount: 1,
          contestedCount: 1,
          untestedCount: 0,
          contestedConcepts: ['tcp-ack'],
        })}
      />
    );
    // Verified glyph: ●, Contested glyph: ◐
    expect(screen.getByText('●')).toBeDefined();
    expect(screen.getByText('◐')).toBeDefined();
  });
});
