import type { Store, StoredTrustState } from '../store/interface.js';
import type {
  Modality,
  TrustLevel,
  VerificationEvent,
  PropagationResult,
} from '../types.js';
import {
  CROSS_MODALITY_CONFIDENCE_BONUS,
  FAILURE_PROPAGATION_MULTIPLIER,
  PROPAGATION_ATTENUATION,
  PROPAGATION_THRESHOLD,
} from '../types.js';
import { computeTrustFromHistory } from './scoring.js';

export type ProjectionScopeType = 'component' | 'concept';

export interface ProjectionScope {
  scopeType: ProjectionScopeType;
  personId: string;
  conceptIds: string[];
  scopeKey: string;
}

export interface ScopeFreshness {
  scope: ProjectionScope;
  stale: boolean;
  staleReasons: string[];
  scopeEventSeq: number;
  checkpointEventSeq: number;
  snapshotEventSeq: number | null;
  snapshotVersions: {
    graphVersion: number | null;
    modelVersion: number | null;
    modalityTaxonomyVersion: number | null;
  };
  currentVersions: {
    graphVersion: number;
    modelVersion: number;
    modalityTaxonomyVersion: number;
  };
}

export interface ProjectScopeInput {
  scopeType: ProjectionScopeType;
  personId: string;
  conceptId: string;
  reason: string;
  minEventSeq?: number;
}

export interface ProjectScopeResult {
  scope: ProjectionScope;
  appliedEventSeq: number;
  changedConceptIds: string[];
  statesWritten: number;
}

interface MutableTrust {
  level: TrustLevel;
  confidence: number;
  lastVerified: number | null;
  inferredFrom: Set<string>;
  modalitiesTested: Set<Modality>;
}

function normalizeConceptIds(conceptIds: string[]): string[] {
  return [...new Set(conceptIds)].sort();
}

export function getConnectedComponentConceptIds(store: Store, anchorConceptId: string): string[] {
  const visited = new Set<string>();
  const queue: string[] = [anchorConceptId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const outgoing = store.getEdgesFrom(current);
    for (const edge of outgoing) {
      if (!visited.has(edge.toConceptId)) queue.push(edge.toConceptId);
    }

    const incoming = store.getEdgesTo(current);
    for (const edge of incoming) {
      if (!visited.has(edge.fromConceptId)) queue.push(edge.fromConceptId);
    }
  }

  return normalizeConceptIds(visited.size > 0 ? [...visited] : [anchorConceptId]);
}

export function buildScopeKey(
  scopeType: ProjectionScopeType,
  personId: string,
  conceptIds: string[]
): string {
  return `scope:${scopeType}:person:${personId}:concepts:${normalizeConceptIds(conceptIds).join('|')}`;
}

export function getProjectionScope(
  store: Store,
  scopeType: ProjectionScopeType,
  personId: string,
  conceptId: string
): ProjectionScope {
  const conceptIds = scopeType === 'component'
    ? getConnectedComponentConceptIds(store, conceptId)
    : normalizeConceptIds([conceptId]);

  return {
    scopeType,
    personId,
    conceptIds,
    scopeKey: buildScopeKey(scopeType, personId, conceptIds),
  };
}

export function getScopeFreshness(
  store: Store,
  scope: ProjectionScope,
  targetConceptId: string
): ScopeFreshness {
  const versions = store.getVersionMetadata();
  const snapshot = store.getTrustState(scope.personId, targetConceptId);
  const scopeSnapshots = store.getTrustStatesForConcepts(scope.personId, scope.conceptIds);
  const scopeEventSeq = store.getLatestEventSeqForScope(scope.personId, scope.conceptIds);
  const checkpointEventSeq = store.getProjectionCheckpoint(scope.scopeKey) ?? 0;

  const staleReasons: string[] = [];

  if (checkpointEventSeq < scopeEventSeq) {
    staleReasons.push('checkpoint_behind_scope');
  }

  if (snapshot && (snapshot.derivedFromEventSeq ?? 0) < scopeEventSeq) {
    staleReasons.push('snapshot_behind_scope');
  }

  const scopeMaxSnapshotSeq = scopeSnapshots.reduce(
    (maxSeq, row) => Math.max(maxSeq, row.derivedFromEventSeq ?? 0),
    0
  );

  if (scopeSnapshots.length > 0 && scopeMaxSnapshotSeq < scopeEventSeq) {
    staleReasons.push('scope_snapshot_behind_scope');
  }

  if (scopeSnapshots.length === 0 && scopeEventSeq > 0) {
    staleReasons.push('missing_scope_snapshots');
  }

  const scopeHasVersionMismatch = scopeSnapshots.some((row) =>
    row.graphVersion !== versions.graphVersion
    || row.modelVersion !== versions.modelVersion
    || row.modalityTaxonomyVersion !== versions.modalityTaxonomyVersion
  );

  if (scopeHasVersionMismatch) {
    staleReasons.push('scope_version_mismatch');
  }

  if (snapshot && snapshot.graphVersion !== versions.graphVersion) {
    staleReasons.push('graph_version_mismatch');
  }

  if (snapshot && snapshot.modelVersion !== versions.modelVersion) {
    staleReasons.push('model_version_mismatch');
  }

  if (snapshot && snapshot.modalityTaxonomyVersion !== versions.modalityTaxonomyVersion) {
    staleReasons.push('modality_taxonomy_version_mismatch');
  }

  return {
    scope,
    stale: staleReasons.length > 0,
    staleReasons,
    scopeEventSeq,
    checkpointEventSeq,
    snapshotEventSeq: snapshot?.derivedFromEventSeq ?? (
      scopeSnapshots.length > 0 ? scopeMaxSnapshotSeq : null
    ),
    snapshotVersions: {
      graphVersion: snapshot?.graphVersion ?? null,
      modelVersion: snapshot?.modelVersion ?? null,
      modalityTaxonomyVersion: snapshot?.modalityTaxonomyVersion ?? null,
    },
    currentVersions: {
      graphVersion: versions.graphVersion,
      modelVersion: versions.modelVersion,
      modalityTaxonomyVersion: versions.modalityTaxonomyVersion,
    },
  };
}

function createUntestedState(): MutableTrust {
  return {
    level: 'untested',
    confidence: 0,
    lastVerified: null,
    inferredFrom: new Set<string>(),
    modalitiesTested: new Set<Modality>(),
  };
}

function getOrCreateState(
  states: Map<string, MutableTrust>,
  conceptId: string
): MutableTrust {
  const existing = states.get(conceptId);
  if (existing) return existing;
  const fresh = createUntestedState();
  states.set(conceptId, fresh);
  return fresh;
}

function propagateFromEvent(
  store: Store,
  allowedConcepts: Set<string>,
  states: Map<string, MutableTrust>,
  sourceConceptId: string,
  verificationEvent: VerificationEvent
): void {
  const visited = new Set<string>();
  const sourceState = states.get(sourceConceptId);
  if (!sourceState) return;

  const modalityBonus = Math.max(
    0,
    (sourceState.modalitiesTested.size - 1) * CROSS_MODALITY_CONFIDENCE_BONUS
  );

  const isFailed = verificationEvent.result === 'failed';

  let baseSignal: number;
  if (isFailed) {
    baseSignal = sourceState.confidence * FAILURE_PROPAGATION_MULTIPLIER;
  } else if (verificationEvent.result === 'demonstrated') {
    baseSignal = sourceState.confidence + modalityBonus;
  } else {
    baseSignal = sourceState.confidence * 0.5 + modalityBonus;
  }

  function propagateStep(
    conceptId: string,
    signalStrength: number,
    depth: number
  ): void {
    visited.add(conceptId);
    const edges = store.getEdgesFrom(conceptId);

    for (const edge of edges) {
      const targetId = edge.toConceptId;
      if (!allowedConcepts.has(targetId) || visited.has(targetId)) continue;

      const attenuatedSignal = signalStrength
        * edge.inferenceStrength
        * Math.pow(PROPAGATION_ATTENUATION, depth - 1);

      if (attenuatedSignal < PROPAGATION_THRESHOLD) continue;

      const currentState = getOrCreateState(states, targetId);
      const previousLevel: TrustLevel = currentState.level;
      const previousConfidence = currentState.confidence;

      let newLevel: TrustLevel;
      let newConfidence: number;

      if (isFailed) {
        newConfidence = Math.max(0, previousConfidence - attenuatedSignal);

        if (previousLevel === 'verified' && newConfidence < previousConfidence) {
          newLevel = 'contested';
        } else if (previousLevel === 'inferred') {
          newLevel = newConfidence > 0 ? 'inferred' : 'untested';
        } else {
          newLevel = previousLevel;
        }
      } else {
        newConfidence = Math.min(1.0, Math.max(previousConfidence, attenuatedSignal));

        if (previousLevel === 'untested' || previousLevel === 'inferred') {
          newLevel = 'inferred';
        } else {
          newLevel = previousLevel;
        }
      }

      if (newLevel !== previousLevel || Math.abs(newConfidence - previousConfidence) > 0.001) {
        currentState.level = newLevel;
        currentState.confidence = newConfidence;

        if (!isFailed) {
          currentState.inferredFrom.add(conceptId);
        }

        propagateStep(targetId, attenuatedSignal, depth + 1);
      }
    }
  }

  propagateStep(sourceConceptId, baseSignal, 1);
}

function shouldPersistState(state: MutableTrust, verificationHistoryLength: number): boolean {
  if (verificationHistoryLength > 0) return true;
  if (state.level !== 'untested') return true;
  if (state.confidence > 0) return true;
  if (state.lastVerified !== null) return true;
  if (state.inferredFrom.size > 0) return true;
  if (state.modalitiesTested.size > 0) return true;
  return false;
}

function normalizeStateForCompare(state: StoredTrustState | null): string {
  if (!state) return 'null';
  return JSON.stringify({
    conceptId: state.conceptId,
    personId: state.personId,
    level: state.level,
    confidence: Number(state.confidence.toFixed(6)),
    lastVerified: state.lastVerified,
    inferredFrom: [...state.inferredFrom].sort(),
    modalitiesTested: [...state.modalitiesTested].sort(),
    derivedFromEventSeq: state.derivedFromEventSeq,
    graphVersion: state.graphVersion,
    modelVersion: state.modelVersion,
    modalityTaxonomyVersion: state.modalityTaxonomyVersion,
  });
}

export function projectScope(store: Store, input: ProjectScopeInput): ProjectScopeResult {
  const scope = getProjectionScope(store, input.scopeType, input.personId, input.conceptId);
  const allowedConcepts = new Set(scope.conceptIds);
  const now = Date.now();

  const previousRows = new Map(
    store.getTrustStatesForConcepts(scope.personId, scope.conceptIds)
      .map((s) => [s.conceptId, s])
  );

  const historiesByConcept = new Map<string, VerificationEvent[]>();
  for (const conceptId of scope.conceptIds) {
    historiesByConcept.set(conceptId, []);
  }

  const allEvents: VerificationEvent[] = [];
  for (const conceptId of scope.conceptIds) {
    const history = store.getVerificationHistory(scope.personId, conceptId);
    allEvents.push(...history);
  }

  allEvents.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    const aSeq = a.eventSeq ?? 0;
    const bSeq = b.eventSeq ?? 0;
    if (aSeq !== bSeq) return aSeq - bSeq;
    return a.id.localeCompare(b.id);
  });

  const states = new Map<string, MutableTrust>();
  for (const conceptId of scope.conceptIds) {
    states.set(conceptId, createUntestedState());
  }

  for (const event of allEvents) {
    const currentHistory = historiesByConcept.get(event.conceptId);
    if (!currentHistory) continue;

    currentHistory.push(event);

    const state = getOrCreateState(states, event.conceptId);
    const computed = computeTrustFromHistory(currentHistory, {
      level: state.level,
      confidence: state.confidence,
      inferredFrom: [...state.inferredFrom],
    });

    const modalities = new Set<Modality>(currentHistory.map((h) => h.modality));

    state.level = computed.level;
    state.confidence = computed.confidence;
    state.lastVerified = currentHistory[currentHistory.length - 1]?.timestamp ?? null;
    state.modalitiesTested = modalities;

    propagateFromEvent(store, allowedConcepts, states, event.conceptId, event);
  }

  const scopeEventSeq = store.getLatestEventSeqForScope(scope.personId, scope.conceptIds);
  const versions = store.getVersionMetadata();

  const finalRows = new Map<string, StoredTrustState>();
  for (const conceptId of scope.conceptIds) {
    const state = states.get(conceptId) ?? createUntestedState();
    const historyLength = (historiesByConcept.get(conceptId) ?? []).length;

    if (!shouldPersistState(state, historyLength)) continue;

    finalRows.set(conceptId, {
      personId: scope.personId,
      conceptId,
      level: state.level,
      confidence: state.confidence,
      lastVerified: state.lastVerified,
      inferredFrom: [...state.inferredFrom].sort(),
      modalitiesTested: [...state.modalitiesTested].sort(),
      derivedFromEventSeq: scopeEventSeq,
      graphVersion: versions.graphVersion,
      modelVersion: versions.modelVersion,
      modalityTaxonomyVersion: versions.modalityTaxonomyVersion,
      computedAt: now,
    });
  }

  store.withTransaction(() => {
    store.deleteTrustStatesForConcepts(scope.personId, scope.conceptIds);

    for (const state of finalRows.values()) {
      store.upsertTrustState(state);
    }

    store.upsertProjectionCheckpoint(scope.scopeKey, scopeEventSeq, now);
    store.markProjectionJobsCompleted(scope.scopeKey, scopeEventSeq);
  });

  const changedConceptIds: string[] = [];
  for (const conceptId of scope.conceptIds) {
    const before = previousRows.get(conceptId) ?? null;
    const after = finalRows.get(conceptId) ?? null;

    if (normalizeStateForCompare(before) !== normalizeStateForCompare(after)) {
      changedConceptIds.push(conceptId);
    }
  }

  return {
    scope,
    appliedEventSeq: scopeEventSeq,
    changedConceptIds,
    statesWritten: finalRows.size,
  };
}

export function describePropagationChanges(
  before: Map<string, StoredTrustState>,
  after: Map<string, StoredTrustState>,
  sourceConceptId: string,
  verificationEvent: VerificationEvent
): PropagationResult[] {
  const conceptIds = new Set<string>([
    ...before.keys(),
    ...after.keys(),
  ]);

  const results: PropagationResult[] = [];

  for (const conceptId of conceptIds) {
    if (conceptId === sourceConceptId) continue;

    const prev = before.get(conceptId);
    const next = after.get(conceptId);

    const previousLevel: TrustLevel = prev?.level ?? 'untested';
    const previousConfidence = prev?.confidence ?? 0;
    const newLevel: TrustLevel = next?.level ?? 'untested';
    const newConfidence = next?.confidence ?? 0;

    if (previousLevel === newLevel && Math.abs(previousConfidence - newConfidence) <= 0.001) {
      continue;
    }

    results.push({
      conceptId,
      previousLevel,
      previousConfidence,
      newLevel,
      newConfidence,
      inferenceStrength: Math.max(0, newConfidence - previousConfidence),
      reason: verificationEvent.result === 'failed'
        ? `Recomputed after failure on ${sourceConceptId}`
        : `Recomputed inference after verification on ${sourceConceptId}`,
    });
  }

  return results;
}
