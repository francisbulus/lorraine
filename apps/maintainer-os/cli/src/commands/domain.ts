import type { Command } from 'commander';

export function registerDomainCommand(program: Command): void {
  const domain = program
    .command('domain')
    .description('Manage domain graphs');

  domain
    .command('load')
    .description('Load a domain graph from a JSON file')
    .requiredOption('--file <path>', 'Path to domain pack JSON file')
    .action((_opts) => {
      console.log('mos domain load: not yet implemented');
    });

  domain
    .command('list')
    .description('List loaded domains')
    .action(() => {
      console.log('mos domain list: not yet implemented');
    });
}
