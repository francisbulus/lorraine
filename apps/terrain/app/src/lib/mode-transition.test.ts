import { describe, it, expect } from 'vitest';
import {
  detectLearnerTransition,
  suggestTransition,
  createModeManager,
  type ModeContext,
  type Mode,
} from './mode-transition';

function makeContext(overrides: Partial<ModeContext> = {}): ModeContext {
  return {
    currentMode: 'conversation',
    currentConceptId: null,
    recentTrustUpdates: [],
    turnsSinceLastMode: 0,
    ...overrides,
  };
}

describe('detectLearnerTransition', () => {
  it('detects sandbox transition from "show me in code"', () => {
    expect(detectLearnerTransition('show me in code', 'explain')).toBe('sandbox');
  });

  it('detects sandbox transition from "can I try that"', () => {
    expect(detectLearnerTransition('can I try that?', 'explain')).toBe('sandbox');
  });

  it('detects explain transition from "what is"', () => {
    expect(detectLearnerTransition('what is TCP?', 'conversation')).toBe('explain');
  });

  it('detects grill transition from "test me"', () => {
    expect(detectLearnerTransition('test me on this', 'explain')).toBe('grill');
  });

  it('detects write transition from "let me explain"', () => {
    expect(detectLearnerTransition('let me explain this back to you', 'grill')).toBe('write');
  });

  it('returns null for non-transition utterances', () => {
    expect(detectLearnerTransition('I see, interesting', 'conversation')).toBeNull();
  });

  it('does not suggest same mode as current', () => {
    expect(detectLearnerTransition('show me in code', 'sandbox')).toBeNull();
  });
});

describe('suggestTransition', () => {
  it('suggests sandbox after explain with enough turns', () => {
    const result = suggestTransition(makeContext({
      currentMode: 'explain',
      turnsSinceLastMode: 3,
    }));
    expect(result).not.toBeNull();
    expect(result!.to).toBe('sandbox');
    expect(result!.suggestion).toContain('code');
  });

  it('suggests explain after sandbox failure', () => {
    const result = suggestTransition(makeContext({
      currentMode: 'sandbox',
      lastSandboxSuccess: false,
    }));
    expect(result).not.toBeNull();
    expect(result!.to).toBe('explain');
  });

  it('suggests grill after successful sandbox', () => {
    const result = suggestTransition(makeContext({
      currentMode: 'sandbox',
      lastSandboxSuccess: true,
      turnsSinceLastMode: 2,
    }));
    expect(result).not.toBeNull();
    expect(result!.to).toBe('grill');
  });

  it('suggests sandbox after failed grill', () => {
    const result = suggestTransition(makeContext({
      currentMode: 'grill',
      lastGrillResult: 'failed',
    }));
    expect(result).not.toBeNull();
    expect(result!.to).toBe('sandbox');
  });

  it('suggests explain after partial grill', () => {
    const result = suggestTransition(makeContext({
      currentMode: 'grill',
      lastGrillResult: 'partial',
    }));
    expect(result).not.toBeNull();
    expect(result!.to).toBe('explain');
  });

  it('suggests write after demonstrated grill', () => {
    const result = suggestTransition(makeContext({
      currentMode: 'grill',
      lastGrillResult: 'demonstrated',
      turnsSinceLastMode: 1,
    }));
    expect(result).not.toBeNull();
    expect(result!.to).toBe('write');
  });

  it('returns null when no transition applies', () => {
    const result = suggestTransition(makeContext({
      currentMode: 'conversation',
      turnsSinceLastMode: 0,
    }));
    expect(result).toBeNull();
  });

  it('suggests explain from conversation with concept', () => {
    const result = suggestTransition(makeContext({
      currentMode: 'conversation',
      currentConceptId: 'tcp-basics',
      turnsSinceLastMode: 3,
    }));
    expect(result).not.toBeNull();
    expect(result!.to).toBe('explain');
  });
});

describe('createModeManager', () => {
  it('starts in conversation mode', () => {
    const manager = createModeManager();
    expect(manager.getCurrentMode()).toBe('conversation');
  });

  it('tracks mode changes', () => {
    const manager = createModeManager();
    manager.setMode('explain');
    expect(manager.getCurrentMode()).toBe('explain');
  });

  it('resets turn count on mode change', () => {
    const manager = createModeManager();
    manager.recordTurn();
    manager.recordTurn();
    manager.setMode('explain');
    const ctx = manager.getContext();
    expect(ctx.turnsSinceLastMode).toBe(0);
  });

  it('increments turn count', () => {
    const manager = createModeManager();
    manager.recordTurn();
    manager.recordTurn();
    expect(manager.getContext().turnsSinceLastMode).toBe(2);
  });

  it('detects learner transition in processUtterance', () => {
    const manager = createModeManager();
    manager.setMode('explain');
    const result = manager.processUtterance('show me in code');
    expect(result.learnerTransition).toBe('sandbox');
    expect(result.agentSuggestion).toBeNull();
  });

  it('suggests agent transition when no learner transition', () => {
    const manager = createModeManager();
    manager.setMode('explain');
    manager.recordTurn();
    manager.recordTurn();
    manager.recordTurn();
    const result = manager.processUtterance('OK, I think I understand');
    expect(result.learnerTransition).toBeNull();
    expect(result.agentSuggestion).not.toBeNull();
    expect(result.agentSuggestion!.to).toBe('sandbox');
  });

  it('tracks grill results', () => {
    const manager = createModeManager();
    manager.setMode('grill');
    manager.recordGrillResult('failed');
    const ctx = manager.getContext();
    expect(ctx.lastGrillResult).toBe('failed');
  });

  it('tracks sandbox results', () => {
    const manager = createModeManager();
    manager.setMode('sandbox');
    manager.recordSandboxResult(true);
    const ctx = manager.getContext();
    expect(ctx.lastSandboxSuccess).toBe(true);
  });

  it('tracks trust updates with cap', () => {
    const manager = createModeManager();
    for (let i = 0; i < 15; i++) {
      manager.addTrustUpdate(`concept-${i}`, 'verified');
    }
    const ctx = manager.getContext();
    expect(ctx.recentTrustUpdates.length).toBe(10);
  });

  it('clears result state on mode change', () => {
    const manager = createModeManager();
    manager.setMode('grill');
    manager.recordGrillResult('demonstrated');
    manager.setMode('sandbox');
    const ctx = manager.getContext();
    expect(ctx.lastGrillResult).toBeUndefined();
  });
});
