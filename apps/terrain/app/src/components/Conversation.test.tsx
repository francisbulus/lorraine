import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      <Conversation messages={MESSAGES} trustUpdates={[]} />
    );
    const agentMsg = screen.getByText(/You've seen a problem/);
    expect(agentMsg.className).toContain('font-voice');
    expect(agentMsg.dataset.role).toBe('agent');
  });

  it('renders learner messages with font-hand', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={[]} />
    );
    const learnerMsg = screen.getByText(/TCP acknowledgment pattern/);
    expect(learnerMsg.className).toContain('font-hand');
    expect(learnerMsg.dataset.role).toBe('learner');
  });

  it('renders trust update annotations between messages', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={TRUST_UPDATES} />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/tcp-retransmission → verified/)).toBeInTheDocument();
  });

  it('applies speaker-change spacing when role changes', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={[]} />
    );
    // The second message (learner after agent) should have speaker-change class on wrapper
    const learnerMsg = screen.getByText(/TCP acknowledgment pattern/);
    const wrapper = learnerMsg.closest('.conversation__speaker-change');
    expect(wrapper).not.toBeNull();
  });

  it('renders messages without chat bubbles or avatars', () => {
    render(
      <Conversation messages={MESSAGES} trustUpdates={[]} />
    );
    // No elements with avatar-like attributes
    const container = screen.getByText(/You've seen a problem/).closest('.conversation__messages');
    expect(container?.querySelectorAll('img')).toHaveLength(0);
    expect(container?.querySelectorAll('[class*="avatar"]')).toHaveLength(0);
    expect(container?.querySelectorAll('[class*="bubble"]')).toHaveLength(0);
  });
});
