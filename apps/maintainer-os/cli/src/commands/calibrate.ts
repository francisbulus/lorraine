import type { Command } from 'commander';
import chalk from 'chalk';
import { calibrate } from '../engine.js';
import type { CalibrateResult } from '../engine.js';
import { getStore, closeStore } from '../lib/store.js';
import { formatConfidence } from '../lib/formatters.js';

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
  console.log(`${chalk.bold('Calibration:')} ${person}`);
  console.log('');

  const hasPredictions = result.predictionCount > 0;
  const hasClaims = result.claimCount > 0;

  printMetric(
    'Prediction accuracy',
    hasPredictions ? `${Math.round(result.predictionAccuracy * 100)}%` : chalk.dim('no data'),
    hasPredictions
      ? 'How often the model correctly predicted verification outcomes'
      : 'Needs concepts with 2+ verification events',
  );
  printMetric(
    'Overconfidence bias',
    hasPredictions ? formatConfidence(result.overconfidenceBias) : chalk.dim('no data'),
    'Average magnitude of unexpectedly poor outcomes',
  );
  printMetric(
    'Underconfidence bias',
    hasPredictions ? formatConfidence(result.underconfidenceBias) : chalk.dim('no data'),
    'Average magnitude of unexpectedly strong outcomes',
  );

  const staleDesc = result.staleFromInferred > 0
    ? `Concepts not verified in the last 60 days (includes ${result.staleFromInferred} inferred, never directly verified)`
    : 'Concepts not verified in the last 60 days';
  printMetric(
    'Stale percentage',
    `${Math.round(result.stalePercentage * 100)}%`,
    staleDesc,
  );

  printMetric(
    'Surprise rate',
    hasPredictions ? `${Math.round(result.surpriseRate * 100)}%` : chalk.dim('no data'),
    'Verification outcomes that contradicted expectations',
  );
  printMetric(
    'Claim calibration',
    hasClaims ? formatConfidence(result.claimCalibration) : chalk.dim('no data'),
    hasClaims
      ? 'How well self-assessments match evidence (1.0 = perfect)'
      : 'No self-assessment claims recorded',
  );

  console.log('');
  console.log(chalk.bold('Recommendation:'));
  console.log(`  ${result.recommendation}`);
}

function printMetric(name: string, value: string, description: string): void {
  console.log(`  ${chalk.bold(name.padEnd(24))} ${value}`);
  console.log(`  ${chalk.dim(description)}`);
  console.log('');
}
