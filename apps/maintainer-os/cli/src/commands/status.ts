import type { Command } from 'commander';
import chalk from 'chalk';
import { getBulkTrustState } from '../engine.js';
import type { TrustState } from '../engine.js';
import { getStore, closeStore } from '../lib/store.js';
import {
  groupByLevel,
  iconForLevelGradient,
  colorForLevelGradient,
  renderBar,
  renderFrame,
  renderInnerSeparator,
  formatConfidence,
  formatTimeAgo,
  formatModalities,
  summarizeConflict,
  computeConceptWidth,
  padName,
  BAR_WIDTH,
} from '../lib/formatters.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show trust map for a person')
    .requiredOption('--person <id>', 'Person identifier')
    .option('--verbose', 'Show full detail for each concept')
    .action((opts: { person: string; verbose?: boolean }) => {
      const configPath = program.opts()['config'] as string | undefined;
      const format = program.opts()['format'] as string;
      const store = getStore(configPath);

      try {
        const states = getBulkTrustState(store, { personId: opts.person });

        if (states.length === 0) {
          console.log(`No trust data for ${opts.person}. Run \`mos ingest run\` to build evidence.`);
          return;
        }

        if (format === 'json') {
          console.log(JSON.stringify(buildStatusJson(opts.person, states), null, 2));
          return;
        }

        printStatusTable(opts.person, states);
      } finally {
        closeStore();
      }
    });
}

function printStatusTable(person: string, states: TrustState[]): void {
  const groups = groupByLevel(states);
  const conceptWidth = computeConceptWidth(states.map((s) => s.conceptId));
  const contentLines: string[] = [];

  const levels = ['verified', 'inferred', 'contested', 'untested'] as const;
  let firstSection = true;

  for (const level of levels) {
    const group = groups[level];
    if (group.length === 0) continue;

    if (!firstSection) {
      contentLines.push('');
      contentLines.push(renderInnerSeparator());
    }
    firstSection = false;

    contentLines.push('');
    const sectionColor = level === 'verified' ? chalk.green.bold
      : level === 'inferred' ? chalk.yellow.bold
      : level === 'contested' ? chalk.redBright.bold
      : chalk.dim.bold;
    contentLines.push(sectionColor(level.toUpperCase()));

    for (const s of group) {
      contentLines.push('');
      const color = colorForLevelGradient(s.level, s.decayedConfidence);
      const icon = iconForLevelGradient(s.level, s.decayedConfidence);
      const name = color(padName(s.conceptId, conceptWidth));
      const bar = renderBar(s.decayedConfidence, BAR_WIDTH, color);

      if (s.level === 'untested') {
        contentLines.push(`  ${icon} ${name} ${bar}`);
      } else {
        const conf = formatConfidence(s.decayedConfidence);
        contentLines.push(`  ${icon} ${name} ${bar}  ${conf}`);
      }

      // Detail line
      const detail = buildDetailLine(s);
      if (detail) {
        contentLines.push(`    ${chalk.dim(detail)}`);
      }
    }
  }

  contentLines.push('');

  // Build footer
  const calData = getCalibrationData(states);
  const footer = calData
    ? `Calibration: ${calData.accuracy}% · ${calData.stalePercent}% stale`
    : 'Last updated: just now';

  const frame = renderFrame('Trust Map', person, contentLines, footer);
  for (const line of frame) {
    console.log(line);
  }
}

function buildDetailLine(s: TrustState): string {
  switch (s.level) {
    case 'verified': {
      const time = s.lastVerified ? formatTimeAgo(s.lastVerified) : '';
      const mods = formatModalities(s.modalitiesTested);
      return [time, mods].filter(Boolean).join(' · ');
    }
    case 'inferred':
      return `from ${s.inferredFrom.join(', ')}`;
    case 'contested':
      return summarizeConflict(s);
    case 'untested':
      return '';
  }
}

function getCalibrationData(states: TrustState[]): { accuracy: number; stalePercent: number } | null {
  const withClaims = states.filter((s) => s.calibrationGap !== null);
  if (withClaims.length === 0) return null;

  const avgGap = withClaims.reduce((sum, s) => sum + Math.abs(s.calibrationGap!), 0) / withClaims.length;
  const accuracy = Math.round((1 - avgGap) * 100);

  const staleCount = states.filter((s) => {
    if (!s.lastVerified) return false;
    return (Date.now() - s.lastVerified) > 60 * 24 * 60 * 60 * 1000;
  }).length;
  const stalePercent = states.length > 0 ? Math.round((staleCount / states.length) * 100) : 0;

  return { accuracy, stalePercent };
}

function buildStatusJson(person: string, states: TrustState[]): unknown {
  const groups = groupByLevel(states);
  return {
    person,
    timestamp: new Date().toISOString(),
    verified: groups.verified.map(stateToJson),
    inferred: groups.inferred.map(stateToJson),
    contested: groups.contested.map(stateToJson),
    untested: groups.untested.map(stateToJson),
  };
}

function stateToJson(s: TrustState): unknown {
  return {
    conceptId: s.conceptId,
    level: s.level,
    confidence: s.confidence,
    decayedConfidence: s.decayedConfidence,
    lastVerified: s.lastVerified,
    modalitiesTested: s.modalitiesTested,
    inferredFrom: s.inferredFrom,
    calibrationGap: s.calibrationGap,
  };
}
