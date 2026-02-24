import chalk from 'chalk';
import { getTrustState, getGraph, explainDecision } from '../engine.js';
import type { Store, TrustState, TrustLevel, VerificationEvent, ClaimEvent } from '../engine.js';
import {
  colorForLevel,
  colorForLevelGradient,
  renderBar,
  renderFrame,
  renderInnerSeparator,
  renderCalibrationLine,
  formatConfidence,
  formatTimeAgo,
  computeConceptWidth,
  padName,
  titleCase,
  BAR_WIDTH,
} from './formatters.js';

export interface InferenceInfo {
  conceptId: string;
  level: TrustLevel;
  decayedConfidence: number;
  edgeType: string;
  inferenceStrength: number;
}

export interface ExplanationData {
  person: string;
  concept: string;
  state: TrustState;
  explanation: { reasoning: string; trustInputs: Record<string, unknown>; alternatives: string[]; confidence: number };
  inferences: InferenceInfo[];
}

export function buildExplanation(store: Store, personId: string, conceptId: string): ExplanationData {
  const state = getTrustState(store, { personId, conceptId });
  const explanation = explainDecision(store, {
    decisionType: state.level === 'contested' ? 'contested_detection' : 'trust_update',
    decisionContext: { personId, conceptId },
  });

  // Find downstream inferences from this concept
  const inferences: InferenceInfo[] = [];
  try {
    const graph = getGraph(store, { conceptIds: [conceptId], depth: 1 });
    for (const edge of graph.edges) {
      if (edge.from === conceptId) {
        const targetState = getTrustState(store, { personId, conceptId: edge.to });
        inferences.push({
          conceptId: edge.to,
          level: targetState.level,
          decayedConfidence: targetState.decayedConfidence,
          edgeType: edge.type,
          inferenceStrength: edge.inferenceStrength,
        });
      }
    }
  } catch {
    // Graph lookup may fail if no graph loaded; skip inference section
  }

  return { person: personId, concept: conceptId, state, explanation, inferences };
}

export function formatExplanation(data: ExplanationData): string {
  const { state } = data;
  const color = colorForLevel(state.level);
  const contentLines: string[] = [];

  // Level and confidence header
  contentLines.push(`Level: ${color(state.level.toUpperCase())}`);
  if (state.confidence !== state.decayedConfidence) {
    contentLines.push(`Confidence: ${formatConfidence(state.confidence)} → ${formatConfidence(state.decayedConfidence)} (after decay)`);
  } else {
    contentLines.push(`Confidence: ${formatConfidence(state.confidence)}`);
  }

  // Evidence chain
  if (state.verificationHistory.length > 0) {
    contentLines.push('');
    contentLines.push('═'.repeat(50));
    contentLines.push('');
    contentLines.push(chalk.bold('EVIDENCE'));

    for (const [i, event] of state.verificationHistory.entries()) {
      contentLines.push('');
      const date = new Date(event.timestamp).toISOString().slice(0, 10);
      const resultColor = event.result === 'demonstrated' ? chalk.green : event.result === 'failed' ? chalk.red : chalk.yellow;
      contentLines.push(`  ${i + 1} │ ${chalk.dim(date)} │ ${event.modality}`);
      contentLines.push(`    │ ${' '.repeat(10)} │ ${resultColor(event.result)}`);
      if (event.context) {
        contentLines.push(`    │`);
        contentLines.push(`    │  ${chalk.dim(`"${event.context}"`)}`);
      }
    }
  }

  // Claim history
  if (state.claimHistory.length > 0) {
    contentLines.push('');
    contentLines.push(renderInnerSeparator());
    contentLines.push('');
    contentLines.push(chalk.bold('CLAIMS'));

    for (const claim of state.claimHistory) {
      contentLines.push('');
      const date = new Date(claim.timestamp).toISOString().slice(0, 10);
      contentLines.push(`  ${chalk.dim(date)} │ self-reported: ${formatConfidence(claim.selfReportedConfidence)}`);
      if (claim.context) {
        contentLines.push(`${' '.repeat(13)}│ ${chalk.dim(`"${claim.context}"`)}`);
      }
    }
  }

  // Contested explanation
  if (state.level === 'contested') {
    contentLines.push('');
    contentLines.push(renderInnerSeparator());
    contentLines.push('');
    contentLines.push(chalk.redBright('Conflicting evidence across modalities produces CONTESTED state.'));
  }

  // Inference chain (what this concept was inferred from)
  if (state.inferredFrom.length > 0) {
    contentLines.push('');
    contentLines.push(renderInnerSeparator());
    contentLines.push('');
    contentLines.push(chalk.bold('INFERRED FROM'));
    for (const src of state.inferredFrom) {
      contentLines.push(`  → ${src}`);
    }
  }

  // Downstream inferences from this concept
  if (data.inferences.length > 0) {
    contentLines.push('');
    contentLines.push(renderInnerSeparator());
    contentLines.push('');
    contentLines.push(chalk.bold('DOWNSTREAM'));

    const infWidth = computeConceptWidth(data.inferences.map((inf) => inf.conceptId));
    for (const inf of data.inferences) {
      contentLines.push('');
      const infColor = colorForLevelGradient(inf.level, inf.decayedConfidence);
      const bar = renderBar(inf.decayedConfidence, BAR_WIDTH, infColor);
      const conf = formatConfidence(inf.decayedConfidence);
      contentLines.push(`  → ${infColor(padName(inf.conceptId, infWidth))} ${bar}  ${conf}`);
      contentLines.push(`    ${chalk.dim(`inferred via ${inf.edgeType} (weight: ${inf.inferenceStrength})`)}`);
    }
  }

  // Calibration gap
  if (state.calibrationGap !== null) {
    contentLines.push('');
    contentLines.push(renderInnerSeparator());
    contentLines.push('');
    contentLines.push(chalk.bold('CALIBRATION'));
    contentLines.push('');

    const claimConf = state.claimHistory.length > 0
      ? state.claimHistory[state.claimHistory.length - 1]!.selfReportedConfidence
      : 0;
    const evidenceConf = state.confidence;

    contentLines.push(`  Claim: ${formatConfidence(claimConf)}`);
    contentLines.push(`  Evidence: ${formatConfidence(evidenceConf)}`);
    const gapSign = state.calibrationGap > 0 ? '+' : '';
    const gapLabel = state.calibrationGap > 0 ? 'overclaiming' : 'underclaiming';
    contentLines.push(`  Gap: ${gapSign}${state.calibrationGap.toFixed(2)} (${gapLabel})`);

    const calLines = renderCalibrationLine(claimConf, evidenceConf);
    for (const cl of calLines) {
      contentLines.push(`       ${chalk.dim(cl)}`);
    }
  }

  contentLines.push('');

  const frame = renderFrame('Explanation', `${titleCase(data.person)} → ${titleCase(data.concept)}`, contentLines);
  return frame.join('\n');
}

export function explanationToJson(data: ExplanationData): unknown {
  return {
    person: data.person,
    concept: data.concept,
    level: data.state.level,
    confidence: data.state.confidence,
    decayedConfidence: data.state.decayedConfidence,
    verificationHistory: data.state.verificationHistory.map((v) => ({
      timestamp: new Date(v.timestamp).toISOString(),
      modality: v.modality,
      result: v.result,
      context: v.context,
      source: v.source,
    })),
    claimHistory: data.state.claimHistory.map((c) => ({
      timestamp: new Date(c.timestamp).toISOString(),
      selfReportedConfidence: c.selfReportedConfidence,
      context: c.context,
    })),
    inferredFrom: data.state.inferredFrom,
    modalitiesTested: data.state.modalitiesTested,
    calibrationGap: data.state.calibrationGap,
    explanation: data.explanation,
  };
}
