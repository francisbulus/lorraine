import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  recordSessionEvent,
  recordTrustUpdates,
  addConversationTurn,
  getSessionSummary,
} from './session';

describe('session', () => {
  it('creates a session with correct initial state', () => {
    const session = createSession('person-1', 'networking');
    expect(session.personId).toBe('person-1');
    expect(session.domainId).toBe('networking');
    expect(session.conceptsTouched.size).toBe(0);
    expect(session.events).toHaveLength(0);
    expect(session.conversationHistory).toHaveLength(0);
    expect(session.id).toMatch(/^session_/);
  });

  it('records events and tracks concepts touched', () => {
    const session = createSession('person-1', 'networking');
    recordSessionEvent(session, {
      type: 'verification',
      conceptId: 'tcp-basics',
      detail: 'grill:recall demonstrated',
    });
    expect(session.events).toHaveLength(1);
    expect(session.conceptsTouched.has('tcp-basics')).toBe(true);
  });

  it('records trust updates as events', () => {
    const session = createSession('person-1', 'networking');
    recordTrustUpdates(session, [
      { conceptId: 'tcp-basics', newLevel: 'verified', reason: 'from grill' },
      { conceptId: 'tcp-handshake', newLevel: 'inferred', reason: 'propagation' },
    ]);
    expect(session.events).toHaveLength(2);
    expect(session.conceptsTouched.has('tcp-basics')).toBe(true);
    expect(session.conceptsTouched.has('tcp-handshake')).toBe(true);
  });

  it('adds conversation turns', () => {
    const session = createSession('person-1', 'networking');
    addConversationTurn(session, { role: 'learner', content: 'Hello' });
    addConversationTurn(session, { role: 'agent', content: 'Welcome' });
    expect(session.conversationHistory).toHaveLength(2);
  });

  it('computes session summary', () => {
    const session = createSession('person-1', 'networking');
    recordSessionEvent(session, { type: 'verification', conceptId: 'tcp-basics', detail: 'test' });
    recordSessionEvent(session, { type: 'claim', conceptId: 'dns-resolution', detail: 'test' });

    const summary = getSessionSummary(session);
    expect(summary.personId).toBe('person-1');
    expect(summary.domainId).toBe('networking');
    expect(summary.conceptsTouched).toBe(2);
    expect(summary.eventsRecorded).toBe(2);
    expect(summary.durationMinutes).toBe(0); // Just created
  });

  it('deduplicates concepts touched', () => {
    const session = createSession('person-1', 'networking');
    recordSessionEvent(session, { type: 'verification', conceptId: 'tcp-basics', detail: 'a' });
    recordSessionEvent(session, { type: 'claim', conceptId: 'tcp-basics', detail: 'b' });
    expect(session.conceptsTouched.size).toBe(1);
  });

  it('handles events without conceptId', () => {
    const session = createSession('person-1', 'networking');
    recordSessionEvent(session, { type: 'mode_transition', detail: 'grill → explain' });
    expect(session.events).toHaveLength(1);
    expect(session.conceptsTouched.size).toBe(0);
  });
});
