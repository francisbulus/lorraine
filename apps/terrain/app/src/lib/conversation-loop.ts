import type { Store } from '@engine/store/interface';
import type { TrustState, Modality } from '@engine/types';
import type { LLMProvider } from '@llm/types';
import type { ImplicitSignal } from '@engine-services/types';
import { extractImplicitSignals } from '@engine-services/extractImplicitSignals';
import { getTrustState } from '@engine/trust/query';
import { recordVerification } from '@engine/trust/record';
import { recordClaim } from '@engine/trust/claim';
import { applySignalWritePolicy } from './signal-write-policy';
import { extractClaims } from './claim-extractor';
import { SignalDeduplicator } from './signal-deduplicator';
import {
  createGrillEngine,
  detectGrillRequest,
  type GrillResult,
  type PendingGrill,
} from './grill-engine';
import {
  createExplainEngine,
  detectExplainRequest,
  detectDepthAdjustment,
  type ExplainResult,
} from './explain-engine';
import {
  createSandboxEngine,
  detectSandboxRequest,
  type SandboxRunResult,
} from './sandbox-engine';
import {
  createModeManager,
  type Mode,
  type TransitionSuggestion,
} from './mode-transition';
import type { ExecutionResult } from './code-executor';

export interface ConversationTurn {
  role: 'agent' | 'learner';
  content: string;
}

export interface TrustUpdateResult {
  conceptId: string;
  newLevel: string;
  reason: string;
}

export interface ConversationLoopResult {
  agentResponse: string;
  trustUpdates: TrustUpdateResult[];
  candidateSignals: ImplicitSignal[];
  grillStarted?: PendingGrill;
  grillResult?: GrillResult;
  mode: Mode;
  explainResult?: ExplainResult;
  sandboxStarted?: { conceptId: string };
  transitionSuggestion?: TransitionSuggestion;
}

export interface SandboxCodeResult {
  execution: ExecutionResult;
  annotation: string;
  suggestion: string | null;
  trustUpdates: TrustUpdateResult[];
}

export interface ConversationLoopConfig {
  store: Store;
  llm: LLMProvider;
  personId: string;
  conceptIds: string[];
}

const AGENT_SYSTEM_PROMPT = `You are the Terrain learning agent. You help learners understand concepts through natural conversation.

Rules:
- You are a mapmaker, not a guide. Show the terrain, don't prescribe paths.
- Never praise ("Great job!", "Well done!"). Reflect what the learner did without evaluating.
- Never create urgency. If trust has decayed, mention it neutrally.
- Never simplify unless asked. Acknowledge difficulty without removing it.
- Step back when the learner is exploring independently. Silence is respect.
- When the learner connects concepts across domains, prompt recognition, don't hand them the connection.
- Calibrate explanation depth to the learner's trust state on prerequisites.

Your responses should be concise, conversational, and honest. You speak in natural language.
The serif typography will distinguish your voice — you don't need to announce yourself.`;

export function createConversationLoop(config: ConversationLoopConfig) {
  const { store, llm, personId, conceptIds } = config;
  const history: ConversationTurn[] = [];
  const deduplicator = new SignalDeduplicator();
  const grillEngine = createGrillEngine({ store, llm, personId, conceptIds });
  const explainEngine = createExplainEngine({ store, llm, personId, conceptIds });
  const sandboxEngine = createSandboxEngine({ store, llm, personId, conceptIds });
  const modeManager = createModeManager();

  function buildTrustStates(now: number): Record<string, TrustState> {
    const trustStates: Record<string, TrustState> = {};
    for (const cid of conceptIds) {
      trustStates[cid] = getTrustState(store, {
        personId,
        conceptId: cid,
        asOfTimestamp: now,
      });
    }
    return trustStates;
  }

  async function extractAndWriteSignals(
    utterance: string,
    now: number,
    trustStates: Record<string, TrustState>
  ): Promise<{ trustUpdates: TrustUpdateResult[]; candidateSignals: ImplicitSignal[] }> {
    const signals = await extractImplicitSignals(llm, {
      utterance,
      conversationHistory: history.map((t) => `${t.role}: ${t.content}`),
      personId,
      currentTrustState: trustStates,
    });

    const { write: writeSignals, candidate: candidateSignals } =
      applySignalWritePolicy(signals, trustStates);

    const trustUpdates: TrustUpdateResult[] = [];
    for (const signal of writeSignals) {
      if (deduplicator.isDuplicate(signal, now)) continue;

      const modality = signalTypeToModality(signal.signalType);
      const result = signalTypeToResult(signal.signalType);

      const updated = recordVerification(store, {
        personId,
        conceptId: signal.conceptId,
        modality,
        result,
        context: signal.evidence,
        source: 'internal',
        timestamp: now,
      });

      trustStates[signal.conceptId] = updated;
      trustUpdates.push({
        conceptId: signal.conceptId,
        newLevel: updated.level,
        reason: signal.evidence,
      });
    }

    return { trustUpdates, candidateSignals };
  }

  async function extractAndRecordClaims(
    utterance: string,
    now: number
  ): Promise<void> {
    const claims = await extractClaims(llm, utterance, conceptIds);
    for (const claim of claims) {
      recordClaim(store, {
        personId,
        conceptId: claim.conceptId,
        selfReportedConfidence: claim.selfReportedConfidence,
        context: claim.context,
        timestamp: now,
      });
    }
  }

  async function processUtterance(utterance: string): Promise<ConversationLoopResult> {
    history.push({ role: 'learner', content: utterance });
    const now = Date.now();
    const trustStates = buildTrustStates(now);

    // Mode transition detection.
    const { learnerTransition, agentSuggestion } = modeManager.processUtterance(utterance);

    if (learnerTransition) {
      modeManager.setMode(learnerTransition);
      if (learnerTransition !== 'explain') explainEngine.endExplanation();
      if (learnerTransition !== 'sandbox') sandboxEngine.endSandbox();
    }

    // 1. Grill response takes highest priority — there's a pending question.
    if (grillEngine.hasPendingGrill()) {
      const result = await processGrillResponseTurn(utterance, trustStates);
      if (result.grillResult) {
        modeManager.recordGrillResult(result.grillResult.result);
      }
      modeManager.recordTurn();
      return appendTransitionSuggestion(
        { ...result, mode: modeManager.getCurrentMode() },
        agentSuggestion
      );
    }

    // 2. Grill request.
    const grillRequest = detectGrillRequest(utterance, conceptIds);
    if (learnerTransition === 'grill' || grillRequest) {
      if (modeManager.getCurrentMode() !== 'grill') modeManager.setMode('grill');
      const result = await startGrillTurn(grillRequest?.conceptId ?? null, trustStates);
      modeManager.recordTurn();
      return { ...result, mode: modeManager.getCurrentMode() };
    }

    // 3. Explain mode — depth adjustment or new explanation.
    const depthAdj = detectDepthAdjustment(utterance);
    const explainReq = detectExplainRequest(utterance, conceptIds);

    if (explainEngine.isExplaining() && depthAdj) {
      const result = await processExplainAdjustment(depthAdj);
      modeManager.recordTurn();
      return appendTransitionSuggestion(result, agentSuggestion);
    }

    if (explainReq) {
      if (modeManager.getCurrentMode() !== 'explain') modeManager.setMode('explain');
      const result = await processExplainStart(
        explainReq.conceptId,
        utterance,
        now,
        trustStates
      );
      modeManager.recordTurn();
      return appendTransitionSuggestion(result, agentSuggestion);
    }

    // 4. Sandbox request.
    const sandboxReq = detectSandboxRequest(utterance, conceptIds);
    if (sandboxReq && !sandboxEngine.isSandboxActive()) {
      modeManager.setMode('sandbox');
      const result = await processStartSandbox(
        sandboxReq.conceptId,
        utterance,
        now,
        trustStates
      );
      modeManager.recordTurn();
      return appendTransitionSuggestion(result, agentSuggestion);
    }

    // 5. Normal conversation flow.
    const result = await processNormalTurn(utterance, now, trustStates);
    for (const u of result.trustUpdates) {
      modeManager.addTrustUpdate(u.conceptId, u.newLevel);
    }
    modeManager.recordTurn();
    return appendTransitionSuggestion(result, agentSuggestion);
  }

  function appendTransitionSuggestion(
    result: ConversationLoopResult,
    suggestion: TransitionSuggestion | null
  ): ConversationLoopResult {
    if (!suggestion) return result;
    const updatedResponse = result.agentResponse + '\n\n' + suggestion.suggestion;
    // Update the last history entry to include the suggestion.
    if (history.length > 0 && history[history.length - 1].role === 'agent') {
      history[history.length - 1].content = updatedResponse;
    }
    return { ...result, agentResponse: updatedResponse, transitionSuggestion: suggestion };
  }

  async function processExplainStart(
    conceptId: string | null,
    utterance: string,
    now: number,
    trustStates: Record<string, TrustState>
  ): Promise<ConversationLoopResult> {
    // Extract signals from the explain request utterance.
    const { trustUpdates, candidateSignals } =
      await extractAndWriteSignals(utterance, now, trustStates);

    const targetConcept = conceptId ?? conceptIds[0];
    const explainResult = await explainEngine.startExplanation(targetConcept);
    modeManager.setCurrentConcept(targetConcept);

    history.push({ role: 'agent', content: explainResult.explanation });

    return {
      agentResponse: explainResult.explanation,
      trustUpdates,
      candidateSignals,
      mode: 'explain',
      explainResult,
    };
  }

  async function processExplainAdjustment(
    direction: 'simpler' | 'deeper'
  ): Promise<ConversationLoopResult> {
    const explainResult = await explainEngine.adjustExplanation(direction);

    history.push({ role: 'agent', content: explainResult.explanation });

    return {
      agentResponse: explainResult.explanation,
      trustUpdates: [],
      candidateSignals: [],
      mode: 'explain',
      explainResult,
    };
  }

  async function processStartSandbox(
    conceptId: string | null,
    utterance: string,
    now: number,
    trustStates: Record<string, TrustState>
  ): Promise<ConversationLoopResult> {
    const { trustUpdates, candidateSignals } =
      await extractAndWriteSignals(utterance, now, trustStates);

    const targetConcept = conceptId ?? conceptIds[0];
    sandboxEngine.startSandbox(targetConcept);
    modeManager.setCurrentConcept(targetConcept);

    const agentResponse = await generateAgentResponse(
      llm,
      history,
      trustStates,
      trustUpdates
    );
    history.push({ role: 'agent', content: agentResponse });

    return {
      agentResponse,
      trustUpdates,
      candidateSignals,
      mode: 'sandbox',
      sandboxStarted: { conceptId: targetConcept },
    };
  }

  async function processNormalTurn(
    utterance: string,
    now: number,
    trustStates: Record<string, TrustState>
  ): Promise<ConversationLoopResult> {
    const { trustUpdates, candidateSignals } =
      await extractAndWriteSignals(utterance, now, trustStates);

    await extractAndRecordClaims(utterance, now);

    const agentResponse = await generateAgentResponse(
      llm,
      history,
      trustStates,
      trustUpdates
    );

    history.push({ role: 'agent', content: agentResponse });

    return { agentResponse, trustUpdates, candidateSignals, mode: modeManager.getCurrentMode() };
  }

  async function startGrillTurn(
    conceptId: string | null,
    trustStates: Record<string, TrustState>
  ): Promise<ConversationLoopResult> {
    const pending = await grillEngine.startGrill(conceptId ?? undefined);

    history.push({ role: 'agent', content: pending.question });

    return {
      agentResponse: pending.question,
      trustUpdates: [],
      candidateSignals: [],
      grillStarted: pending,
      mode: modeManager.getCurrentMode(),
    };
  }

  async function processGrillResponseTurn(
    utterance: string,
    trustStates: Record<string, TrustState>
  ): Promise<ConversationLoopResult> {
    const grillResult = await grillEngine.processGrillResponse(utterance);

    const signals = await extractImplicitSignals(llm, {
      utterance,
      conversationHistory: history.map((t) => `${t.role}: ${t.content}`),
      personId,
      currentTrustState: trustStates,
    });
    const { write: writeSignals, candidate: candidateSignals } =
      applySignalWritePolicy(signals, trustStates);

    const now = Date.now();
    const allTrustUpdates = [...grillResult.trustUpdates];

    for (const signal of writeSignals) {
      if (deduplicator.isDuplicate(signal, now)) continue;

      const modality = signalTypeToModality(signal.signalType);
      const result = signalTypeToResult(signal.signalType);

      const updated = recordVerification(store, {
        personId,
        conceptId: signal.conceptId,
        modality,
        result,
        context: signal.evidence,
        source: 'internal',
        timestamp: now,
      });

      trustStates[signal.conceptId] = updated;
      allTrustUpdates.push({
        conceptId: signal.conceptId,
        newLevel: updated.level,
        reason: signal.evidence,
      });
    }

    const agentResponse = await generateAgentResponse(
      llm,
      history,
      trustStates,
      allTrustUpdates,
      grillResult
    );

    history.push({ role: 'agent', content: agentResponse });

    return {
      agentResponse,
      trustUpdates: allTrustUpdates,
      candidateSignals,
      grillResult,
      mode: modeManager.getCurrentMode(),
    };
  }

  async function runSandboxCode(code: string): Promise<SandboxCodeResult> {
    if (!sandboxEngine.isSandboxActive()) {
      throw new Error('No active sandbox');
    }

    const sandboxResult = await sandboxEngine.runCode(code);

    const now = Date.now();
    const trustStates = buildTrustStates(now);

    const { write: writeSignals } =
      applySignalWritePolicy(sandboxResult.signals, trustStates);

    const trustUpdates: TrustUpdateResult[] = [];
    for (const signal of writeSignals) {
      if (deduplicator.isDuplicate(signal, now)) continue;

      const modality = signalTypeToModality(signal.signalType);
      const result = signalTypeToResult(signal.signalType);

      const updated = recordVerification(store, {
        personId,
        conceptId: signal.conceptId,
        modality,
        result,
        context: signal.evidence,
        source: 'internal',
        timestamp: now,
      });

      trustStates[signal.conceptId] = updated;
      trustUpdates.push({
        conceptId: signal.conceptId,
        newLevel: updated.level,
        reason: signal.evidence,
      });
    }

    modeManager.recordSandboxResult(sandboxResult.execution.success);
    for (const u of trustUpdates) {
      modeManager.addTrustUpdate(u.conceptId, u.newLevel);
    }

    return {
      execution: sandboxResult.execution,
      annotation: sandboxResult.annotation,
      suggestion: sandboxResult.suggestion,
      trustUpdates,
    };
  }

  function endSandbox(): void {
    sandboxEngine.endSandbox();
    modeManager.setMode('conversation');
  }

  function endExplanation(): void {
    explainEngine.endExplanation();
    modeManager.setMode('conversation');
  }

  function getCurrentMode(): Mode {
    return modeManager.getCurrentMode();
  }

  function isSandboxActive(): boolean {
    return sandboxEngine.isSandboxActive();
  }

  function getSandboxConceptId(): string | null {
    return sandboxEngine.getSandboxState()?.conceptId ?? null;
  }

  async function startGrill(conceptId?: string): Promise<PendingGrill> {
    const pending = await grillEngine.startGrill(conceptId);
    history.push({ role: 'agent', content: pending.question });
    return pending;
  }

  function getHistory(): ConversationTurn[] {
    return [...history];
  }

  function hasPendingGrill(): boolean {
    return grillEngine.hasPendingGrill();
  }

  return {
    processUtterance,
    getHistory,
    startGrill,
    hasPendingGrill,
    runSandboxCode,
    endSandbox,
    endExplanation,
    getCurrentMode,
    isSandboxActive,
    getSandboxConceptId,
  };
}

async function generateAgentResponse(
  llm: LLMProvider,
  history: ConversationTurn[],
  trustStates: Record<string, TrustState>,
  recentUpdates: TrustUpdateResult[],
  grillResult?: GrillResult
): Promise<string> {
  const contextParts: string[] = [];

  // Add trust state context.
  const statesWithData = Object.entries(trustStates).filter(
    ([, s]) => s.level !== 'untested'
  );
  if (statesWithData.length > 0) {
    contextParts.push('Current trust state for this learner:');
    for (const [cid, state] of statesWithData) {
      contextParts.push(
        `- ${cid}: ${state.level} (confidence: ${state.decayedConfidence.toFixed(2)})`
      );
    }
    contextParts.push('');
  }

  // Note recent trust updates.
  if (recentUpdates.length > 0) {
    contextParts.push('Trust updates from this turn:');
    for (const u of recentUpdates) {
      contextParts.push(`- ${u.conceptId} → ${u.newLevel}`);
    }
    contextParts.push('');
  }

  // Add grill result context if present.
  if (grillResult) {
    contextParts.push(`Grill result: ${grillResult.result}`);
    if (grillResult.contestedDetected) {
      contextParts.push('Note: contested state detected — the learner showed understanding in some areas but clear gaps in others.');
    }
    contextParts.push('Respond naturally to the grill result. Reflect what the learner demonstrated or missed without praising or judging.');
    contextParts.push('');
  }

  // Build message history for LLM.
  const messages = history.map((t) => ({
    role: t.role === 'agent' ? ('assistant' as const) : ('user' as const),
    content: t.content,
  }));

  // Prepend context to the last user message.
  if (contextParts.length > 0 && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.role === 'user') {
      messages[messages.length - 1] = {
        ...last,
        content: `[Context for your response — not visible to learner]\n${contextParts.join('\n')}\n\n[Learner says]\n${last.content}`,
      };
    }
  }

  const response = await llm.complete(AGENT_SYSTEM_PROMPT, messages);
  return response.content;
}

function signalTypeToModality(
  signalType: ImplicitSignal['signalType']
): Modality {
  switch (signalType) {
    case 'correct_usage':
    case 'natural_connection_made':
    case 'sophistication_increase':
      return 'integrated:use';
    case 'incorrect_usage':
    case 'confusion_signal':
    case 'question_revealing_gap':
      return 'grill:recall';
    case 'self_correction':
      return 'integrated:use';
    default:
      return 'integrated:use';
  }
}

function signalTypeToResult(
  signalType: ImplicitSignal['signalType']
): 'demonstrated' | 'failed' | 'partial' {
  switch (signalType) {
    case 'correct_usage':
    case 'natural_connection_made':
    case 'sophistication_increase':
    case 'self_correction':
      return 'demonstrated';
    case 'incorrect_usage':
    case 'confusion_signal':
      return 'failed';
    case 'question_revealing_gap':
      return 'failed';
    default:
      return 'partial';
  }
}
