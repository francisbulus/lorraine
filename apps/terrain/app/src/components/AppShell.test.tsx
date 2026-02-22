import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppShell from './AppShell';

const mockConcepts = [
  { id: 'tcp', name: 'TCP', trustLevel: 'untested' },
  { id: 'udp', name: 'UDP', trustLevel: 'untested' },
];

const mockEdges = [{ from: 'tcp', to: 'udp', type: 'related_to' }];

let mockSession: Record<string, unknown>;

vi.mock('../hooks/useSession', () => ({
  useSession: () => mockSession,
}));

beforeEach(() => {
  mockSession = {
    sessionId: null,
    messages: [],
    trustUpdates: [],
    trustStates: {},
    concepts: mockConcepts,
    edges: mockEdges,
    territories: [],
    calibration: null,
    loading: false,
    error: null,
    initialized: true,
    mode: 'conversation',
    sandboxActive: false,
    sandboxConceptId: null,
    sendMessage: vi.fn(),
    initSession: vi.fn(),
    getTrustStateForConcept: () => null,
    runSandboxCode: vi.fn(),
    closeSandbox: vi.fn(),
    focusConcept: vi.fn(),
    focusedConceptId: null,
  };
});

describe('AppShell', () => {
  it('renders the top bar with app title', () => {
    render(<AppShell />);
    expect(screen.getByText('terrain')).toBeInTheDocument();
  });

  it('renders session duration', () => {
    render(<AppShell />);
    expect(screen.getByText('<1 min')).toBeInTheDocument();
  });

  it('renders map by default (not conversation)', () => {
    render(<AppShell />);
    expect(screen.getByLabelText('Concept map')).toBeInTheDocument();
  });

  it('shows hint text when map is full', () => {
    render(<AppShell />);
    expect(screen.getByText('Click any concept to begin.')).toBeInTheDocument();
  });

  it('does not show "What do you want to learn?"', () => {
    render(<AppShell />);
    expect(screen.queryByText('What do you want to learn?')).not.toBeInTheDocument();
  });

  it('clicking concept opens split view', () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: 'TCP: untested' }));
    expect(screen.getByLabelText('Conversation')).toBeInTheDocument();
    // Map is still visible
    expect(screen.getByLabelText('Concept map')).toBeInTheDocument();
    // Hint disappears in split mode
    expect(screen.queryByText('Click any concept to begin.')).not.toBeInTheDocument();
  });

  it('Escape returns to full map', () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: 'TCP: untested' }));
    expect(screen.getByLabelText('Conversation')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('Conversation')).not.toBeInTheDocument();
    expect(screen.getByText('Click any concept to begin.')).toBeInTheDocument();
  });

  it('does not show calibration glyph when no data', () => {
    render(<AppShell />);
    expect(screen.queryByLabelText('Open calibration')).not.toBeInTheDocument();
  });

  it('has no toggle button', () => {
    render(<AppShell />);
    expect(screen.queryByText('map')).not.toBeInTheDocument();
    expect(screen.queryByText('← conversation')).not.toBeInTheDocument();
  });

  it('clicking concept triggers focusConcept', () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: 'TCP: untested' }));
    expect(mockSession.focusConcept).toHaveBeenCalledWith('tcp');
  });

  it('does not render three-column panels', () => {
    render(<AppShell />);
    expect(screen.queryByLabelText('Map')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Margin')).not.toBeInTheDocument();
  });
});
