import type { ConversationTurn, TrustUpdateResult } from './conversation-loop';

export interface SessionEvent {
  type: 'verification' | 'claim' | 'trust_change' | 'mode_transition' | 'grill';
  conceptId?: string;
  detail: string;
  timestamp: number;
}

export interface SessionData {
  id: string;
  personId: string;
  domainId: string;
  startedAt: number;
  lastActiveAt: number;
  conceptsTouched: Set<string>;
  events: SessionEvent[];
  conversationHistory: ConversationTurn[];
}

export interface SessionSummary {
  id: string;
  personId: string;
  domainId: string;
  startedAt: number;
  lastActiveAt: number;
  durationMinutes: number;
  conceptsTouched: number;
  eventsRecorded: number;
}

const STORAGE_KEY = 'terrain_session';
const SESSIONS_INDEX_KEY = 'terrain_sessions_index';

export function createSession(personId: string, domainId: string): SessionData {
  const now = Date.now();
  return {
    id: `session_${now}_${Math.random().toString(36).slice(2, 8)}`,
    personId,
    domainId,
    startedAt: now,
    lastActiveAt: now,
    conceptsTouched: new Set(),
    events: [],
    conversationHistory: [],
  };
}

export function recordSessionEvent(
  session: SessionData,
  event: Omit<SessionEvent, 'timestamp'>
): void {
  session.events.push({ ...event, timestamp: Date.now() });
  session.lastActiveAt = Date.now();
  if (event.conceptId) {
    session.conceptsTouched.add(event.conceptId);
  }
}

export function recordTrustUpdates(
  session: SessionData,
  updates: TrustUpdateResult[]
): void {
  for (const u of updates) {
    recordSessionEvent(session, {
      type: 'trust_change',
      conceptId: u.conceptId,
      detail: `${u.conceptId} → ${u.newLevel}: ${u.reason}`,
    });
  }
}

export function addConversationTurn(
  session: SessionData,
  turn: ConversationTurn
): void {
  session.conversationHistory.push(turn);
  session.lastActiveAt = Date.now();
}

export function getSessionSummary(session: SessionData): SessionSummary {
  return {
    id: session.id,
    personId: session.personId,
    domainId: session.domainId,
    startedAt: session.startedAt,
    lastActiveAt: session.lastActiveAt,
    durationMinutes: Math.floor((session.lastActiveAt - session.startedAt) / 60_000),
    conceptsTouched: session.conceptsTouched.size,
    eventsRecorded: session.events.length,
  };
}

export function saveSession(session: SessionData): void {
  if (typeof window === 'undefined') return;

  const serializable = {
    ...session,
    conceptsTouched: Array.from(session.conceptsTouched),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));

  // Update sessions index.
  const index = loadSessionsIndex();
  const existing = index.findIndex((s) => s.id === session.id);
  const summary = getSessionSummary(session);
  if (existing >= 0) {
    index[existing] = summary;
  } else {
    index.push(summary);
  }
  localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(index));
}

export function loadSession(): SessionData | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      conceptsTouched: new Set(parsed.conceptsTouched),
    };
  } catch {
    return null;
  }
}

export function loadSessionsIndex(): SessionSummary[] {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(SESSIONS_INDEX_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
