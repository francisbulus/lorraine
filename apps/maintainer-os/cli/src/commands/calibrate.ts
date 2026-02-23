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

  printMetric(
    'Prediction accuracy',
    `${Math.round(result.predictionAccuracy * 100)}%`,
    'How often the model correctly predicted verification outcomes',
  );
  printMetric(
    'Overconfidence bias',
    formatConfidence(result.overconfidenceBias),
    'Average magnitude of unexpectedly poor outcomes',
  );
  printMetric(
    'Underconfidence bias',
    formatConfidence(result.underconfidenceBias),
    'Average magnitude of unexpectedly strong outcomes',
  );
  printMetric(
    'Stale percentage',
    `${Math.round(result.stalePercentage * 100)}%`,
    'Concepts not verified in the last 60 days',
  );
  printMetric(
    'Surprise rate',
    `${Math.round(result.surpriseRate * 100)}%`,
    'Verification outcomes that contradicted expectations',
  );
  printMetric(
    'Claim calibration',
    formatConfidence(result.claimCalibration),
    'How well self-assessments match evidence (1.0 = perfect)',
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
