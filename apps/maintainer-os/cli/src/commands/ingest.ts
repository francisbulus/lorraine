import type { Command } from 'commander';

export function registerIngestCommand(program: Command): void {
  const ingest = program
    .command('ingest')
    .description('Ingest evidence events');

  ingest
    .command('run')
    .description('Ingest events from a file')
    .requiredOption('--source <type>', 'Ingest source type (file)')
    .requiredOption('--file <path>', 'Path to events file (JSON or CSV)')
    .action((_opts) => {
      console.log('mos ingest run: not yet implemented');
    });
}
