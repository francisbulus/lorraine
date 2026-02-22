import type { Store } from '@engine/store/interface';
import type { TrustState } from '@engine/types';
import type { LLMProvider } from '@llm/types';
import type { ImplicitSignal } from '@engine-services/types';
import { getTrustState } from '@engine/trust/query';
import { executeCode, type ExecutionResult } from './code-executor';

export interface SandboxRequest {
  conceptId: string | null;
}

export interface SandboxState {
  conceptId: string;
  active: boolean;
  runs: SandboxRun[];
}

export interface SandboxRun {
  code: string;
  result: ExecutionResult;
  annotation: string | null;
  signals: ImplicitSignal[];
  timestamp: number;
}

export interface SandboxRunResult {
  execution: ExecutionResult;
  annotation: string;
  signals: ImplicitSignal[];
  suggestion: string | null;
}

// Patterns for sandbox mode triggers.
const SANDBOX_PATTERNS = [
  /\bshow me in code\b/i,
  /\bcan I try\b/i,
  /\blet me experiment\b/i,
  /\blet me try\b/i,
  /\bcan I code\b/i,
  /\bshow me how to implement\b/i,
  /\blet me write\b/i,
  /\bin code\b/i,
];

const ANNOTATE_SYSTEM_PROMPT = `You are annotating code execution output for a learner. Explain what happened at the layers below the code they wrote.

Rules:
- Never praise. Reflect what happened, don't evaluate.
- Be concise — 2-3 sentences max.
- If the code failed, explain what went wrong at the language/runtime level.
- If the code succeeded, explain the mechanism underneath.
- If you can suggest an experiment that would deepen understanding, include it.
- Keep suggestions as questions: "What happens if you set X to 0? Try it."`;

const SIGNAL_SYSTEM_PROMPT = `Assess the learner's code execution for implicit trust signals. Output valid JSON:
{
  "signals": [
    {
      "conceptId": "concept_id",
      "signalType": "correct_usage" | "incorrect_usage" | "self_correction" | "sophistication_increase" | "natural_connection_made",
      "confidence": 0.0-1.0,
      "evidence": "what in the code shows this"
    }
  ],
  "suggestion": "optional experiment suggestion or null"
}

Signal guidance for sandbox:
- correct_usage without hints = strong verification signal (0.8+)
- debugging success = very strong signal (0.9+)
- hypothesis testing (trying variations) = transfer signal
- copy-paste with no modification = weak signal (0.3)
- syntax errors on basic constructs = potential gap signal`;

export function detectSandboxRequest(
  utterance: string,
  conceptIds: string[]
): SandboxRequest | null {
  const matches = SANDBOX_PATTERNS.some((p) => p.test(utterance));
  if (!matches) return null;

  const lower = utterance.toLowerCase();
  const matchedConcept = conceptIds.find((cid) =>
    lower.includes(cid.replace(/-/g, ' '))
  );

  return { conceptId: matchedConcept ?? null };
}

export function createSandboxEngine(config: {
  store: Store;
  llm: LLMProvider;
  personId: string;
  conceptIds: string[];
}) {
  const { store, llm, personId, conceptIds } = config;
  let sandboxState: SandboxState | null = null;

  function startSandbox(conceptId: string): SandboxState {
    sandboxState = {
      conceptId,
      active: true,
      runs: [],
    };
    return sandboxState;
  }

  async function runCode(code: string): Promise<SandboxRunResult> {
    if (!sandboxState) {
      throw new Error('No active sandbox');
    }

    const execution = await executeCode(code);

    // Generate annotation.
    const annotation = await generateAnnotation(
      sandboxState.conceptId,
      code,
      execution
    );

    // Extract implicit signals.
    const { signals, suggestion } = await extractSandboxSignals(
      sandboxState.conceptId,
      code,
      execution,
      sandboxState.runs
    );

    const run: SandboxRun = {
      code,
      result: execution,
      annotation,
      signals,
      timestamp: Date.now(),
    };

    sandboxState.runs.push(run);

    return { execution, annotation, signals, suggestion };
  }

  async function generateAnnotation(
    conceptId: string,
    code: string,
    execution: ExecutionResult
  ): Promise<string> {
    const ts = getTrustState(store, { personId, conceptId });
    const parts: string[] = [];
    parts.push(`Concept: ${conceptId}`);
    parts.push(`Learner trust level: ${ts.level}`);
    parts.push('');
    parts.push(`Code:\n${code}`);
    parts.push('');
    parts.push(`Execution result: ${execution.success ? 'success' : 'error'}`);
    if (execution.output) parts.push(`Output:\n${execution.output}`);
    if (execution.error) parts.push(`Error:\n${execution.error}`);

    const response = await llm.complete(ANNOTATE_SYSTEM_PROMPT, [
      { role: 'user', content: parts.join('\n') },
    ]);

    return response.content;
  }

  async function extractSandboxSignals(
    conceptId: string,
    code: string,
    execution: ExecutionResult,
    previousRuns: SandboxRun[]
  ): Promise<{ signals: ImplicitSignal[]; suggestion: string | null }> {
    const parts: string[] = [];
    parts.push(`Concept: ${conceptId}`);
    parts.push(`Available concepts: ${conceptIds.join(', ')}`);
    parts.push('');
    parts.push(`Code:\n${code}`);
    parts.push('');
    parts.push(`Result: ${execution.success ? 'success' : 'error'}`);
    if (execution.output) parts.push(`Output: ${execution.output}`);
    if (execution.error) parts.push(`Error: ${execution.error}`);

    if (previousRuns.length > 0) {
      parts.push('');
      parts.push(`Previous runs: ${previousRuns.length}`);
      parts.push(`Previous results: ${previousRuns.map((r) => r.result.success ? 'success' : 'error').join(', ')}`);
    }

    const response = await llm.complete(SIGNAL_SYSTEM_PROMPT, [
      { role: 'user', content: parts.join('\n') },
    ]);

    return parseSandboxSignals(response.content, conceptIds);
  }

  function isSandboxActive(): boolean {
    return sandboxState !== null && sandboxState.active;
  }

  function getSandboxState(): SandboxState | null {
    return sandboxState;
  }

  function endSandbox(): void {
    if (sandboxState) {
      sandboxState.active = false;
      sandboxState = null;
    }
  }

  return {
    startSandbox,
    runCode,
    isSandboxActive,
    getSandboxState,
    endSandbox,
  };
}

const VALID_SIGNAL_TYPES = [
  'correct_usage',
  'incorrect_usage',
  'self_correction',
  'sophistication_increase',
  'natural_connection_made',
] as const;

function parseSandboxSignals(
  raw: string,
  conceptIds: string[]
): { signals: ImplicitSignal[]; suggestion: string | null } {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]) as {
      signals?: Array<{
        conceptId?: string;
        signalType?: string;
        confidence?: number;
        evidence?: string;
      }>;
      suggestion?: string | null;
    };

    const signals: ImplicitSignal[] = (parsed.signals ?? [])
      .filter(
        (s) =>
          s.conceptId &&
          s.signalType &&
          (VALID_SIGNAL_TYPES as readonly string[]).includes(s.signalType) &&
          conceptIds.includes(s.conceptId)
      )
      .map((s) => ({
        conceptId: s.conceptId!,
        signalType: s.signalType as ImplicitSignal['signalType'],
        confidence: typeof s.confidence === 'number'
          ? Math.min(1, Math.max(0, s.confidence))
          : 0.5,
        evidence: s.evidence ?? '',
      }));

    return {
      signals,
      suggestion: parsed.suggestion ?? null,
    };
  } catch {
    return { signals: [], suggestion: null };
  }
}
