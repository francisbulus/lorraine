import type { Store } from '@engine/store/interface';
import type { TrustState, Modality } from '@engine/types';
import type { LLMProvider } from '@llm/types';
import type { DifficultyAxis, ImplicitSignal, ImplicitSignalType } from '@engine-services/types';
import { generateVerification } from '@engine-services/generateVerification';
import { getTrustState } from '@engine/trust/query';
import { recordVerification } from '@engine/trust/record';

export interface PendingGrill {
  conceptId: string;
  question: string;
  difficultyAxis: DifficultyAxis;
  conceptsTested: string[];
  expectedSignals: string[];
  startedAt: number;
}

export interface GrillInterpretation {
  result: 'demonstrated' | 'failed' | 'partial';
  contestedDetected: boolean;
  implicitSignals: ImplicitSignal[];
}

export interface GrillResult {
  result: 'demonstrated' | 'failed' | 'partial';
  trustUpdates: Array<{
    conceptId: string;
    newLevel: string;
    reason: string;
  }>;
  contestedDetected: boolean;
  implicitSignals: ImplicitSignal[];
}

export interface GrillRequest {
  conceptId: string | null;
  reason: 'person_requested';
}

export interface GrillEngineConfig {
  store: Store;
  llm: LLMProvider;
  personId: string;
  conceptIds: string[];
}

// Phrases that indicate a self-verification request.
const GRILL_REQUEST_PATTERNS = [
  /\btest me\b/i,
  /\bquiz me\b/i,
  /\bgrill me\b/i,
  /\bcheck my (understanding|knowledge)\b/i,
  /\bverify (my|what I)\b/i,
  /\bdo I (really )?(know|understand)\b/i,
];

const VALID_RESULTS = ['demonstrated', 'failed', 'partial'] as const;

const VALID_SIGNAL_TYPES: ImplicitSignalType[] = [
  'correct_usage',
  'incorrect_usage',
  'question_revealing_gap',
  'self_correction',
  'sophistication_increase',
  'confusion_signal',
  'natural_connection_made',
];

const INTERPRET_SYSTEM_PROMPT = `You are a response interpreter for a learning verification system.
Assess the person's response to a verification question and determine what it reveals about their understanding.

Output valid JSON:
{
  "result": "demonstrated" | "failed" | "partial",
  "contestedDetected": true/false,
  "implicitSignals": [
    {
      "conceptId": "concept_id",
      "signalType": "correct_usage" | "incorrect_usage" | "question_revealing_gap" | "self_correction" | "sophistication_increase" | "confusion_signal" | "natural_connection_made",
      "confidence": 0.0-1.0,
      "evidence": "what in the response shows this signal"
    }
  ]
}

Rules:
- "demonstrated" means clear understanding — not just keywords
- "partial" means some understanding but with gaps
- "failed" means they did not demonstrate understanding
- Be honest about failure — failure is the most informative event
- Never inflate assessment
- contestedDetected is true when the response shows understanding in some aspects but clear failure in others`;

export function selectDifficultyAxis(modalitiesTested: Modality[]): DifficultyAxis {
  const tested = new Set(modalitiesTested);
  if (!tested.has('grill:recall')) return 'recall';
  if (!tested.has('grill:inference')) return 'inference';
  if (!tested.has('grill:transfer')) return 'transfer';
  return 'discrimination';
}

export function selectGrillTarget(
  store: Store,
  personId: string,
  conceptIds: string[]
): string {
  let best = conceptIds[0];
  let bestScore = -1;

  for (const cid of conceptIds) {
    const ts = getTrustState(store, { personId, conceptId: cid });
    let score = 0;

    if (ts.level === 'contested') score = 100;
    else if (ts.level === 'untested' && ts.claimHistory.length > 0) score = 50;
    else if (ts.level === 'verified' && ts.lastVerified) {
      const daysSince = (Date.now() - ts.lastVerified) / (1000 * 60 * 60 * 24);
      score = Math.min(40, daysSince);
    } else if (ts.level === 'untested') score = 10;

    if (score > bestScore) {
      bestScore = score;
      best = cid;
    }
  }

  return best;
}

export function detectGrillRequest(
  utterance: string,
  conceptIds: string[]
): GrillRequest | null {
  const matches = GRILL_REQUEST_PATTERNS.some((p) => p.test(utterance));
  if (!matches) return null;

  // Try to identify which concept the learner is referring to.
  const lower = utterance.toLowerCase();
  const matchedConcept = conceptIds.find((cid) => lower.includes(cid.replace(/-/g, ' ')));

  return {
    conceptId: matchedConcept ?? null,
    reason: 'person_requested',
  };
}

export async function interpretGrillResponse(
  llm: LLMProvider,
  question: string,
  response: string,
  conceptsTested: string[]
): Promise<GrillInterpretation> {
  const userMessage = [
    `Verification question: ${question}`,
    '',
    `Person's response: ${response}`,
    '',
    `Concepts being tested: ${conceptsTested.join(', ')}`,
  ].join('\n');

  const llmResponse = await llm.complete(INTERPRET_SYSTEM_PROMPT, [
    { role: 'user', content: userMessage },
  ]);

  return parseGrillInterpretation(llmResponse.content, conceptsTested);
}

function parseGrillInterpretation(
  raw: string,
  conceptsTested: string[]
): GrillInterpretation {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]) as {
      result?: string;
      contestedDetected?: boolean;
      implicitSignals?: Array<{
        conceptId?: string;
        signalType?: string;
        confidence?: number;
        evidence?: string;
      }>;
    };

    const result = VALID_RESULTS.includes(parsed.result as typeof VALID_RESULTS[number])
      ? (parsed.result as 'demonstrated' | 'failed' | 'partial')
      : 'partial';

    const implicitSignals: ImplicitSignal[] = (parsed.implicitSignals ?? [])
      .filter(
        (s) =>
          s.conceptId &&
          s.signalType &&
          VALID_SIGNAL_TYPES.includes(s.signalType as ImplicitSignalType) &&
          conceptsTested.includes(s.conceptId)
      )
      .map((s) => ({
        conceptId: s.conceptId!,
        signalType: s.signalType as ImplicitSignalType,
        confidence: typeof s.confidence === 'number'
          ? Math.min(1, Math.max(0, s.confidence))
          : 0.5,
        evidence: s.evidence ?? '',
      }));

    return {
      result,
      contestedDetected: parsed.contestedDetected ?? false,
      implicitSignals,
    };
  } catch {
    return {
      result: 'partial',
      contestedDetected: false,
      implicitSignals: [],
    };
  }
}

export function createGrillEngine(config: GrillEngineConfig) {
  const { store, llm, personId, conceptIds } = config;
  let pendingGrill: PendingGrill | null = null;

  async function startGrill(
    conceptId?: string,
    axis?: DifficultyAxis
  ): Promise<PendingGrill> {
    const targetConcept = conceptId ?? selectGrillTarget(store, personId, conceptIds);
    const ts = getTrustState(store, { personId, conceptId: targetConcept });
    const difficultyAxis = axis ?? selectDifficultyAxis(ts.modalitiesTested);
    const modality: Modality = `grill:${difficultyAxis}`;

    const verification = await generateVerification(store, llm, {
      personId,
      conceptId: targetConcept,
      targetModality: modality,
      difficultyAxis,
      reason: 'probing',
      applicationContext: 'learning',
    });

    pendingGrill = {
      conceptId: targetConcept,
      question: verification.content,
      difficultyAxis,
      conceptsTested: verification.conceptsTested,
      expectedSignals: verification.expectedSignals,
      startedAt: Date.now(),
    };

    return pendingGrill;
  }

  async function processGrillResponse(response: string): Promise<GrillResult> {
    if (!pendingGrill) {
      throw new Error('No pending grill to process');
    }

    const grill = pendingGrill;
    pendingGrill = null;

    const interpretation = await interpretGrillResponse(
      llm,
      grill.question,
      response,
      grill.conceptsTested
    );

    const modality: Modality = `grill:${grill.difficultyAxis}`;
    const trustUpdates: GrillResult['trustUpdates'] = [];
    const now = Date.now();

    for (const cid of grill.conceptsTested) {
      const updated = recordVerification(store, {
        personId,
        conceptId: cid,
        modality,
        result: interpretation.result,
        context: `Grill question (${grill.difficultyAxis}): ${grill.question}`,
        source: 'internal',
        timestamp: now,
      });

      trustUpdates.push({
        conceptId: cid,
        newLevel: updated.level,
        reason: `Grill ${grill.difficultyAxis}: ${interpretation.result}`,
      });
    }

    return {
      result: interpretation.result,
      trustUpdates,
      contestedDetected: interpretation.contestedDetected,
      implicitSignals: interpretation.implicitSignals,
    };
  }

  function hasPendingGrill(): boolean {
    return pendingGrill !== null;
  }

  function getPendingGrill(): PendingGrill | null {
    return pendingGrill;
  }

  return {
    startGrill,
    processGrillResponse,
    hasPendingGrill,
    getPendingGrill,
  };
}
