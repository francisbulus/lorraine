import type { Command } from 'commander';
import { existsSync } from 'node:fs';
import { getStore, closeStore } from '../lib/store.js';
import { loadConfig } from '../lib/config.js';
import { addPeople } from '../lib/domain.js';
import { ingestEventsFromFile } from '../lib/ingest.js';
import { EXIT_UPSTREAM_ERROR } from '../types.js';

export function registerIngestCommand(program: Command): void {
  const ingest = program
    .command('ingest')
    .description('Ingest evidence events');

  ingest
    .command('run')
    .description('Ingest events from a file')
    .requiredOption('--source <type>', 'Ingest source type (file)')
    .requiredOption('--file <path>', 'Path to events file (JSON or CSV)')
    .action((opts: { source: string; file: string }) => {
      const configPath = program.opts()['config'] as string | undefined;

      if (opts.source !== 'file') {
        console.error(`Unsupported ingest source: "${opts.source}". Phase 1 supports "file" only.`);
        process.exit(EXIT_UPSTREAM_ERROR);
      }

      if (!existsSync(opts.file)) {
        console.error(`File not found: ${opts.file}`);
        process.exit(EXIT_UPSTREAM_ERROR);
      }

      const store = getStore(configPath);
      try {
        const result = ingestEventsFromFile(store, opts.file);

        if (result.errors.length > 0) {
          for (const err of result.errors) {
            console.error(`  Warning: ${err}`);
          }
        }

        console.log(`Ingested ${result.processed} events (${result.verifications} verifications, ${result.claims} claims)`);
        if (result.skipped > 0) {
          console.log(`  Skipped: ${result.skipped}`);
        }
        console.log(`  Concepts affected: ${result.conceptsAffected.size}`);

        // Track people for reviewer scoring
        if (result.peopleAffected.size > 0) {
          const config = loadConfig(configPath);
          addPeople(config.store.path, [...result.peopleAffected]);
        }
      } catch (err) {
        console.error(`Ingest failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(EXIT_UPSTREAM_ERROR);
      } finally {
        closeStore();
      }
    });
}
