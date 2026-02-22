import { NextRequest, NextResponse } from 'next/server';
import { createSQLiteStore } from '@engine/store/sqlite';
import { createAnthropicProvider } from '@llm/anthropic';
import { loadConcepts } from '@engine/graph/load';
import { createConversationLoop } from '@/lib/conversation-loop';
import type { DomainPackage } from '@/lib/domain-loader';

// In-memory session store. In production, this would be persisted.
const sessions = new Map<
  string,
  ReturnType<typeof createConversationLoop>
>();

function getOrCreateSession(sessionId: string) {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  const store = createSQLiteStore(':memory:');

  // Load the networking domain.
  // Dynamic import to keep the route handler lean.
  const networkingDomain = require('@domains/networking.json') as DomainPackage;
  loadConcepts(store, {
    concepts: networkingDomain.concepts,
    edges: networkingDomain.edges,
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
    conceptIds: networkingDomain.concepts.map((c) => c.id),
  });

  sessions.set(sessionId, loop);
  return loop;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message: string;
      sessionId?: string;
    };

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const sessionId =
      body.sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const loop = getOrCreateSession(sessionId);
    const result = await loop.processUtterance(body.message);

    return NextResponse.json({
      sessionId,
      agentResponse: result.agentResponse,
      trustUpdates: result.trustUpdates,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
