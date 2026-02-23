import type { Command } from 'commander';

export function registerRetractCommand(program: Command): void {
  program
    .command('retract')
    .description('Retract an event with reason')
    .requiredOption('--event-id <id>', 'Event identifier to retract')
    .requiredOption('--reason <reason>', 'Retraction reason (fraudulent, duplicate, identity_mixup, consent_erasure, data_correction)')
    .requiredOption('--by <actor>', 'Person performing the retraction')
    .option('--yes', 'Skip confirmation prompt')
    .action((_opts) => {
      console.log('mos retract: not yet implemented');
    });
}
