import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReturnFlow from './ReturnFlow';
import type { DecayResult } from '@engine/types';
import type { SessionSummary } from '@/lib/session';

const BASE_SESSION: SessionSummary = {
  id: 'session_1',
  personId: 'person-1',
  domainId: 'networking',
  startedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
  lastActiveAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
  durationMinutes: 45,
  conceptsTouched: 5,
  eventsRecorded: 12,
};

const DECAY_RESULTS: DecayResult[] = [
  {
    conceptId: 'tcp-basics',
    previousConfidence: 0.8,
    decayedConfidence: 0.6,
    daysSinceVerified: 15,
  },
  {
    conceptId: 'tcp-handshake',
    previousConfidence: 0.7,
    decayedConfidence: 0.5,
    daysSinceVerified: 20,
  },
];

describe('ReturnFlow', () => {
  it('shows when last session was', () => {
    render(
      <ReturnFlow
        lastSession={BASE_SESSION}
        decayResults={[]}
        onResume={() => {}}
        onNewSession={() => {}}
      />
    );
    expect(screen.getByText(/You were last here/)).toBeDefined();
    expect(screen.getByText(/5 concepts/)).toBeDefined();
  });

  it('shows stable terrain message when no significant decay', () => {
    render(
      <ReturnFlow
        lastSession={BASE_SESSION}
        decayResults={[{ conceptId: 'a', previousConfidence: 0.8, decayedConfidence: 0.78, daysSinceVerified: 2 }]}
        onResume={() => {}}
        onNewSession={() => {}}
      />
    );
    expect(screen.getByText(/terrain looks stable/)).toBeDefined();
  });

  it('shows decay details for significant decay', () => {
    render(
      <ReturnFlow
        lastSession={BASE_SESSION}
        decayResults={DECAY_RESULTS}
        onResume={() => {}}
        onNewSession={() => {}}
      />
    );
    expect(screen.getByText(/gone untouched/)).toBeDefined();
    expect(screen.getByText(/tcp-basics: 80% → 60%/)).toBeDefined();
    expect(screen.getByText(/tcp-handshake: 70% → 50%/)).toBeDefined();
  });

  it('mentions concept name for single decay', () => {
    render(
      <ReturnFlow
        lastSession={BASE_SESSION}
        decayResults={[DECAY_RESULTS[0]]}
        onResume={() => {}}
        onNewSession={() => {}}
      />
    );
    expect(screen.getByText(/worked with tcp-basics directly/)).toBeDefined();
  });

  it('calls onResume when resume clicked', () => {
    const onResume = vi.fn();
    render(
      <ReturnFlow
        lastSession={BASE_SESSION}
        decayResults={[]}
        onResume={onResume}
        onNewSession={() => {}}
      />
    );
    fireEvent.click(screen.getByText('pick up where I left off'));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('calls onNewSession when new session clicked', () => {
    const onNewSession = vi.fn();
    render(
      <ReturnFlow
        lastSession={BASE_SESSION}
        decayResults={[]}
        onResume={() => {}}
        onNewSession={onNewSession}
      />
    );
    fireEvent.click(screen.getByText('start fresh'));
    expect(onNewSession).toHaveBeenCalledOnce();
  });

  it('shows days since verified', () => {
    render(
      <ReturnFlow
        lastSession={BASE_SESSION}
        decayResults={DECAY_RESULTS}
        onResume={() => {}}
        onNewSession={() => {}}
      />
    );
    expect(screen.getByText(/15d since verified/)).toBeDefined();
    expect(screen.getByText(/20d since verified/)).toBeDefined();
  });
});
