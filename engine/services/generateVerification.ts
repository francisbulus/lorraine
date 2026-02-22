// generateVerification — generates a verification interaction via LLM.
// Reads trust state and graph from core, asks the LLM to produce a verification prompt
// calibrated to the person's current state and the application context.

import type { LLMProvider } from '../../llm/types.js';
import type { Store } from '../store/interface.js';
import type { TrustState, GetGraphResult } from '../types.js';
import type {
  GenerateVerificationInput,
  GenerateVerificationResult,
  VerificationType,
} from './types.js';
import { getTrustState } from '../trust/query.js';
import { getGraph } from '../graph/query.js';

const SYSTEM_PROMPT = `You are a verification generator for the Lorraine epistemic trust engine.
Your job is to create a verification interaction that tests a person's understanding of a concept.

You must output valid JSON with this structure:
{
  "type": "grill_question" | "sandbox_prompt" | "write_prompt" | "sketch_prompt" | "conversational_probe",
  "content": "the verification prompt to present to the person",
  "expectedSignals": ["concept_ids that should show signal if person demonstrates understanding"],
  "conceptsTested": ["concept_ids directly tested by this verification"]
}

Rules:
- Never create leading questions designed to boost scores (Invariant 5)
- Never artificially lower difficulty (Invariant 5)
- Failure is valid and informative — do not avoid questions the person might fail
- Calibrate difficulty to the person's current trust state
- The difficultyAxis determines what kind of understanding to test:
  - recall: can they retrieve the fact?
  - inference: can they reason about relationships?
  - transfer: can they apply in a novel context?
  - discrimination: can they distinguish similar concepts?
- The applicationContext determines the framing:
  - learning: conversational, Socratic, exploratory
  - hiring: professional, precise, assessment-focused
  - certification: standardized, clear criteria
  - onboarding: practical, role-relevant`;

const VALID_TYPES: VerificationType[] = [
  'grill_question',
  'sandbox_prompt',
  'write_prompt',
  'sketch_prompt',
  'conversational_probe',
];

export async function generateVerification(
  store: Store,
  llm: LLMProvider,
  input: GenerateVerificationInput
): Promise<GenerateVerificationResult> {
  // Read current trust state for context.
  const trustState = input.conceptId
    ? getTrustState(store, { personId: input.personId, conceptId: input.conceptId })
    : null;

  // Read concept info and nearby graph for context.
  const graphContext = input.conceptId
    ? getGraph(store, { conceptIds: [input.conceptId], depth: 1, personId: input.personId })
    : null;

  const userMessage = buildUserMessage(input, trustState, graphContext);
  const response = await llm.complete(SYSTEM_PROMPT, [{ role: 'user', content: userMessage }]);

  return parseVerificationResponse(response.content, input.conceptId);
}

function buildUserMessage(
  input: GenerateVerificationInput,
  trustState: TrustState | null,
  graphContext: GetGraphResult | null
): string {
  const parts: string[] = [];

  parts.push(`Application context: ${input.applicationContext}`);
  parts.push(`Reason for verification: ${input.reason}`);

  if (input.difficultyAxis) {
    parts.push(`Difficulty axis: ${input.difficultyAxis}`);
  }
  if (input.targetModality) {
    parts.push(`Target modality: ${input.targetModality}`);
  }

  if (trustState) {
    parts.push('');
    parts.push('Current trust state for the concept:');
    parts.push(`- Level: ${trustState.level}`);
    parts.push(`- Confidence: ${trustState.confidence}`);
    parts.push(`- Decayed confidence: ${trustState.decayedConfidence}`);
    parts.push(`- Modalities tested: ${trustState.modalitiesTested.join(', ') || 'none'}`);
    if (trustState.calibrationGap !== null) {
      parts.push(`- Calibration gap: ${trustState.calibrationGap}`);
    }
  }

  if (graphContext) {
    parts.push('');
    parts.push('Concepts in context:');
    for (const concept of graphContext.concepts) {
      parts.push(`- ${concept.id}: ${concept.name} — ${concept.description}`);
    }
    if (graphContext.edges.length > 0) {
      parts.push('');
      parts.push('Relationships:');
      for (const edge of graphContext.edges) {
        parts.push(`- ${edge.from} → ${edge.to} (${edge.type}, strength: ${edge.inferenceStrength})`);
      }
    }
  }

  parts.push('');
  parts.push('Generate a verification interaction.');

  return parts.join('\n');
}

function parseVerificationResponse(
  raw: string,
  conceptId?: string
): GenerateVerificationResult {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      type?: string;
      content?: string;
      expectedSignals?: string[];
      conceptsTested?: string[];
    };

    const type = VALID_TYPES.includes(parsed.type as VerificationType)
      ? (parsed.type as VerificationType)
      : 'grill_question';

    return {
      type,
      content: parsed.content ?? raw,
      expectedSignals: Array.isArray(parsed.expectedSignals) ? parsed.expectedSignals : [],
      conceptsTested: Array.isArray(parsed.conceptsTested)
        ? parsed.conceptsTested
        : (conceptId ? [conceptId] : []),
    };
  } catch {
    // Fallback: treat the whole response as the content.
    return {
      type: 'grill_question',
      content: raw,
      expectedSignals: [],
      conceptsTested: conceptId ? [conceptId] : [],
    };
  }
}
