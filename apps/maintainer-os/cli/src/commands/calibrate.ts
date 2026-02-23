import type { Command } from 'commander';

export function registerCalibrateCommand(program: Command): void {
  program
    .command('calibrate')
    .description('Show model accuracy and person calibration metrics')
    .requiredOption('--person <id>', 'Person identifier')
    .action((_opts) => {
      console.log('mos calibrate: not yet implemented');
    });
}
