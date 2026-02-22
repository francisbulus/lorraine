// interpretResponse — translates a person's response into structured trust updates via LLM.
// The services layer interprets; the core records. This function does NOT write to the core.
// The application calls recordVerification after reviewing the interpretation.

import type { LLMProvider } from '../../llm/types.js';
import type { Store } from '../store/interface.js';
import type {
  InterpretResponseInput,
  InterpretResponseResult,
  ImplicitSignal,
  ImplicitSignalType,
} from './types.js';
import { getTrustState } from '../trust/query.js';

const SYSTEM_PROMPT = `You are a response interpreter for the Lorraine epistemic trust engine.
Your job is to assess a person's response to a verification prompt and determine what it reveals about their understanding.

You must output valid JSON with this structure:
{
  "result": "demonstrated" | "failed" | "partial",
  "trustUpdates": [
    {
      "conceptId": "concept_id",
      "evidence": "what specifically in the response shows this"
    }
  ],
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
- Be honest about failure — failure is the most informative event (Invariant 4)
- Never inflate assessment to make the person feel better (Invariant 2)
- "demonstrated" means they showed clear understanding — not just keywords
- "partial" means they showed some understanding but with gaps
- "failed" means they did not demonstrate understanding
- Evidence must be specific — cite what they actually said
- Implicit signals are bonus observations beyond the main assessment
- contestedDetected is true if the response shows understanding in some aspects but clear failure in others`;

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

export async function interpretResponse(
  store: Store,
  llm: LLMProvider,
  input: InterpretResponseInput
): Promise<InterpretResponseResult> {
  // Get the original verification event for context.
  const verificationEvent = store.getVerificationEvent(input.verificationId);

  const parts: string[] = [];
  if (verificationEvent) {
    parts.push(`Original verification prompt (concept: ${verificationEvent.conceptId}):`);
    parts.push(verificationEvent.context);
    parts.push('');
  }
  parts.push(`Person's response (modality: ${input.responseModality}):`);
  parts.push(input.response);

  const response = await llm.complete(SYSTEM_PROMPT, [{ role: 'user', content: parts.join('\n') }]);

  return parseInterpretResponse(response.content, store, input);
}

function parseInterpretResponse(
  raw: string,
  store: Store,
  input: InterpretResponseInput
): InterpretResponseResult {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      result?: string;
      trustUpdates?: Array<{ conceptId?: string; evidence?: string }>;
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

    const trustUpdates = (parsed.trustUpdates ?? [])
      .filter(u => u.conceptId && u.evidence)
      .map(u => {
        const prevState = getTrustState(store, {
          personId: input.personId,
          conceptId: u.conceptId!,
        });
        return {
          conceptId: u.conceptId!,
          previousState: prevState.level === 'untested' ? null : prevState,
          newState: prevState, // Actual new state is computed by core after recording
          evidence: u.evidence!,
        };
      });

    const implicitSignals: ImplicitSignal[] = (parsed.implicitSignals ?? [])
      .filter(s =>
        s.conceptId &&
        s.signalType &&
        VALID_SIGNAL_TYPES.includes(s.signalType as ImplicitSignalType)
      )
      .map(s => ({
        conceptId: s.conceptId!,
        signalType: s.signalType as ImplicitSignalType,
        confidence: typeof s.confidence === 'number'
          ? Math.min(1, Math.max(0, s.confidence))
          : 0.5,
        evidence: s.evidence ?? '',
      }));

    return {
      result,
      trustUpdates,
      contestedDetected: parsed.contestedDetected ?? false,
      implicitSignals,
    };
  } catch {
    // Fallback: partial with no details.
    return {
      result: 'partial',
      trustUpdates: [],
      contestedDetected: false,
      implicitSignals: [],
    };
  }
}
