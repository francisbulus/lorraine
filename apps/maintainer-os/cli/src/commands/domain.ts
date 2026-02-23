import type { Command } from 'commander';
import { existsSync } from 'node:fs';
import { getStore, closeStore } from '../lib/store.js';
import { loadDomainPack, saveDomainMetadata, loadDomainMetadataList, saveBundles, saveMappings } from '../lib/domain.js';
import { loadConfig } from '../lib/config.js';

export function registerDomainCommand(program: Command): void {
  const domain = program
    .command('domain')
    .description('Manage domain graphs');

  domain
    .command('load')
    .description('Load a domain graph from a JSON file')
    .requiredOption('--file <path>', 'Path to domain pack JSON file')
    .action((opts: { file: string }) => {
      const configPath = program.opts()['config'] as string | undefined;

      if (!existsSync(opts.file)) {
        console.error(`File not found: ${opts.file}`);
        process.exit(4);
      }

      const store = getStore(configPath);
      try {
        const result = loadDomainPack(store, opts.file);

        if (result.errors.length > 0) {
          console.error('Domain validation errors:');
          for (const err of result.errors) {
            console.error(`  - ${err}`);
          }
          process.exit(4);
        }

        const config = loadConfig(configPath);
        saveDomainMetadata(config.store.path, result.pack, result.loaded, result.edgesCreated);
        if (result.pack.bundles) {
          saveBundles(config.store.path, result.pack.bundles);
        }
        if (result.pack.mappings) {
          saveMappings(config.store.path, result.pack.mappings);
        }

        console.log(`Domain loaded: ${result.pack.name ?? result.pack.id ?? opts.file}`);
        console.log(`  Concepts: ${result.loaded}`);
        console.log(`  Edges:    ${result.edgesCreated}`);
        if (result.pack.mappings) {
          console.log(`  Mappings: ${Object.keys(result.pack.mappings).length} concepts mapped to files`);
        }
        if (result.pack.bundles) {
          console.log(`  Bundles:  ${Object.keys(result.pack.bundles).join(', ')}`);
        }
      } finally {
        closeStore();
      }
    });

  domain
    .command('list')
    .description('List loaded domains')
    .action(() => {
      const configPath = program.opts()['config'] as string | undefined;
      const config = loadConfig(configPath);
      const domains = loadDomainMetadataList(config.store.path);

      if (domains.length === 0) {
        console.log('No domains loaded. Run `mos domain load --file <path>` to load one.');
        return;
      }

      console.log('Loaded domains:\n');
      for (const d of domains) {
        console.log(`  ${d.name} (${d.id}) v${d.version}`);
        console.log(`    ${d.conceptCount} concepts, ${d.edgeCount} edges`);
        console.log(`    Loaded: ${d.loadedAt}`);
        console.log('');
      }
    });
}
