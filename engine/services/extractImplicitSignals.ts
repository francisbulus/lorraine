// extractImplicitSignals — mines natural interaction for trust signals via LLM.
// The richest verification comes from integrated use — concepts appearing naturally
// in reasoning without scaffolding. This function extracts those signals.

import type { LLMProvider } from '../../llm/types.js';
import type {
  ExtractImplicitSignalsInput,
  ImplicitSignal,
  ImplicitSignalType,
} from './types.js';

const SYSTEM_PROMPT = `You are an implicit signal extractor for the Lorraine epistemic trust engine.
Your job is to mine natural conversation for trust signals — evidence of understanding or gaps in understanding that appear naturally, without explicit testing.

You must output valid JSON with this structure:
{
  "signals": [
    {
      "conceptId": "concept_id",
      "signalType": "correct_usage" | "incorrect_usage" | "question_revealing_gap" | "self_correction" | "sophistication_increase" | "confusion_signal" | "natural_connection_made",
      "confidence": 0.0-1.0,
      "evidence": "specific quote or reasoning from the utterance"
    }
  ]
}

Signal types:
- correct_usage: person uses a concept correctly in passing (not prompted)
- incorrect_usage: person uses a concept incorrectly
- question_revealing_gap: question reveals a missing prerequisite or misunderstanding
- self_correction: person catches and corrects their own error
- sophistication_increase: person's reasoning shows deepening understanding
- confusion_signal: person expresses or shows confusion
- natural_connection_made: person connects concepts that weren't prompted together

Rules:
- High confidence (>= 0.85) only when evidence includes reasoning, not just keywords
- "used the word TCP" is NOT evidence; "correctly explained why retransmission needs acknowledgments" IS evidence
- Failure signals (incorrect_usage, question_revealing_gap, confusion_signal) are always valuable
- self_correction is strong evidence regardless of the concept's current state
- Do not fabricate signals — if there's nothing to extract, return an empty signals array
- Evidence must quote or closely reference what the person actually said`;

const VALID_SIGNAL_TYPES: ImplicitSignalType[] = [
  'correct_usage',
  'incorrect_usage',
  'question_revealing_gap',
  'self_correction',
  'sophistication_increase',
  'confusion_signal',
  'natural_connection_made',
];

export async function extractImplicitSignals(
  llm: LLMProvider,
  input: ExtractImplicitSignalsInput
): Promise<ImplicitSignal[]> {
  const userMessage = buildUserMessage(input);
  const response = await llm.complete(SYSTEM_PROMPT, [{ role: 'user', content: userMessage }]);
  return parseImplicitSignalsResponse(response.content);
}

function buildUserMessage(input: ExtractImplicitSignalsInput): string {
  const parts: string[] = [];

  parts.push('Utterance to analyze:');
  parts.push(input.utterance);

  if (input.conversationHistory.length > 0) {
    parts.push('');
    parts.push('Recent conversation history (most recent last):');
    const recent = input.conversationHistory.slice(-5);
    for (const turn of recent) {
      parts.push(`- ${turn}`);
    }
  }

  const conceptsWithState = Object.entries(input.currentTrustState);
  if (conceptsWithState.length > 0) {
    parts.push('');
    parts.push('Known concepts and current trust levels:');
    for (const [conceptId, state] of conceptsWithState) {
      parts.push(`- ${conceptId}: ${state.level} (confidence: ${state.decayedConfidence})`);
    }
  }

  parts.push('');
  parts.push('Extract any implicit trust signals from the utterance.');

  return parts.join('\n');
}

function parseImplicitSignalsResponse(raw: string): ImplicitSignal[] {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      signals?: Array<{
        conceptId?: string;
        signalType?: string;
        confidence?: number;
        evidence?: string;
      }>;
    };

    return (parsed.signals ?? [])
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
  } catch {
    return [];
  }
}
