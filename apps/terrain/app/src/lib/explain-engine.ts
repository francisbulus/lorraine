import type { Store } from '@engine/store/interface';
import type { TrustState } from '@engine/types';
import type { LLMProvider } from '@llm/types';
import { getTrustState } from '@engine/trust/query';
import { getGraph } from '@engine/graph/query';
import { selectDepth, adjustDepth, DEPTH_DESCRIPTIONS, type DepthLevel } from './depth-ladder';

export interface ExplainRequest {
  conceptId: string | null;
}

export interface ExplainState {
  conceptId: string;
  depth: DepthLevel;
  active: boolean;
}

export interface ExplainResult {
  explanation: string;
  depth: DepthLevel;
  conceptId: string;
}

// Patterns for explain mode triggers.
const EXPLAIN_PATTERNS = [
  /\bwhat is\b/i,
  /\bhow does\b/i,
  /\bexplain\b/i,
  /\bwhat are\b/i,
  /\bhow do\b/i,
  /\bcan you explain\b/i,
  /\btell me about\b/i,
];

// Patterns for depth adjustment.
const SIMPLER_PATTERNS = [
  /\bsimpl/i,
  /\beasier/i,
  /\bbreak it down/i,
  /\bELI5/i,
  /\bin plain/i,
  /\bmore basic/i,
];

const DEEPER_PATTERNS = [
  /\bshow me the code/i,
  /\bmore detail/i,
  /\bgo deeper/i,
  /\bhow exactly/i,
  /\bimplementation/i,
  /\bunder the hood/i,
  /\btechnical/i,
];

const EXPLAIN_SYSTEM_PROMPT = `You are explaining a concept to a learner. Your explanation should match the requested depth level.

Depth levels:
- intuition: Big-picture analogy. No jargon. Help them see the shape of the idea.
- abstraction: Conceptual model. Key properties and relationships. Some terminology.
- mechanism: How it actually works. Internal structure, process, edge cases.
- implementation: Code-level detail. Concrete implementation. Show the thing.

Rules:
- Never praise. Reflect, don't evaluate.
- Match the depth exactly. Don't over-explain at intuition or under-explain at mechanism.
- If prerequisites are weak, acknowledge what they might not know yet.
- Be concise. An explanation that's too long defeats the purpose.`;

export function detectExplainRequest(
  utterance: string,
  conceptIds: string[]
): ExplainRequest | null {
  const matches = EXPLAIN_PATTERNS.some((p) => p.test(utterance));
  if (!matches) return null;

  const lower = utterance.toLowerCase();
  const matchedConcept = conceptIds.find((cid) =>
    lower.includes(cid.replace(/-/g, ' '))
  );

  return { conceptId: matchedConcept ?? null };
}

export function detectDepthAdjustment(
  utterance: string
): 'simpler' | 'deeper' | null {
  if (SIMPLER_PATTERNS.some((p) => p.test(utterance))) return 'simpler';
  if (DEEPER_PATTERNS.some((p) => p.test(utterance))) return 'deeper';
  return null;
}

export function createExplainEngine(config: {
  store: Store;
  llm: LLMProvider;
  personId: string;
  conceptIds: string[];
}) {
  const { store, llm, personId, conceptIds } = config;
  let explainState: ExplainState | null = null;

  function getPrerequisiteTrust(conceptId: string): TrustState[] {
    const graph = getGraph(store, { conceptIds: [conceptId], depth: 1 });
    const prereqIds = graph.edges
      .filter((e) => e.to === conceptId && e.type === 'prerequisite')
      .map((e) => e.from);

    return prereqIds.map((pid) =>
      getTrustState(store, { personId, conceptId: pid })
    );
  }

  async function startExplanation(conceptId: string): Promise<ExplainResult> {
    const conceptTrust = getTrustState(store, { personId, conceptId });
    const prereqTrust = getPrerequisiteTrust(conceptId);
    const depth = selectDepth(conceptTrust, prereqTrust);

    explainState = { conceptId, depth, active: true };

    const explanation = await generateExplanation(conceptId, depth, conceptTrust, prereqTrust);

    return { explanation, depth, conceptId };
  }

  async function adjustExplanation(direction: 'simpler' | 'deeper'): Promise<ExplainResult> {
    if (!explainState) {
      throw new Error('No active explanation to adjust');
    }

    const newDepth = adjustDepth(explainState.depth, direction);
    explainState.depth = newDepth;

    const conceptTrust = getTrustState(store, { personId, conceptId: explainState.conceptId });
    const prereqTrust = getPrerequisiteTrust(explainState.conceptId);

    const explanation = await generateExplanation(
      explainState.conceptId,
      newDepth,
      conceptTrust,
      prereqTrust
    );

    return { explanation, depth: newDepth, conceptId: explainState.conceptId };
  }

  async function generateExplanation(
    conceptId: string,
    depth: DepthLevel,
    conceptTrust: TrustState,
    prereqTrust: TrustState[]
  ): Promise<string> {
    const graph = getGraph(store, { conceptIds: [conceptId], depth: 1 });
    const concept = graph.concepts.find((c) => c.id === conceptId);

    const parts: string[] = [];
    parts.push(`Concept: ${concept?.name ?? conceptId}`);
    parts.push(`Description: ${concept?.description ?? 'N/A'}`);
    parts.push(`Requested depth: ${depth} — ${DEPTH_DESCRIPTIONS[depth]}`);
    parts.push(`Learner's trust level on this concept: ${conceptTrust.level}`);

    if (prereqTrust.length > 0) {
      parts.push('');
      parts.push('Prerequisites:');
      for (const pt of prereqTrust) {
        parts.push(`- ${pt.conceptId}: ${pt.level}`);
      }
    }

    parts.push('');
    parts.push(`Generate a ${depth}-level explanation.`);

    const response = await llm.complete(EXPLAIN_SYSTEM_PROMPT, [
      { role: 'user', content: parts.join('\n') },
    ]);

    return response.content;
  }

  function isExplaining(): boolean {
    return explainState !== null && explainState.active;
  }

  function getExplainState(): ExplainState | null {
    return explainState;
  }

  function endExplanation(): void {
    if (explainState) {
      explainState.active = false;
      explainState = null;
    }
  }

  return {
    startExplanation,
    adjustExplanation,
    isExplaining,
    getExplainState,
    endExplanation,
  };
}
