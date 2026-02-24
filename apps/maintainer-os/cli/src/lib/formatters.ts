import chalk from 'chalk';
import type { TrustLevel, TrustState, Modality } from '../engine.js';

// Layout constants
export const CONCEPT_COL = 24;
export const BAR_WIDTH = 10;
export const FRAME_WIDTH = 58;

// Raw icon characters for each trust level
export const LEVEL_ICONS: Record<TrustLevel, string> = {
  verified: '✓',
  inferred: '~',
  contested: '⚡',
  untested: '·',
};

export function colorForLevel(level: TrustLevel): chalk.ChalkInstance {
  switch (level) {
    case 'verified': return chalk.green;
    case 'inferred': return chalk.yellow;
    case 'contested': return chalk.yellow;
    case 'untested': return chalk.dim;
  }
}

export function colorForLevelGradient(level: TrustLevel, decayedConfidence: number): chalk.ChalkInstance {
  switch (level) {
    case 'verified':
      if (decayedConfidence > 0.7) return chalk.green;
      if (decayedConfidence >= 0.5) return chalk.green.dim;
      return chalk.dim;
    case 'inferred':
      if (decayedConfidence > 0.5) return chalk.yellowBright;
      if (decayedConfidence >= 0.25) return chalk.yellow.dim;
      return chalk.dim;
    case 'contested':
      return chalk.redBright;
    case 'untested':
      return chalk.dim;
  }
}

export function iconForLevel(level: TrustLevel): string {
  switch (level) {
    case 'verified': return chalk.green('✓');
    case 'inferred': return chalk.yellow('~');
    case 'contested': return chalk.redBright('⚡');
    case 'untested': return chalk.dim('·');
  }
}

export function iconForLevelGradient(level: TrustLevel, decayedConfidence: number): string {
  const color = colorForLevelGradient(level, decayedConfidence);
  return color(LEVEL_ICONS[level]);
}

export function renderBar(value: number, width: number = BAR_WIDTH, colorFn?: chalk.ChalkInstance): string {
  const clamped = Math.max(0, Math.min(1, value));
  const filled = Math.round(clamped * width);
  const empty = width - filled;
  const color = colorFn ?? chalk.green;
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

// --- Frame rendering ---

export function renderFrame(title: string, subject: string, contentLines: string[], footer?: string): string[] {
  const innerWidth = computeFrameWidth(title, subject, contentLines, footer);
  const lines: string[] = [];

  // Top border: ┌─ Title ─────────────── subject ─┐
  const topLabel = `─ ${title} `;
  const topSubject = ` ${subject} ─`;
  const topFill = Math.max(0, innerWidth - topLabel.length - topSubject.length);
  lines.push(`  ┌${topLabel}${'─'.repeat(topFill)}${topSubject}┐`);

  // Blank line after top border
  lines.push(frameLine('', innerWidth));

  // Content lines
  for (const line of contentLines) {
    lines.push(frameLine(line, innerWidth));
  }

  // Bottom border
  if (footer) {
    const bottomFill = Math.max(0, innerWidth - footer.length - 2);
    lines.push(`  └${'─'.repeat(bottomFill)} ${footer} ─┘`);
  } else {
    lines.push(`  └${'─'.repeat(innerWidth)}┘`);
  }

  return lines;
}

export function renderDoubleFrame(contentLines: string[], label?: string): string[] {
  const maxContent = maxVisualWidth(contentLines);
  const innerWidth = Math.max(FRAME_WIDTH, maxContent + 4);
  const lines: string[] = [];

  if (label) {
    const topLabel = `══ ${label} `;
    const topFill = Math.max(0, innerWidth - topLabel.length);
    lines.push(`  ╔${topLabel}${'═'.repeat(topFill)}╗`);
  } else {
    lines.push(`  ╔${'═'.repeat(innerWidth)}╗`);
  }

  lines.push(doubleFrameLine('', innerWidth));

  for (const line of contentLines) {
    lines.push(doubleFrameLine(line, innerWidth));
  }

  lines.push(doubleFrameLine('', innerWidth));
  lines.push(`  ╚${'═'.repeat(innerWidth)}╝`);

  return lines;
}

function frameLine(content: string, innerWidth: number): string {
  const visualLen = stripAnsi(content).length;
  const padding = Math.max(0, innerWidth - visualLen - 2);
  return `  │  ${content}${' '.repeat(padding)}│`;
}

function doubleFrameLine(content: string, innerWidth: number): string {
  const visualLen = stripAnsi(content).length;
  const padding = Math.max(0, innerWidth - visualLen - 2);
  return `  ║  ${content}${' '.repeat(padding)}║`;
}

function computeFrameWidth(title: string, subject: string, contentLines: string[], footer?: string): number {
  const titleWidth = title.length + subject.length + 6; // ─ Title ─── subject ─
  const footerWidth = footer ? footer.length + 4 : 0;
  const maxContent = maxVisualWidth(contentLines) + 4; // 2 padding each side
  return Math.max(FRAME_WIDTH, titleWidth, footerWidth, maxContent);
}

function maxVisualWidth(lines: string[]): number {
  let max = 0;
  for (const line of lines) {
    const len = stripAnsi(line).length;
    if (len > max) max = len;
  }
  return max;
}

export function stripAnsi(str: string): string {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

// --- Position marker for scalar values ---

export function renderPositionMarker(value: number, width: number = 40): string {
  const clamped = Math.max(0, Math.min(1, value));
  const pos = Math.round(clamped * (width - 1));
  const chars = '░'.repeat(width).split('');
  chars[pos] = '█';
  return chalk.dim(chars.join(''));
}

// --- Calibration number line ---

export function renderCalibrationLine(claim: number, evidence: number, width: number = 30): string[] {
  const lines: string[] = [];
  const clampClaim = Math.max(0, Math.min(1, claim));
  const clampEvidence = Math.max(0, Math.min(1, evidence));
  const claimPos = Math.round(clampClaim * (width - 1));
  const evidencePos = Math.round(clampEvidence * (width - 1));

  // Build the axis line
  const axis = '─'.repeat(width);
  const axisChars = axis.split('');

  // Place markers (evidence overwrites claim if same position)
  const markers = new Map<number, string>();
  markers.set(claimPos, 'C');
  markers.set(evidencePos, 'E');

  const line = axisChars.map((c, i) => {
    if (markers.has(i)) return markers.get(i)!;
    return c;
  }).join('');

  lines.push(`◄${line}►`);

  // Labels below
  const labelLine = ' '.repeat(width + 2).split('');
  // Place "0" at start, "1" at end
  labelLine[0] = '0';
  labelLine[width + 1] = '1';
  lines.push(labelLine.join(''));

  return lines;
}

// --- Reviewer header shelf ---

export function renderReviewerHeader(rank: number, name: string, coverage: string, width: number): string {
  const prefix = `${rank} ─── ${name} `;
  const suffix = ` ${coverage}`;
  const fill = Math.max(1, width - prefix.length - suffix.length);
  return `${chalk.bold(String(rank))} ${chalk.dim('───')} ${chalk.bold(name)} ${chalk.dim('─'.repeat(fill))}${chalk.dim(suffix)}`;
}

// --- Inline section divider inside a frame ---

export function renderInnerSeparator(width: number = 45): string {
  return chalk.dim('─'.repeat(width));
}

// --- Double-line emphasis band ---

export function renderDoubleBand(width: number = 50): string {
  return '═'.repeat(width);
}

// --- Verdict line ---

export function renderVerdict(passed: boolean, passedCount: number, totalCount: number): string {
  const label = passed ? chalk.greenBright.bold('READY') : chalk.redBright.bold('NOT READY');
  const ratio = `${passedCount} / ${totalCount} met`;
  return `VERDICT: ${stripAnsi(label) === 'READY' ? '' : ''}${label}${' '.repeat(Math.max(1, 30 - stripAnsi(`VERDICT: ${passed ? 'READY' : 'NOT READY'}`).length))}${ratio}`;
}

// --- Legacy functions preserved for compatibility ---

export function renderHeader(label: string, value: string): string {
  return `  ${chalk.bold(label)} · ${value}`;
}

export function renderSeparator(width: number = 50): string {
  return `  ${'─'.repeat(width)}`;
}

export function computeConceptWidth(names: string[]): number {
  if (names.length === 0) return CONCEPT_COL;
  return Math.max(CONCEPT_COL, ...names.map((n) => n.length)) + 2;
}

export function padName(name: string, width: number): string {
  return name.padEnd(width);
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
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
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

  // Sort within groups: by decayed confidence descending
  for (const level of ['verified', 'inferred', 'contested'] as const) {
    groups[level].sort((a, b) => b.decayedConfidence - a.decayedConfidence);
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

export function summarizeConflict(state: TrustState): string {
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

export function isStale(timestamp: number | null): boolean {
  if (!timestamp) return false;
  return (Date.now() - timestamp) > 60 * 24 * 60 * 60 * 1000;
}
