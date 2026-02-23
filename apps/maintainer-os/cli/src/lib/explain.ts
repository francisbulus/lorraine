import chalk from 'chalk';
import { getTrustState, explainDecision } from '../engine.js';
import type { Store, TrustState, VerificationEvent, ClaimEvent } from '../engine.js';
import { colorForLevel, formatConfidence, formatTimeAgo } from './formatters.js';

export interface ExplanationData {
  person: string;
  concept: string;
  state: TrustState;
  explanation: { reasoning: string; trustInputs: Record<string, unknown>; alternatives: string[]; confidence: number };
}

export function buildExplanation(store: Store, personId: string, conceptId: string): ExplanationData {
  const state = getTrustState(store, { personId, conceptId });
  const explanation = explainDecision(store, {
    decisionType: state.level === 'contested' ? 'contested_detection' : 'trust_update',
    decisionContext: { personId, conceptId },
  });

  return { person: personId, concept: conceptId, state, explanation };
}

export function formatExplanation(data: ExplanationData): string {
  const { state, explanation } = data;
  const color = colorForLevel(state.level);
  const lines: string[] = [];

  lines.push(`${chalk.bold('Trust Explanation:')} ${data.person} → ${data.concept}`);
  lines.push(`Level: ${color(state.level)} | Confidence: ${formatConfidence(state.confidence)}`);
  if (state.confidence !== state.decayedConfidence) {
    lines.push(`Decayed confidence: ${formatConfidence(state.decayedConfidence)}`);
  }
  lines.push('');

  // Evidence chain
  if (state.verificationHistory.length > 0) {
    lines.push(chalk.bold('Evidence chain:'));
    for (const [i, event] of state.verificationHistory.entries()) {
      lines.push(formatVerificationLine(i + 1, event));
      if (event.context) {
        lines.push(`     ${chalk.dim(`"${event.context}"`)}`);
      }
    }
    lines.push('');
  }

  // Claim history
  if (state.claimHistory.length > 0) {
    lines.push(chalk.bold('Claims:'));
    for (const claim of state.claimHistory) {
      lines.push(formatClaimLine(claim));
    }
    lines.push('');
  }

  // Contested explanation
  if (state.level === 'contested') {
    lines.push(chalk.yellow('Conflicting evidence across modalities produces CONTESTED state.'));
    lines.push('');
  }

  // Inference chain
  if (state.inferredFrom.length > 0) {
    lines.push(chalk.bold('Inferred from:'));
    for (const src of state.inferredFrom) {
      lines.push(`  → ${src}`);
    }
    lines.push('');
  }

  // Calibration gap
  if (state.calibrationGap !== null) {
    lines.push(chalk.dim(`Calibration gap: ${state.calibrationGap > 0 ? '+' : ''}${state.calibrationGap.toFixed(2)} (${state.calibrationGap > 0 ? 'overclaiming' : 'underclaiming'})`));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function formatVerificationLine(num: number, event: VerificationEvent): string {
  const date = new Date(event.timestamp).toISOString().slice(0, 10);
  const resultColor = event.result === 'demonstrated' ? chalk.green : event.result === 'failed' ? chalk.red : chalk.yellow;
  return `  ${num}. ${chalk.dim(`[${date}]`)} ${event.modality} → ${resultColor(event.result)}`;
}

function formatClaimLine(claim: ClaimEvent): string {
  const date = new Date(claim.timestamp).toISOString().slice(0, 10);
  return `  ${chalk.dim(`[${date}]`)} self-reported confidence: ${formatConfidence(claim.selfReportedConfidence)} ${chalk.dim(`"${claim.context}"`)}`;
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
