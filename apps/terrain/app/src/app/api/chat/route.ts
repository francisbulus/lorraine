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
    decayedConfidence: trustStates[c.id]?.decayedConfidence ?? 0,
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
      action?: 'init' | 'chat' | 'state' | 'sandbox-run' | 'end-mode' | 'focus-concept';
      code?: string;
      conceptId?: string;
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
        mode: session.loop.getCurrentMode(),
        ...state,
      });
    }

    // State action: return current state without processing a message.
    if (action === 'state') {
      const state = getSessionState(session);
      return NextResponse.json({
        sessionId,
        mode: session.loop.getCurrentMode(),
        ...state,
      });
    }

    // Sandbox-run action: execute code in the active sandbox.
    if (action === 'sandbox-run') {
      if (!body.code || typeof body.code !== 'string') {
        return NextResponse.json(
          { error: 'code is required for sandbox-run' },
          { status: 400 }
        );
      }

      if (!session.loop.isSandboxActive()) {
        return NextResponse.json(
          { error: 'No active sandbox' },
          { status: 400 }
        );
      }

      const result = await session.loop.runSandboxCode(body.code);
      const state = getSessionState(session);

      return NextResponse.json({
        sessionId,
        execution: result.execution,
        annotation: result.annotation,
        suggestion: result.suggestion,
        trustUpdates: result.trustUpdates,
        mode: session.loop.getCurrentMode(),
        ...state,
      });
    }

    // End-mode action: close current mode and return to conversation.
    if (action === 'end-mode') {
      if (session.loop.isSandboxActive()) {
        session.loop.endSandbox();
      } else if (session.loop.getCurrentMode() === 'explain') {
        session.loop.endExplanation();
      }

      const state = getSessionState(session);
      return NextResponse.json({
        sessionId,
        mode: session.loop.getCurrentMode(),
        ...state,
      });
    }

    // Focus-concept action: generate contextual opening for a concept.
    if (action === 'focus-concept') {
      if (!body.conceptId || typeof body.conceptId !== 'string') {
        return NextResponse.json(
          { error: 'conceptId is required for focus-concept' },
          { status: 400 }
        );
      }

      const result = await session.loop.focusConcept(body.conceptId);
      const state = getSessionState(session);

      return NextResponse.json({
        sessionId,
        agentResponse: result.agentResponse,
        trustUpdates: result.trustUpdates,
        mode: result.mode,
        ...state,
      });
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
      mode: result.mode,
      sandboxStarted: result.sandboxStarted,
      explainResult: result.explainResult ? {
        depth: result.explainResult.depth,
        conceptId: result.explainResult.conceptId,
      } : undefined,
      transitionSuggestion: result.transitionSuggestion,
      ...state,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
