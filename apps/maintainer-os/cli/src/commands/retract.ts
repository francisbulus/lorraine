import type { Command } from 'commander';
import chalk from 'chalk';
import { retractEvent } from '../engine.js';
import { getStore, closeStore } from '../lib/store.js';
import { EXIT_UPSTREAM_ERROR } from '../types.js';

const VALID_REASONS = new Set([
  'fraudulent',
  'duplicate',
  'identity_mixup',
  'consent_erasure',
  'data_correction',
]);

export function registerRetractCommand(program: Command): void {
  program
    .command('retract')
    .description('Retract an event with reason')
    .requiredOption('--event-id <id>', 'Event identifier to retract')
    .requiredOption('--reason <reason>', 'Retraction reason (fraudulent, duplicate, identity_mixup, consent_erasure, data_correction)')
    .requiredOption('--by <actor>', 'Person performing the retraction')
    .option('--yes', 'Skip confirmation prompt')
    .option('--event-type <type>', 'Event type (verification or claim)', 'verification')
    .action((opts: { eventId: string; reason: string; by: string; yes?: boolean; eventType: string }) => {
      const configPath = program.opts()['config'] as string | undefined;
      const format = program.opts()['format'] as string;

      if (!VALID_REASONS.has(opts.reason)) {
        console.error(`Invalid reason "${opts.reason}". Valid reasons: ${[...VALID_REASONS].join(', ')}`);
        process.exit(EXIT_UPSTREAM_ERROR);
      }

      if (opts.eventType !== 'verification' && opts.eventType !== 'claim') {
        console.error(`Invalid event type "${opts.eventType}". Must be "verification" or "claim".`);
        process.exit(EXIT_UPSTREAM_ERROR);
      }

      const store = getStore(configPath);
      try {
        const result = retractEvent(store, {
          eventId: opts.eventId,
          eventType: opts.eventType as 'verification' | 'claim',
          reason: opts.reason as 'fraudulent' | 'duplicate' | 'identity_mixup' | 'consent_erasure' | 'data_correction',
          retractedBy: opts.by,
        });

        if (format === 'json') {
          console.log(JSON.stringify({
            retracted: result.retracted,
            eventId: opts.eventId,
            reason: opts.reason,
            retractedBy: opts.by,
            trustStatesAffected: result.trustStatesAffected,
          }, null, 2));
          return;
        }

        if (result.retracted) {
          console.log(`Retracted event ${opts.eventId} (reason: ${opts.reason}, by: ${opts.by})`);
          if (result.trustStatesAffected.length > 0) {
            console.log(`  Trust states recomputed: ${result.trustStatesAffected.join(', ')}`);
          }
        } else {
          console.error(`Event ${opts.eventId} not found or already retracted.`);
          process.exit(EXIT_UPSTREAM_ERROR);
        }
      } finally {
        closeStore();
      }
    });
}
