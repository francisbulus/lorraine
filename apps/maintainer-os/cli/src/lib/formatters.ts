import chalk from 'chalk';
import type { TrustLevel, TrustState, Modality } from '../engine.js';

export function colorForLevel(level: TrustLevel): chalk.ChalkInstance {
  switch (level) {
    case 'verified': return chalk.green;
    case 'inferred': return chalk.yellow;
    case 'contested': return chalk.yellow;
    case 'untested': return chalk.dim;
  }
}

export function iconForLevel(level: TrustLevel): string {
  switch (level) {
    case 'verified': return chalk.green('✓');
    case 'inferred': return chalk.yellow('~');
    case 'contested': return chalk.yellow('⚡');
    case 'untested': return chalk.dim('·');
  }
}

export function formatConfidence(confidence: number): string {
  return confidence.toFixed(2);
}

export function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export function formatModalities(modalities: Modality[]): string {
  return modalities.join(', ');
}

export interface GroupedTrustStates {
  verified: TrustState[];
  inferred: TrustState[];
  contested: TrustState[];
  untested: TrustState[];
}

export function groupByLevel(states: TrustState[]): GroupedTrustStates {
  const groups: GroupedTrustStates = {
    verified: [],
    inferred: [],
    contested: [],
    untested: [],
  };

  for (const state of states) {
    groups[state.level].push(state);
  }

  // Sort within groups: by confidence descending
  for (const level of ['verified', 'inferred', 'contested'] as const) {
    groups[level].sort((a, b) => b.confidence - a.confidence);
  }

  return groups;
}

export function formatStatusLine(state: TrustState): string {
  const icon = iconForLevel(state.level);
  const name = chalk.bold(state.conceptId.padEnd(26));
  const color = colorForLevel(state.level);

  switch (state.level) {
    case 'verified':
      return `  ${icon} ${name} ${color(formatConfidence(state.decayedConfidence))}  ${state.level} ${chalk.dim(formatTimeAgo(state.lastVerified))}  ${chalk.dim(formatModalities(state.modalitiesTested))}`;
    case 'inferred':
      return `  ${icon} ${name} ${color(formatConfidence(state.decayedConfidence))}  inferred from ${state.inferredFrom.join(', ')}`;
    case 'contested':
      return `  ${icon} ${name} ${color(formatConfidence(state.decayedConfidence))}  ${summarizeConflict(state)}`;
    case 'untested':
      return `  ${icon} ${name}`;
  }
}

function summarizeConflict(state: TrustState): string {
  const results = state.verificationHistory.map((v) => v.result);
  const unique = [...new Set(results)];
  return `${unique.join(' + ')} (conflicting evidence)`;
}

export function formatCalibrationSummary(states: TrustState[]): string | null {
  const withClaims = states.filter((s) => s.calibrationGap !== null);
  if (withClaims.length === 0) return null;

  const avgGap = withClaims.reduce((sum, s) => sum + Math.abs(s.calibrationGap!), 0) / withClaims.length;
  const accuracy = Math.round((1 - avgGap) * 100);

  const staleCount = states.filter((s) => {
    if (!s.lastVerified) return false;
    return (Date.now() - s.lastVerified) > 60 * 24 * 60 * 60 * 1000; // 60 days
  }).length;
  const stalePercent = states.length > 0 ? Math.round((staleCount / states.length) * 100) : 0;

  return `Calibration: ${accuracy}% prediction accuracy, ${stalePercent}% stale`;
}
