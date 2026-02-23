import type { Command } from 'commander';
import chalk from 'chalk';
import { getBulkTrustState } from '../engine.js';
import type { TrustState } from '../engine.js';
import { getStore, closeStore } from '../lib/store.js';
import {
  groupByLevel,
  iconForLevel,
  colorForLevelGradient,
  renderBar,
  renderHeader,
  renderSeparator,
  formatConfidence,
  formatTimeAgo,
  formatModalities,
  summarizeConflict,
  CONCEPT_COL,
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

  console.log(renderHeader('Trust Map', person));
  console.log(`  ${chalk.dim('Last updated: just now')}`);
  console.log(renderSeparator());
  console.log('');

  const levels = ['verified', 'inferred', 'contested', 'untested'] as const;
  for (const level of levels) {
    const group = groups[level];
    if (group.length === 0) continue;

    const sectionColor = level === 'verified' ? chalk.green.bold
      : level === 'inferred' ? chalk.yellow.bold
      : level === 'contested' ? chalk.redBright.bold
      : chalk.dim.bold;
    console.log(`  ${sectionColor(level.toUpperCase())}`);

    for (const s of group) {
      const icon = iconForLevel(s.level);
      const name = s.conceptId.padEnd(CONCEPT_COL);

      if (s.level === 'untested') {
        console.log(`    ${icon} ${name}`);
      } else {
        const color = colorForLevelGradient(s.level, s.decayedConfidence);
        const bar = renderBar(s.decayedConfidence, BAR_WIDTH, color);
        const conf = formatConfidence(s.decayedConfidence);

        let extras = '';
        if (s.level === 'verified') {
          const time = s.lastVerified ? formatTimeAgo(s.lastVerified) : '';
          extras = `${chalk.dim(time)}   ${chalk.dim(formatModalities(s.modalitiesTested))}`;
        } else if (s.level === 'inferred') {
          extras = `inferred from ${s.inferredFrom.join(', ')}`;
        } else if (s.level === 'contested') {
          extras = summarizeConflict(s);
        }

        console.log(`    ${icon} ${name} ${bar} ${conf}  ${extras}`);
      }
    }
    console.log('');
  }

  console.log(renderSeparator());
  const calData = getCalibrationData(states);
  if (calData) {
    console.log(renderHeader('Calibration', `${calData.accuracy}% accuracy · ${calData.stalePercent}% stale`));
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
