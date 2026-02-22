// explainDecision — makes engine reasoning transparent.
// Any trust update, propagation, decay, contested detection, or calibration finding
// can be traced and explained.

import type { ExplainDecisionInput, ExplainDecisionResult } from '../types.js';
import type { Store } from '../store/interface.js';

export function explainDecision(
  store: Store,
  input: ExplainDecisionInput
): ExplainDecisionResult {
  const ctx = input.decisionContext;

  switch (input.decisionType) {
    case 'trust_update': {
      const conceptId = ctx.conceptId as string | undefined;
      const personId = ctx.personId as string | undefined;
      const previousLevel = ctx.previousLevel as string | undefined;
      const newLevel = ctx.newLevel as string | undefined;
      const confidence = ctx.confidence as number | undefined;

      const reasoning = buildTrustUpdateReasoning(store, conceptId, personId, previousLevel, newLevel, confidence);

      return {
        reasoning,
        trustInputs: {
          conceptId,
          personId,
          previousLevel,
          newLevel,
          confidence,
        },
        alternatives: [
          'Additional modality verification could strengthen confidence',
          'Cross-modality testing would provide deeper evidence',
        ],
        confidence: confidence ?? 0,
      };
    }

    case 'propagation_result': {
      const sourceConceptId = ctx.sourceConceptId as string | undefined;
      const targetConceptId = ctx.targetConceptId as string | undefined;
      const inferenceStrength = ctx.inferenceStrength as number | undefined;
      const depth = ctx.depth as number | undefined;

      return {
        reasoning: `Trust was propagated from concept "${sourceConceptId}" to "${targetConceptId}" ` +
          `with inference strength ${inferenceStrength?.toFixed(3) ?? 'unknown'} at depth ${depth ?? 'unknown'}. ` +
          `Propagation never produces verified trust — only inferred. ` +
          `Signal attenuates with distance (Rule 2) and failure propagates more aggressively (Rule 3).`,
        trustInputs: {
          sourceConceptId,
          targetConceptId,
          inferenceStrength,
          depth,
        },
        alternatives: [
          'Direct verification of the target concept would provide stronger evidence',
          'Verifying intermediate concepts would strengthen the inference chain',
        ],
        confidence: inferenceStrength ?? 0,
      };
    }

    case 'decay_result': {
      const conceptId = ctx.conceptId as string | undefined;
      const daysSinceVerified = ctx.daysSinceVerified as number | undefined;
      const previousConfidence = ctx.previousConfidence as number | undefined;
      const decayedConfidence = ctx.decayedConfidence as number | undefined;

      return {
        reasoning: `Confidence for concept "${conceptId}" decayed from ${previousConfidence?.toFixed(3) ?? 'unknown'} ` +
          `to ${decayedConfidence?.toFixed(3) ?? 'unknown'} over ${daysSinceVerified?.toFixed(1) ?? 'unknown'} days. ` +
          `Decay follows an Ebbinghaus-inspired exponential curve. Cross-modality verification ` +
          `and structural importance slow decay.`,
        trustInputs: {
          conceptId,
          daysSinceVerified,
          previousConfidence,
          decayedConfidence,
        },
        alternatives: [
          'Re-verification would reset the decay clock',
          'Cross-modality verification would slow future decay',
        ],
        confidence: decayedConfidence ?? 0,
      };
    }

    case 'contested_detection': {
      const conceptId = ctx.conceptId as string | undefined;
      const demonstratedCount = ctx.demonstratedCount as number | undefined;
      const failedCount = ctx.failedCount as number | undefined;

      return {
        reasoning: `Concept "${conceptId}" is contested: ${demonstratedCount ?? 0} demonstrated and ` +
          `${failedCount ?? 0} failed verification events. Contested state represents the boundary ` +
          `of understanding — the person has demonstrated knowledge in some contexts but failed in others. ` +
          `This is the most informationally rich trust state.`,
        trustInputs: {
          conceptId,
          demonstratedCount,
          failedCount,
        },
        alternatives: [
          'Additional verification in the failing contexts could resolve the contested state',
          'Transfer-modality testing could reveal the depth boundary',
        ],
        confidence: demonstratedCount && failedCount
          ? demonstratedCount / (demonstratedCount + failedCount)
          : 0,
      };
    }

    case 'calibration_finding': {
      const metric = ctx.metric as string | undefined;
      const value = ctx.value as number | undefined;

      return {
        reasoning: `Calibration analysis found ${metric ?? 'unknown metric'} at ${value?.toFixed(3) ?? 'unknown'}. ` +
          `The engine audits its own model quality to ensure predictions match outcomes. ` +
          `High surprise rates or bias indicate the model needs more evidence.`,
        trustInputs: {
          metric,
          value,
        },
        alternatives: [
          'Increase verification frequency to improve model accuracy',
          'Focus on concepts where predictions diverge from outcomes',
        ],
        confidence: value ?? 0,
      };
    }

    default:
      return {
        reasoning: `Unknown decision type: ${input.decisionType}`,
        trustInputs: ctx,
        alternatives: [],
        confidence: 0,
      };
  }
}

function buildTrustUpdateReasoning(
  store: Store,
  conceptId: string | undefined,
  personId: string | undefined,
  previousLevel: string | undefined,
  newLevel: string | undefined,
  confidence: number | undefined
): string {
  if (!conceptId || !personId) {
    return 'Trust was updated but context is incomplete.';
  }

  const history = store.getVerificationHistory(personId, conceptId);
  const modalities = new Set(history.map(e => e.modality));

  let reasoning = `Trust for concept "${conceptId}" changed from "${previousLevel ?? 'unknown'}" ` +
    `to "${newLevel ?? 'unknown'}" with confidence ${confidence?.toFixed(3) ?? 'unknown'}. `;

  reasoning += `Based on ${history.length} verification event(s) across ${modalities.size} modality/modalities. `;

  if (newLevel === 'verified') {
    reasoning += 'At least one demonstrated result with no failures.';
  } else if (newLevel === 'contested') {
    reasoning += 'Both demonstrated and failed results exist — boundary of understanding.';
  } else if (newLevel === 'inferred') {
    reasoning += 'Trust was inferred from related verified concepts, not directly demonstrated.';
  } else if (newLevel === 'untested') {
    reasoning += 'No successful demonstrations recorded.';
  }

  return reasoning;
}
