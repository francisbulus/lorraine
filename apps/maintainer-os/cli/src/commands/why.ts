import type { Command } from 'commander';

export function registerWhyCommand(program: Command): void {
  program
    .command('why')
    .description('Explain a trust state with full evidence chain')
    .requiredOption('--person <id>', 'Person identifier')
    .requiredOption('--concept <id>', 'Concept identifier')
    .action((_opts) => {
      console.log('mos why: not yet implemented');
    });
}
