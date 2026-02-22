import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MarginPanel from './MarginPanel';
import ConceptDetail from './ConceptDetail';
import VerificationHistory from './VerificationHistory';
import ClaimHistory from './ClaimHistory';
import ReasoningTrace from './ReasoningTrace';
import type { TrustState, VerificationEvent, ClaimEvent } from '@engine/types';

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

function makeEvent(overrides: Partial<VerificationEvent> = {}): VerificationEvent {
  return {
    id: 've_1',
    personId: 'test',
    conceptId: 'tcp-basics',
    modality: 'grill:recall',
    result: 'demonstrated',
    context: 'Correctly explained TCP basics',
    source: 'internal',
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeClaim(overrides: Partial<ClaimEvent> = {}): ClaimEvent {
  return {
    id: 'claim_1',
    personId: 'test',
    conceptId: 'tcp-basics',
    selfReportedConfidence: 0.9,
    context: 'I know TCP basics well',
    timestamp: Date.now(),
    retracted: false,
    ...overrides,
  };
}

describe('MarginPanel', () => {
  it('shows empty state when no concept detail', () => {
    render(<MarginPanel open />);
    expect(screen.getByText('No context yet.')).toBeDefined();
  });

  it('renders concept detail when provided', () => {
    render(
      <MarginPanel
        open
        conceptDetail={{
          conceptName: 'TCP Basics',
          trustState: makeTrustState(),
        }}
      />
    );
    expect(screen.getByText('TCP Basics')).toBeDefined();
  });

  it('applies open/closed classes', () => {
    const { container, rerender } = render(<MarginPanel open />);
    expect(container.querySelector('.margin-panel--open')).not.toBeNull();

    rerender(<MarginPanel open={false} />);
    expect(container.querySelector('.margin-panel--closed')).not.toBeNull();
  });
});

describe('ConceptDetail', () => {
  it('renders concept name in font-voice', () => {
    render(
      <ConceptDetail
        conceptName="TCP Basics"
        trustState={makeTrustState()}
      />
    );
    const name = screen.getByText('TCP Basics');
    expect(name.classList.contains('font-voice')).toBe(true);
  });

  it('renders trust level and confidence', () => {
    render(
      <ConceptDetail
        conceptName="TCP Basics"
        trustState={makeTrustState({ level: 'verified', decayedConfidence: 0.75 })}
      />
    );
    expect(screen.getByText('verified')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('renders modalities tested', () => {
    render(
      <ConceptDetail
        conceptName="TCP Basics"
        trustState={makeTrustState({ modalitiesTested: ['grill:recall', 'grill:inference'] })}
      />
    );
    expect(screen.getByText(/grill:recall, grill:inference/)).toBeDefined();
  });

  it('shows "none" when no modalities tested', () => {
    render(
      <ConceptDetail
        conceptName="TCP Basics"
        trustState={makeTrustState({ modalitiesTested: [] })}
      />
    );
    expect(screen.getByText(/Modalities: none/)).toBeDefined();
  });

  it('renders related concepts with trust glyphs', () => {
    render(
      <ConceptDetail
        conceptName="TCP Basics"
        trustState={makeTrustState()}
        relatedConcepts={[
          { id: 'tcp-handshake', name: 'TCP Handshake', level: 'inferred', edgeType: 'prerequisite' },
        ]}
      />
    );
    expect(screen.getByText('TCP Handshake')).toBeDefined();
    expect(screen.getByText('(prerequisite)')).toBeDefined();
  });

  it('renders trust glyph for verified level', () => {
    render(
      <ConceptDetail
        conceptName="TCP Basics"
        trustState={makeTrustState({ level: 'verified' })}
      />
    );
    // ● is the verified glyph
    expect(screen.getByText('●')).toBeDefined();
  });
});

describe('VerificationHistory', () => {
  it('renders nothing when no events', () => {
    const { container } = render(<VerificationHistory events={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders events with result and modality', () => {
    render(<VerificationHistory events={[makeEvent()]} />);
    expect(screen.getByText('demonstrated')).toBeDefined();
    expect(screen.getByText('grill:recall')).toBeDefined();
  });

  it('renders event context', () => {
    render(<VerificationHistory events={[makeEvent({ context: 'Explained TCP well' })]} />);
    expect(screen.getByText('Explained TCP well')).toBeDefined();
  });

  it('sorts events most recent first', () => {
    const old = makeEvent({ id: 've_old', timestamp: 1000, result: 'failed' });
    const recent = makeEvent({ id: 've_new', timestamp: 2000, result: 'demonstrated' });
    render(<VerificationHistory events={[old, recent]} />);

    const results = screen.getAllByText(/demonstrated|failed/);
    expect(results[0].textContent).toBe('demonstrated');
    expect(results[1].textContent).toBe('failed');
  });
});

describe('ClaimHistory', () => {
  it('renders nothing when no claims and no gap', () => {
    const { container } = render(<ClaimHistory claims={[]} calibrationGap={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders calibration gap as overclaiming', () => {
    render(<ClaimHistory claims={[makeClaim()]} calibrationGap={0.3} />);
    expect(screen.getByText(/\+30%/)).toBeDefined();
    expect(screen.getByText(/overclaiming/)).toBeDefined();
  });

  it('renders calibration gap as underclaiming', () => {
    render(<ClaimHistory claims={[makeClaim()]} calibrationGap={-0.2} />);
    expect(screen.getByText(/-20%/)).toBeDefined();
    expect(screen.getByText(/underclaiming/)).toBeDefined();
  });

  it('renders calibration gap as aligned', () => {
    render(<ClaimHistory claims={[makeClaim()]} calibrationGap={0.05} />);
    expect(screen.getByText(/aligned/)).toBeDefined();
  });

  it('renders claim context in quotes', () => {
    render(<ClaimHistory claims={[makeClaim({ context: 'I know this' })]} calibrationGap={null} />);
    expect(screen.getByText(/I know this/)).toBeDefined();
  });

  it('renders confidence percentage', () => {
    render(<ClaimHistory claims={[makeClaim({ selfReportedConfidence: 0.9 })]} calibrationGap={null} />);
    expect(screen.getByText('90% confident')).toBeDefined();
  });
});

describe('ReasoningTrace', () => {
  it('starts collapsed', () => {
    render(<ReasoningTrace reasoning="Because of X and Y" />);
    expect(screen.getByText('[see reasoning]')).toBeDefined();
    expect(screen.queryByText('Because of X and Y')).toBeNull();
  });

  it('expands on click', () => {
    render(<ReasoningTrace reasoning="Because of X and Y" />);
    fireEvent.click(screen.getByText('[see reasoning]'));
    expect(screen.getByText('Because of X and Y')).toBeDefined();
  });

  it('collapses on second click', () => {
    render(<ReasoningTrace reasoning="Because of X and Y" />);
    fireEvent.click(screen.getByText('[see reasoning]'));
    fireEvent.click(screen.getByText('× hide reasoning'));
    expect(screen.queryByText('Because of X and Y')).toBeNull();
  });
});
