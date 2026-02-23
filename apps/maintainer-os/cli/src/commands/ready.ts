import type { Command } from 'commander';

export function registerReadyCommand(program: Command): void {
  program
    .command('ready')
    .description('Evaluate readiness against a capability bundle')
    .requiredOption('--person <id>', 'Person identifier')
    .requiredOption('--bundle <name>', 'Capability bundle name')
    .option('--verbose', 'Show full trust state per concept')
    .action((_opts) => {
      console.log('mos ready: not yet implemented');
    });
}
