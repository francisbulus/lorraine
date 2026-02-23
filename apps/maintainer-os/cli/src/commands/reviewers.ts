import type { Command } from 'commander';

export function registerReviewersCommand(program: Command): void {
  program
    .command('reviewers')
    .description('Recommend reviewers for a set of concepts')
    .requiredOption('--concepts <ids>', 'Comma-separated concept identifiers')
    .option('--top <n>', 'Number of reviewers to return', '3')
    .action((_opts) => {
      console.log('mos reviewers: not yet implemented');
    });
}
