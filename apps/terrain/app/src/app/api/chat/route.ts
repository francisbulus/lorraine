import { NextRequest, NextResponse } from 'next/server';
import { createSQLiteStore } from '@engine/store/sqlite';
import { createAnthropicProvider } from '@llm/anthropic';
import { loadConcepts } from '@engine/graph/load';
import { getTrustState } from '@engine/trust/query';
import { getGraph } from '@engine/graph/query';
import { createConversationLoop } from '@/lib/conversation-loop';
import { computeTerritoryState, buildTrustStateMap } from '@/lib/territory-state';
import { computeCalibrationData } from '@/lib/calibration-data';
import type { DomainPackage } from '@/lib/domain-loader';
import type { Store } from '@engine/store/interface';
import type { TrustState } from '@engine/types';
import networkingDomain from '@domains/networking.json';

interface SessionData {
  store: Store;
  loop: ReturnType<typeof createConversationLoop>;
  domain: DomainPackage;
  personId: string;
}

// In-memory session store. In production, this would be persisted.
const sessions = new Map<string, SessionData>();

function getOrCreateSession(sessionId: string): SessionData {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  const store = createSQLiteStore(':memory:');
  const domain = networkingDomain as DomainPackage;

  loadConcepts(store, {
    concepts: domain.concepts,
    edges: domain.edges,
  });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const llm = createAnthropicProvider({ apiKey });

  const loop = createConversationLoop({
    store,
    llm,
    personId: sessionId,
    conceptIds: domain.concepts.map((c) => c.id),
  });

  const session: SessionData = { store, loop, domain, personId: sessionId };
  sessions.set(sessionId, session);
  return session;
}

function getSessionState(session: SessionData) {
  const { store, domain, personId } = session;
  const now = Date.now();

  // Build trust states for all concepts.
  const conceptIds = domain.concepts.map((c) => c.id);
  const trustStates: Record<string, TrustState> = {};
  for (const cid of conceptIds) {
    trustStates[cid] = getTrustState(store, { personId, conceptId: cid, asOfTimestamp: now });
  }

  // Build trust state map for territory computation.
  const trustStateMap = buildTrustStateMap(Object.values(trustStates));

  // Compute territory states.
  const territories = domain.territories.map((t) =>
    computeTerritoryState(t, trustStateMap)
  );

  // Get graph data.
  const graph = getGraph(store, { conceptIds });

  // Build concepts for the visual map.
  const concepts = domain.concepts.map((c) => ({
    id: c.id,
    name: c.name,
    trustLevel: trustStates[c.id]?.level ?? 'untested',
  }));

  // Build edges for the visual map.
  const edges = graph.edges.map((e) => ({
    from: e.from,
    to: e.to,
    type: e.type,
  }));

  // Compute calibration data.
  let calibration = null;
  try {
    calibration = computeCalibrationData(store, personId, conceptIds);
  } catch {
    // Calibration may fail if not enough data — that's fine.
  }

  return { trustStates, territories, concepts, edges, calibration };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: string;
      sessionId?: string;
      action?: 'init' | 'chat' | 'state';
    };

    const sessionId =
      body.sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const action = body.action ?? 'chat';

    const session = getOrCreateSession(sessionId);

    // Init action: return session metadata + initial state.
    if (action === 'init') {
      const state = getSessionState(session);
      return NextResponse.json({
        sessionId,
        domain: {
          name: session.domain.name,
          conceptCount: session.domain.concepts.length,
          territoryCount: session.domain.territories.length,
        },
        ...state,
      });
    }

    // State action: return current state without processing a message.
    if (action === 'state') {
      const state = getSessionState(session);
      return NextResponse.json({ sessionId, ...state });
    }

    // Chat action: process a message.
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const result = await session.loop.processUtterance(body.message);
    const state = getSessionState(session);

    return NextResponse.json({
      sessionId,
      agentResponse: result.agentResponse,
      trustUpdates: result.trustUpdates,
      ...state,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
