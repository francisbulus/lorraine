import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConversationPanel from './ConversationPanel';

describe('ConversationPanel', () => {
  const defaultProps = {
    messages: [],
    trustUpdates: [],
    onSubmit: vi.fn(),
    loading: false,
    error: null,
  };

  it('shows minimal ready state when no messages', () => {
    render(<ConversationPanel {...defaultProps} />);
    expect(screen.queryByText('What do you want to learn?')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Conversation')).toBeInTheDocument();
  });

  it('shows input even with no messages', () => {
    render(<ConversationPanel {...defaultProps} />);
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
  });

  it('renders conversation when messages exist', () => {
    render(
      <ConversationPanel
        {...defaultProps}
        messages={[
          { id: 'msg1', role: 'learner', content: 'What is TCP?' },
          { id: 'msg2', role: 'agent', content: 'TCP is a transport protocol.' },
        ]}
      />
    );
    expect(screen.getByText('What is TCP?')).toBeInTheDocument();
    expect(screen.getByText('TCP is a transport protocol.')).toBeInTheDocument();
  });

  it('shows loading indicator when loading with messages', () => {
    render(
      <ConversationPanel
        {...defaultProps}
        messages={[{ id: 'msg1', role: 'learner', content: 'hello' }]}
        loading={true}
      />
    );
    expect(screen.getByText('thinking...')).toBeInTheDocument();
  });

  it('shows loading indicator in ready state when loading', () => {
    render(<ConversationPanel {...defaultProps} loading={true} />);
    expect(screen.getByText('thinking...')).toBeInTheDocument();
  });

  it('shows error message when error exists', () => {
    render(
      <ConversationPanel
        {...defaultProps}
        messages={[{ id: 'msg1', role: 'learner', content: 'hello' }]}
        error="API key missing"
      />
    );
    expect(screen.getByText('API key missing')).toBeInTheDocument();
  });

  it('renders sandbox inline when sandboxActive is true', () => {
    render(
      <ConversationPanel
        {...defaultProps}
        messages={[{ id: 'msg1', role: 'agent', content: 'Try writing code.' }]}
        sandboxActive={true}
        sandboxConceptId="tcp-basics"
        onSandboxRun={vi.fn()}
        onSandboxClose={vi.fn()}
      />
    );
    expect(screen.getByRole('region', { name: /sandbox: tcp-basics/i })).toBeInTheDocument();
  });

  it('does not render sandbox when sandboxActive is false', () => {
    render(
      <ConversationPanel
        {...defaultProps}
        messages={[{ id: 'msg1', role: 'agent', content: 'Try writing code.' }]}
        sandboxActive={false}
      />
    );
    expect(screen.queryByRole('region', { name: /sandbox/i })).not.toBeInTheDocument();
  });

  it('renders input inline when messages exist', () => {
    render(
      <ConversationPanel
        {...defaultProps}
        messages={[
          { id: 'msg1', role: 'learner', content: 'What is TCP?' },
          { id: 'msg2', role: 'agent', content: 'TCP is a transport protocol.' },
        ]}
      />
    );
    expect(screen.getByText('What is TCP?')).toBeInTheDocument();
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
  });
});
