import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LevelChangeNotification from './LevelChangeNotification';
import ChallengeFlow from './ChallengeFlow';
import PendingSignals from './PendingSignals';
import type { TrustState } from '@engine/types';
import type { PendingSignal } from '@/lib/quiet-mode';

function makeTrustState(overrides: Partial<TrustState> = {}): TrustState {
  return {
    conceptId: 'tcp-basics',
    personId: 'test',
    level: 'verified',
    confidence: 0.8,
    verificationHistory: [],
    claimHistory: [],
    modalitiesTested: ['grill:recall'],
    lastVerified: Date.now(),
    inferredFrom: [],
    decayedConfidence: 0.75,
    calibrationGap: null,
    ...overrides,
  };
}

describe('LevelChangeNotification', () => {
  it('renders concept → level annotation', () => {
    render(
      <LevelChangeNotification
        conceptId="tcp-basics"
        newLevel="verified"
        reason="from your explanation"
      />
    );
    expect(screen.getByText(/tcp-basics → verified/)).toBeDefined();
  });

  it('renders reason text', () => {
    render(
      <LevelChangeNotification
        conceptId="tcp-basics"
        newLevel="verified"
        reason="from your explanation"
      />
    );
    expect(screen.getByText('from your explanation')).toBeDefined();
  });

  it('renders [see reasoning] link when handler provided', () => {
    const onSeeReasoning = vi.fn();
    render(
      <LevelChangeNotification
        conceptId="tcp-basics"
        newLevel="verified"
        reason="test"
        onSeeReasoning={onSeeReasoning}
      />
    );
    const link = screen.getByText('[see reasoning]');
    fireEvent.click(link);
    expect(onSeeReasoning).toHaveBeenCalledOnce();
  });

  it('does not render [see reasoning] without handler', () => {
    render(
      <LevelChangeNotification
        conceptId="tcp-basics"
        newLevel="verified"
        reason="test"
      />
    );
    expect(screen.queryByText('[see reasoning]')).toBeNull();
  });

  it('auto-dismisses after timeout', () => {
    vi.useFakeTimers();
    render(
      <LevelChangeNotification
        conceptId="tcp-basics"
        newLevel="verified"
        reason="test"
        autoDismissMs={1000}
      />
    );
    expect(screen.getByText(/tcp-basics/)).toBeDefined();

    act(() => { vi.advanceTimersByTime(1100); });
    expect(screen.queryByText(/tcp-basics/)).toBeNull();
    vi.useRealTimers();
  });

  it('stays visible when interacted with before timeout', () => {
    vi.useFakeTimers();
    render(
      <LevelChangeNotification
        conceptId="tcp-basics"
        newLevel="verified"
        reason="test"
        autoDismissMs={1000}
      />
    );

    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText(/tcp-basics/)).toBeDefined();
    vi.useRealTimers();
  });

  it('has correct aria-label', () => {
    render(
      <LevelChangeNotification
        conceptId="tcp-basics"
        newLevel="verified"
        reason="test"
      />
    );
    expect(screen.getByLabelText('tcp-basics changed to verified')).toBeDefined();
  });
});

describe('ChallengeFlow', () => {
  it('renders concept name and trust level', () => {
    render(
      <ChallengeFlow
        conceptId="tcp-basics"
        conceptName="TCP Basics"
        trustState={makeTrustState({ level: 'verified', decayedConfidence: 0.75 })}
        onChallenge={() => {}}
      />
    );
    expect(screen.getByText('TCP Basics')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('shows inference source when inferred', () => {
    render(
      <ChallengeFlow
        conceptId="tcp-handshake"
        conceptName="TCP Handshake"
        trustState={makeTrustState({
          level: 'inferred',
          inferredFrom: ['tcp-basics'],
        })}
        onChallenge={() => {}}
      />
    );
    expect(screen.getByText(/Inferred from: tcp-basics/)).toBeDefined();
  });

  it('shows verification event count', () => {
    render(
      <ChallengeFlow
        conceptId="tcp-basics"
        conceptName="TCP Basics"
        trustState={makeTrustState({
          verificationHistory: [
            { id: 'e1', personId: 'test', conceptId: 'tcp-basics', modality: 'grill:recall', result: 'demonstrated', context: '', source: 'internal', timestamp: Date.now() },
            { id: 'e2', personId: 'test', conceptId: 'tcp-basics', modality: 'grill:inference', result: 'demonstrated', context: '', source: 'internal', timestamp: Date.now() },
          ],
        })}
        onChallenge={() => {}}
      />
    );
    expect(screen.getByText('2 verification events')).toBeDefined();
  });

  it('shows "No evidence yet" for untested', () => {
    render(
      <ChallengeFlow
        conceptId="tcp-basics"
        conceptName="TCP Basics"
        trustState={makeTrustState({ level: 'untested', verificationHistory: [] })}
        onChallenge={() => {}}
      />
    );
    expect(screen.getByText('No evidence yet.')).toBeDefined();
  });

  it('calls onChallenge with conceptId when button clicked', () => {
    const onChallenge = vi.fn();
    render(
      <ChallengeFlow
        conceptId="tcp-basics"
        conceptName="TCP Basics"
        trustState={makeTrustState()}
        onChallenge={onChallenge}
      />
    );
    fireEvent.click(screen.getByText('test me on this'));
    expect(onChallenge).toHaveBeenCalledWith('tcp-basics');
  });
});

describe('PendingSignals', () => {
  function makePending(id: string, conceptId: string): PendingSignal {
    return {
      id,
      signal: {
        conceptId,
        signalType: 'correct_usage',
        confidence: 0.8,
        evidence: `evidence for ${conceptId}`,
      },
      timestamp: Date.now(),
    };
  }

  it('renders nothing when no signals', () => {
    const { container } = render(
      <PendingSignals signals={[]} onAccept={() => {}} onDismiss={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders pending signal details', () => {
    render(
      <PendingSignals
        signals={[makePending('ps_1', 'tcp-basics')]}
        onAccept={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('tcp-basics')).toBeDefined();
    expect(screen.getByText('correct_usage')).toBeDefined();
    expect(screen.getByText('evidence for tcp-basics')).toBeDefined();
  });

  it('calls onAccept with signal id', () => {
    const onAccept = vi.fn();
    render(
      <PendingSignals
        signals={[makePending('ps_1', 'tcp-basics')]}
        onAccept={onAccept}
        onDismiss={() => {}}
      />
    );
    fireEvent.click(screen.getByText('accept'));
    expect(onAccept).toHaveBeenCalledWith('ps_1');
  });

  it('calls onDismiss with signal id', () => {
    const onDismiss = vi.fn();
    render(
      <PendingSignals
        signals={[makePending('ps_1', 'tcp-basics')]}
        onAccept={() => {}}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByText('dismiss'));
    expect(onDismiss).toHaveBeenCalledWith('ps_1');
  });

  it('renders multiple pending signals', () => {
    render(
      <PendingSignals
        signals={[
          makePending('ps_1', 'tcp-basics'),
          makePending('ps_2', 'dns-resolution'),
        ]}
        onAccept={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('tcp-basics')).toBeDefined();
    expect(screen.getByText('dns-resolution')).toBeDefined();
  });
});
