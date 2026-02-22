import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConversationPanel from './ConversationPanel';

describe('ConversationPanel', () => {
  const defaultProps = {
    messages: [],
    trustUpdates: [],
    onSubmit: vi.fn(),
    loading: false,
    error: null,
  };

  it('shows empty state when no messages', () => {
    render(<ConversationPanel {...defaultProps} />);
    expect(screen.getByText('What do you want to learn?')).toBeInTheDocument();
  });

  it('calls onSubmit when Enter is pressed in empty state input', () => {
    const onSubmit = vi.fn();
    render(<ConversationPanel {...defaultProps} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Your message');
    fireEvent.change(input, { target: { value: 'What is TCP?' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('What is TCP?');
  });

  it('does not submit empty input', () => {
    const onSubmit = vi.fn();
    render(<ConversationPanel {...defaultProps} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Your message');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
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
    expect(screen.queryByText('What do you want to learn?')).not.toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    render(
      <ConversationPanel
        {...defaultProps}
        messages={[{ id: 'msg1', role: 'learner', content: 'hello' }]}
        loading={true}
      />
    );
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

  it('does not show loading in empty state', () => {
    render(<ConversationPanel {...defaultProps} loading={true} />);
    // Empty state renders, not the conversation + loading
    expect(screen.getByText('What do you want to learn?')).toBeInTheDocument();
    expect(screen.queryByText('thinking...')).not.toBeInTheDocument();
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
    // Input should be present alongside messages (inline, not in empty state)
    expect(screen.getByText('What is TCP?')).toBeInTheDocument();
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
  });
});
