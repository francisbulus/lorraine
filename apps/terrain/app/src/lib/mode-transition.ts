import type { TrustState } from '@engine/types';

export type Mode = 'conversation' | 'explain' | 'sandbox' | 'grill' | 'write';

export interface TransitionSuggestion {
  from: Mode;
  to: Mode;
  suggestion: string;
  reason: string;
}

export interface ModeContext {
  currentMode: Mode;
  currentConceptId: string | null;
  recentTrustUpdates: Array<{ conceptId: string; newLevel: string }>;
  lastGrillResult?: 'demonstrated' | 'failed' | 'partial';
  lastSandboxSuccess?: boolean;
  turnsSinceLastMode: number;
}

// Learner-initiated transition patterns (these override agent suggestions).
const LEARNER_TRANSITION_PATTERNS: Array<{
  to: Mode;
  patterns: RegExp[];
}> = [
  // Write must come before explain — "let me explain" is a write trigger, not an explain request.
  {
    to: 'write',
    patterns: [
      /\blet me explain\b/i,
      /\bI'll explain\b/i,
      /\blet me write\b/i,
      /\bI want to explain\b/i,
    ],
  },
  {
    to: 'sandbox',
    patterns: [
      /\bshow me in code\b/i,
      /\bcan I try\b/i,
      /\blet me experiment\b/i,
      /\blet me try\b/i,
      /\bin code\b/i,
    ],
  },
  {
    to: 'explain',
    patterns: [
      /\bwhat is\b/i,
      /\bhow does\b/i,
      /\bexplain\b/i,
      /\bwhat are\b/i,
      /\btell me about\b/i,
    ],
  },
  {
    to: 'grill',
    patterns: [
      /\btest me\b/i,
      /\bquiz me\b/i,
      /\bgrill me\b/i,
      /\bcheck my understanding\b/i,
    ],
  },
];

// Agent-suggested transitions based on context.
const TRANSITION_RULES: Array<{
  from: Mode;
  to: Mode;
  condition: (ctx: ModeContext) => boolean;
  suggestion: string;
  reason: string;
}> = [
  // Explain → Sandbox: learner might be ready to experiment.
  {
    from: 'explain',
    to: 'sandbox',
    condition: (ctx) => ctx.turnsSinceLastMode >= 3,
    suggestion: 'Want to see this in code?',
    reason: 'explanation_complete',
  },
  // Explain → Grill: after explanation, check understanding.
  {
    from: 'explain',
    to: 'grill',
    condition: (ctx) => ctx.turnsSinceLastMode >= 4,
    suggestion: 'Mind if I check how that landed?',
    reason: 'verify_after_explain',
  },
  // Sandbox → Explain: sandbox error may indicate a gap.
  {
    from: 'sandbox',
    to: 'explain',
    condition: (ctx) => ctx.lastSandboxSuccess === false,
    suggestion: 'Want me to walk through what happened there?',
    reason: 'sandbox_difficulty',
  },
  // Sandbox → Grill: successful sandbox, verify the principle.
  {
    from: 'sandbox',
    to: 'grill',
    condition: (ctx) => ctx.lastSandboxSuccess === true && ctx.turnsSinceLastMode >= 2,
    suggestion: 'You got that working. Can you explain the principle behind it?',
    reason: 'verify_after_sandbox',
  },
  // Grill → Sandbox: failed grill on practical concept.
  {
    from: 'grill',
    to: 'sandbox',
    condition: (ctx) => ctx.lastGrillResult === 'failed',
    suggestion: 'Want to try approaching this from the code side?',
    reason: 'practical_after_grill_failure',
  },
  // Grill → Explain: partial grill result, might need more context.
  {
    from: 'grill',
    to: 'explain',
    condition: (ctx) => ctx.lastGrillResult === 'partial',
    suggestion: 'There are some gaps there. Want me to fill in the picture?',
    reason: 'explain_after_partial',
  },
  // Conversation → Explain: ongoing conversation, agent senses a concept.
  {
    from: 'conversation',
    to: 'explain',
    condition: (ctx) => ctx.currentConceptId !== null && ctx.turnsSinceLastMode >= 3,
    suggestion: 'Want me to unpack that more carefully?',
    reason: 'concept_detected',
  },
  // Any → Write: after demonstrated understanding.
  {
    from: 'grill',
    to: 'write',
    condition: (ctx) => ctx.lastGrillResult === 'demonstrated' && ctx.turnsSinceLastMode >= 1,
    suggestion: 'Try explaining this back to me in your own words.',
    reason: 'write_after_demonstrated',
  },
];

export function detectLearnerTransition(
  utterance: string,
  currentMode: Mode
): Mode | null {
  for (const rule of LEARNER_TRANSITION_PATTERNS) {
    if (rule.to === currentMode) continue;
    if (rule.patterns.some((p) => p.test(utterance))) {
      return rule.to;
    }
  }
  return null;
}

export function suggestTransition(
  context: ModeContext
): TransitionSuggestion | null {
  for (const rule of TRANSITION_RULES) {
    if (rule.from !== context.currentMode) continue;
    if (rule.condition(context)) {
      return {
        from: rule.from,
        to: rule.to,
        suggestion: rule.suggestion,
        reason: rule.reason,
      };
    }
  }
  return null;
}

export function createModeManager() {
  let currentMode: Mode = 'conversation';
  let turnsSinceLastMode = 0;
  let currentConceptId: string | null = null;
  let lastGrillResult: 'demonstrated' | 'failed' | 'partial' | undefined;
  let lastSandboxSuccess: boolean | undefined;
  let recentTrustUpdates: Array<{ conceptId: string; newLevel: string }> = [];

  function getContext(): ModeContext {
    return {
      currentMode,
      currentConceptId,
      recentTrustUpdates: [...recentTrustUpdates],
      lastGrillResult,
      lastSandboxSuccess,
      turnsSinceLastMode,
    };
  }

  function setMode(mode: Mode): void {
    if (mode !== currentMode) {
      currentMode = mode;
      turnsSinceLastMode = 0;
      lastGrillResult = undefined;
      lastSandboxSuccess = undefined;
    }
  }

  function recordTurn(): void {
    turnsSinceLastMode++;
  }

  function setCurrentConcept(conceptId: string | null): void {
    currentConceptId = conceptId;
  }

  function recordGrillResult(result: 'demonstrated' | 'failed' | 'partial'): void {
    lastGrillResult = result;
  }

  function recordSandboxResult(success: boolean): void {
    lastSandboxSuccess = success;
  }

  function addTrustUpdate(conceptId: string, newLevel: string): void {
    recentTrustUpdates.push({ conceptId, newLevel });
    if (recentTrustUpdates.length > 10) {
      recentTrustUpdates = recentTrustUpdates.slice(-10);
    }
  }

  function getCurrentMode(): Mode {
    return currentMode;
  }

  function processUtterance(utterance: string): {
    learnerTransition: Mode | null;
    agentSuggestion: TransitionSuggestion | null;
  } {
    const learnerTransition = detectLearnerTransition(utterance, currentMode);
    const agentSuggestion = learnerTransition ? null : suggestTransition(getContext());
    return { learnerTransition, agentSuggestion };
  }

  return {
    getContext,
    setMode,
    recordTurn,
    setCurrentConcept,
    recordGrillResult,
    recordSandboxResult,
    addTrustUpdate,
    getCurrentMode,
    processUtterance,
  };
}
