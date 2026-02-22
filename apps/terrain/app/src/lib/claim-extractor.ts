import type { LLMProvider } from '@llm/types';

export interface ExtractedClaim {
  conceptId: string;
  selfReportedConfidence: number;
  context: string;
}

const SYSTEM_PROMPT = `You extract explicit self-assessment claims from a learner's utterance.
A claim is when the learner explicitly states their belief about their own understanding.

Output valid JSON:
{
  "claims": [
    {
      "conceptId": "concept_id",
      "selfReportedConfidence": 0.0-1.0,
      "context": "what the learner said that constitutes the claim"
    }
  ]
}

Record a claim ONLY when the learner says things like:
- "I know this" / "I understand this" / "I've got this" → high confidence (0.8-1.0)
- "I don't know this" / "I'm lost" / "I don't understand" → low confidence (0.0-0.2)
- "I think I understand" / "I'm not sure" / "I'm pretty confident" → mid confidence (0.4-0.7)
- "I already know X" / "I've never seen X before" → explicit self-assessment

Do NOT record a claim when:
- The learner's tone sounds uncertain but they haven't said so
- The learner pauses or hesitates
- The learner asks a question (that's a gap signal, not a claim)
- The phrasing is ambiguous

If no explicit self-assessment is present, return an empty claims array.`;

export async function extractClaims(
  llm: LLMProvider,
  utterance: string,
  knownConceptIds: string[]
): Promise<ExtractedClaim[]> {
  const userMessage = [
    'Learner utterance:',
    utterance,
    '',
    'Known concepts in scope:',
    knownConceptIds.map(id => `- ${id}`).join('\n'),
    '',
    'Extract any explicit self-assessment claims.',
  ].join('\n');

  const response = await llm.complete(SYSTEM_PROMPT, [
    { role: 'user', content: userMessage },
  ]);

  return parseClaims(response.content, knownConceptIds);
}

function parseClaims(raw: string, knownConceptIds: string[]): ExtractedClaim[] {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as {
      claims?: Array<{
        conceptId?: string;
        selfReportedConfidence?: number;
        context?: string;
      }>;
    };

    const knownSet = new Set(knownConceptIds);

    return (parsed.claims ?? [])
      .filter(c =>
        c.conceptId &&
        knownSet.has(c.conceptId) &&
        typeof c.selfReportedConfidence === 'number'
      )
      .map(c => ({
        conceptId: c.conceptId!,
        selfReportedConfidence: Math.min(1, Math.max(0, c.selfReportedConfidence!)),
        context: c.context ?? '',
      }));
  } catch {
    return [];
  }
}
