import type { Command } from 'commander';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a MaintainerOS workspace')
    .option('--repo <owner/repo>', 'Repository identifier (e.g. acme/payments)')
    .option('--db <path>', 'Database file path', '~/.maintaineros/mos.db')
    .action((_opts) => {
      console.log('mos init: not yet implemented');
    });
}
