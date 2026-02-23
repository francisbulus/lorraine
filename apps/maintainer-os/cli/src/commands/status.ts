import type { Command } from 'commander';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show trust map for a person')
    .requiredOption('--person <id>', 'Person identifier')
    .option('--verbose', 'Show full detail for each concept')
    .action((_opts) => {
      console.log('mos status: not yet implemented');
    });
}
