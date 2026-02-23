import type { Command } from 'commander';
import { getStore, closeStore } from '../lib/store.js';
import { buildExplanation, formatExplanation, explanationToJson } from '../lib/explain.js';

export function registerWhyCommand(program: Command): void {
  program
    .command('why')
    .description('Explain a trust state with full evidence chain')
    .requiredOption('--person <id>', 'Person identifier')
    .requiredOption('--concept <id>', 'Concept identifier')
    .action((opts: { person: string; concept: string }) => {
      const configPath = program.opts()['config'] as string | undefined;
      const format = program.opts()['format'] as string;
      const store = getStore(configPath);

      try {
        const data = buildExplanation(store, opts.person, opts.concept);

        if (format === 'json') {
          console.log(JSON.stringify(explanationToJson(data), null, 2));
        } else {
          console.log(formatExplanation(data));
        }
      } finally {
        closeStore();
      }
    });
}
