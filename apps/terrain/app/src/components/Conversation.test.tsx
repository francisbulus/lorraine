import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Conversation from './Conversation';
import type { ConversationMessage, TrustUpdate } from './Conversation';

const MESSAGES: ConversationMessage[] = [
  { id: '1', role: 'agent', content: 'You\'ve seen a problem structured like this before.' },
  { id: '2', role: 'learner', content: 'It reminds me of the TCP acknowledgment pattern.' },
  { id: '3', role: 'agent', content: 'You just connected database WAL to TCP\'s reliability guarantee.' },
];

const TRUST_UPDATES: TrustUpdate[] = [
  {
    id: 'tu-1',
    afterMessageId: '2',
    conceptId: 'tcp-retransmission',
    newLevel: 'verified',
    reason: 'from your explanation',
  },
];

describe('Conversation', () => {
  it('renders agent messages with font-voice', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={[]} onSubmit={() => {}} />
    );
    const agentMsg = screen.getByText(/You've seen a problem/);
    expect(agentMsg.className).toContain('font-voice');
    expect(agentMsg.dataset.role).toBe('agent');
  });

  it('renders learner messages with font-hand', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={[]} onSubmit={() => {}} />
    );
    const learnerMsg = screen.getByText(/TCP acknowledgment pattern/);
    expect(learnerMsg.className).toContain('font-hand');
    expect(learnerMsg.dataset.role).toBe('learner');
  });

  it('renders trust update annotations between messages', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={TRUST_UPDATES} onSubmit={() => {}} />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/tcp-retransmission → verified/)).toBeInTheDocument();
  });

  it('renders the input field', () => {
    render(
      <Conversation messages={[]} trustUpdates={[]} onSubmit={() => {}} />
    );
    expect(screen.getByLabelText('Your message')).toBeInTheDocument();
  });

  it('calls onSubmit when Enter is pressed with text', () => {
    const onSubmit = vi.fn();
    render(
      <Conversation messages={[]} trustUpdates={[]} onSubmit={onSubmit} />
    );
    const input = screen.getByLabelText('Your message');
    fireEvent.change(input, { target: { value: 'Hello' } });
    // For textarea, we need to set value directly since fireEvent.change doesn't update ref
    (input as HTMLTextAreaElement).value = 'Hello';
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith('Hello');
  });

  it('does not submit on Shift+Enter', () => {
    const onSubmit = vi.fn();
    render(
      <Conversation messages={[]} trustUpdates={[]} onSubmit={onSubmit} />
    );
    const input = screen.getByLabelText('Your message');
    (input as HTMLTextAreaElement).value = 'Hello';
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit empty input', () => {
    const onSubmit = vi.fn();
    render(
      <Conversation messages={[]} trustUpdates={[]} onSubmit={onSubmit} />
    );
    const input = screen.getByLabelText('Your message');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('applies speaker-change spacing when role changes', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={[]} onSubmit={() => {}} />
    );
    // The second message (learner after agent) should have speaker-change class on wrapper
    const learnerMsg = screen.getByText(/TCP acknowledgment pattern/);
    const wrapper = learnerMsg.closest('.conversation__speaker-change');
    expect(wrapper).not.toBeNull();
  });

  it('disables input when disabled prop is true', () => {
    render(
      <Conversation messages={[]} trustUpdates={[]} onSubmit={() => {}} disabled />
    );
    expect(screen.getByLabelText('Your message')).toBeDisabled();
  });

  it('renders messages without chat bubbles or avatars', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={[]} onSubmit={() => {}} />
    );
    // No elements with avatar-like attributes
    const container = screen.getByText(/You've seen a problem/).closest('.conversation__messages');
    expect(container?.querySelectorAll('img')).toHaveLength(0);
    expect(container?.querySelectorAll('[class*="avatar"]')).toHaveLength(0);
    expect(container?.querySelectorAll('[class*="bubble"]')).toHaveLength(0);
  });
});
