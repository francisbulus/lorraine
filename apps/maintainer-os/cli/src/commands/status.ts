import type { Command } from 'commander';
import chalk from 'chalk';
import { getBulkTrustState } from '../engine.js';
import type { TrustState } from '../engine.js';
import { getStore, closeStore } from '../lib/store.js';
import { groupByLevel, formatStatusLine, formatCalibrationSummary } from '../lib/formatters.js';

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

  console.log(`${chalk.bold('Trust Map:')} ${person}`);
  console.log(chalk.dim(`Last updated: ${new Date().toISOString().slice(0, 10)}`));
  console.log('');

  if (groups.verified.length > 0) {
    console.log(chalk.green.bold(`VERIFIED (${groups.verified.length})`));
    for (const s of groups.verified) {
      console.log(formatStatusLine(s));
    }
    console.log('');
  }

  if (groups.inferred.length > 0) {
    console.log(chalk.yellow.bold(`INFERRED (${groups.inferred.length})`));
    for (const s of groups.inferred) {
      console.log(formatStatusLine(s));
    }
    console.log('');
  }

  if (groups.contested.length > 0) {
    console.log(chalk.yellow.bold(`CONTESTED (${groups.contested.length})`));
    for (const s of groups.contested) {
      console.log(formatStatusLine(s));
    }
    console.log('');
  }

  if (groups.untested.length > 0) {
    console.log(chalk.dim.bold(`UNTESTED (${groups.untested.length})`));
    for (const s of groups.untested) {
      console.log(formatStatusLine(s));
    }
    console.log('');
  }

  const calSummary = formatCalibrationSummary(states);
  if (calSummary) {
    console.log(chalk.dim(calSummary));
  }
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
