import { getTrustState } from '../engine.js';
import type { Store, TrustState, TrustLevel } from '../engine.js';
import type { BundleDefinition, BundleRequirement } from '../types.js';

const LEVEL_ORDER: Record<TrustLevel, number> = {
  untested: 0,
  contested: 1,
  inferred: 2,
  verified: 3,
};

export interface GateResult {
  requirement: BundleRequirement;
  state: TrustState;
  passed: boolean;
  reason: string;
}

export interface ReadinessResult {
  person: string;
  bundle: string;
  gates: GateResult[];
  passed: boolean;
  passedCount: number;
  totalCount: number;
}

export function evaluateReadiness(
  store: Store,
  personId: string,
  bundleName: string,
  bundle: BundleDefinition,
): ReadinessResult {
  const gates: GateResult[] = [];

  for (const req of bundle.required) {
    const state = getTrustState(store, { personId, conceptId: req.concept });
    const gate = evaluateGate(req, state);
    gates.push(gate);
  }

  const passedCount = gates.filter((g) => g.passed).length;
  return {
    person: personId,
    bundle: bundleName,
    gates,
    passed: passedCount === gates.length,
    passedCount,
    totalCount: gates.length,
  };
}

function evaluateGate(req: BundleRequirement, state: TrustState): GateResult {
  const requiredLevel = LEVEL_ORDER[req.minLevel] ?? 0;
  const actualLevel = LEVEL_ORDER[state.level] ?? 0;

  // Level check
  if (actualLevel < requiredLevel) {
    const reason = state.level === 'untested'
      ? 'untested'
      : state.level === 'contested'
        ? 'contested (requires resolution)'
        : `${state.level} (requires ${req.minLevel})`;
    return { requirement: req, state, passed: false, reason };
  }

  // Confidence check (only for inferred requirements with minConfidence)
  if (req.minConfidence !== undefined && state.decayedConfidence < req.minConfidence) {
    return {
      requirement: req,
      state,
      passed: false,
      reason: `confidence ${state.decayedConfidence.toFixed(2)} below minimum ${req.minConfidence}`,
    };
  }

  return { requirement: req, state, passed: true, reason: 'meets requirement' };
}

export function suggestAction(gate: GateResult): string {
  const concept = gate.requirement.concept;
  if (gate.state.level === 'untested') {
    return `mos challenge --person <person> --concept ${concept}`;
  }
  if (gate.state.level === 'contested') {
    return `mos challenge --person <person> --concept ${concept}  (resolve conflicting evidence)`;
  }
  if (gate.state.level === 'inferred') {
    return `mos challenge --person <person> --concept ${concept}  (upgrade from inferred to verified)`;
  }
  return `mos why --person <person> --concept ${concept}  (investigate low confidence)`;
}
