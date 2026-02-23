import type { Command } from 'commander';
import chalk from 'chalk';
import { calibrate } from '../engine.js';
import type { CalibrateResult } from '../engine.js';
import { getStore, closeStore } from '../lib/store.js';
import {
  formatConfidence,
  renderBar,
  renderHeader,
  renderSeparator,
  BAR_WIDTH,
} from '../lib/formatters.js';

export function registerCalibrateCommand(program: Command): void {
  program
    .command('calibrate')
    .description('Show model accuracy and person calibration metrics')
    .requiredOption('--person <id>', 'Person identifier')
    .action((opts: { person: string }) => {
      const configPath = program.opts()['config'] as string | undefined;
      const format = program.opts()['format'] as string;
      const store = getStore(configPath);

      try {
        const result = calibrate(store, { personId: opts.person });

        if (format === 'json') {
          console.log(JSON.stringify({ person: opts.person, ...result }, null, 2));
        } else {
          printCalibration(opts.person, result);
        }
      } finally {
        closeStore();
      }
    });
}

function printCalibration(person: string, result: CalibrateResult): void {
  console.log(renderHeader('Calibration', person));
  console.log(renderSeparator());
  console.log('');

  const hasPredictions = result.predictionCount > 0;
  const hasClaims = result.claimCount > 0;

  printMetric(
    'Prediction accuracy',
    hasPredictions ? result.predictionAccuracy : null,
    hasPredictions ? `${Math.round(result.predictionAccuracy * 100)}%` : chalk.dim('no data'),
    hasPredictions
      ? 'How often the model correctly predicted verification outcomes'
      : 'Needs 2+ verification events per concept',
    chalk.green,
  );
  printMetric(
    'Overconfidence bias',
    null,
    hasPredictions ? formatConfidence(result.overconfidenceBias) : chalk.dim('no data'),
    'Average magnitude of unexpectedly poor outcomes',
  );
  printMetric(
    'Underconfidence bias',
    null,
    hasPredictions ? formatConfidence(result.underconfidenceBias) : chalk.dim('no data'),
    'Average magnitude of unexpectedly strong outcomes',
  );

  const staleDesc = result.staleFromInferred > 0
    ? `${result.staleFromInferred} inferred concepts never directly verified`
    : 'Concepts not verified in the last 60 days';
  printMetric(
    'Stale percentage',
    result.stalePercentage,
    `${Math.round(result.stalePercentage * 100)}%`,
    staleDesc,
    chalk.red,
  );

  printMetric(
    'Surprise rate',
    null,
    hasPredictions ? `${Math.round(result.surpriseRate * 100)}%` : chalk.dim('no data'),
    'Verification outcomes that contradicted expectations',
  );
  printMetric(
    'Claim calibration',
    null,
    hasClaims ? formatConfidence(result.claimCalibration) : chalk.dim('no data'),
    hasClaims
      ? 'How well self-assessments match evidence (1.0 = perfect)'
      : 'No self-assessment claims recorded',
  );

  console.log('');
  console.log(renderSeparator());
  console.log(`  ${chalk.bold('Recommendation:')}`);
  console.log(`    ${result.recommendation}`);
}

function printMetric(
  name: string,
  barValue: number | null,
  displayValue: string,
  description: string,
  barColor?: chalk.ChalkInstance,
): void {
  if (barValue !== null) {
    const color = barColor ?? chalk.yellow;
    const bar = renderBar(barValue, BAR_WIDTH, color);
    console.log(`  ${chalk.bold(name.padEnd(24))} ${bar} ${displayValue}`);
  } else {
    console.log(`  ${chalk.bold(name.padEnd(24))} ${displayValue}`);
  }
  console.log(`  ${' '.repeat(24)} ${chalk.dim(description)}`);
  console.log('');
}
