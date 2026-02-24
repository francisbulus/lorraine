import type { Command } from 'commander';
import chalk from 'chalk';
import { calibrate } from '../engine.js';
import type { CalibrateResult } from '../engine.js';
import { getStore, closeStore } from '../lib/store.js';
import {
  formatConfidence,
  renderBar,
  renderFrame,
  renderInnerSeparator,
  renderPositionMarker,
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
  const hasPredictions = result.predictionCount > 0;
  const hasClaims = result.claimCount > 0;
  const contentLines: string[] = [];

  // Prediction accuracy (fill bar)
  contentLines.push(chalk.bold('Prediction accuracy'));
  if (hasPredictions) {
    contentLines.push(`${renderBar(result.predictionAccuracy, BAR_WIDTH, chalk.green)}  ${Math.round(result.predictionAccuracy * 100)}%`);
    contentLines.push(chalk.dim('How often the model correctly predicted'));
    contentLines.push(chalk.dim('verification outcomes'));
  } else {
    contentLines.push(chalk.dim('no data'));
    contentLines.push(chalk.dim('Needs 2+ verification events per concept'));
  }

  contentLines.push('');
  contentLines.push(renderInnerSeparator());
  contentLines.push('');

  // Overconfidence (position marker)
  contentLines.push(`${chalk.bold('Overconfidence'.padEnd(24))}${hasPredictions ? formatConfidence(result.overconfidenceBias) : chalk.dim('no data')}`);
  if (hasPredictions) {
    contentLines.push(renderPositionMarker(result.overconfidenceBias, 40));
  }
  contentLines.push(chalk.dim('▲ avg magnitude of unexpectedly poor outcomes'));

  contentLines.push('');

  // Underconfidence (position marker)
  contentLines.push(`${chalk.bold('Underconfidence'.padEnd(24))}${hasPredictions ? formatConfidence(result.underconfidenceBias) : chalk.dim('no data')}`);
  if (hasPredictions) {
    contentLines.push(renderPositionMarker(result.underconfidenceBias, 40));
  }
  contentLines.push(chalk.dim('▲ avg magnitude of unexpectedly strong outcomes'));

  contentLines.push('');
  contentLines.push(renderInnerSeparator());
  contentLines.push('');

  // Stale coverage (fill bar)
  contentLines.push(chalk.bold('Stale coverage'));
  contentLines.push(`${renderBar(result.stalePercentage, BAR_WIDTH, chalk.red)}  ${Math.round(result.stalePercentage * 100)}%`);
  const staleDesc = result.staleFromInferred > 0
    ? `${result.staleFromInferred} inferred concepts never directly verified`
    : 'Concepts not verified in the last 60 days';
  contentLines.push(chalk.dim(staleDesc));

  contentLines.push('');

  // Surprise rate
  contentLines.push(`${chalk.bold('Surprise rate'.padEnd(24))}${hasPredictions ? `${Math.round(result.surpriseRate * 100)}%` : chalk.dim('no data')}`);
  contentLines.push(chalk.dim('Outcomes that contradicted model expectations'));

  contentLines.push('');
  contentLines.push(renderInnerSeparator());
  contentLines.push('');

  // Claim calibration (position marker)
  contentLines.push(`${chalk.bold('Claim calibration'.padEnd(24))}${hasClaims ? formatConfidence(result.claimCalibration) : chalk.dim('no data')}`);
  if (hasClaims) {
    contentLines.push(renderPositionMarker(result.claimCalibration, 40));
  }
  contentLines.push(chalk.dim('Self-assessments vs evidence (1.0 = perfect)'));

  contentLines.push('');
  contentLines.push('═'.repeat(50));
  contentLines.push('');
  contentLines.push(`${chalk.dim('ℹ')} ${result.recommendation}`);
  contentLines.push('');

  const frame = renderFrame('Calibration', person, contentLines);
  for (const line of frame) {
    console.log(line);
  }
}
