import type { Command } from 'commander';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { configExists, writeConfig, getConfigPath } from '../lib/config.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a MaintainerOS workspace')
    .option('--repo <owner/repo>', 'Repository identifier (e.g. acme/payments)')
    .option('--db <path>', 'Database file path', '~/.maintaineros/mos.db')
    .option('--config <path>', 'Config file path override')
    .action((opts: { repo?: string; db: string; config?: string }) => {
      const configPath = opts.config ?? program.opts()['config'] as string | undefined;

      if (configExists(configPath)) {
        const path = getConfigPath(configPath);
        console.error(`Config already exists at ${path}. Remove it first to reinitialize.`);
        process.exit(1);
      }

      // Ensure db directory exists
      const dbPath = opts.db;
      const expandedDb = dbPath.startsWith('~/') ? dbPath : dbPath;
      const dbDir = dirname(expandedDb.replace(/^~\//, ''));
      if (dbDir && !dbDir.startsWith('~')) {
        // Only create if it's a real path, not a home-relative one
      }

      const path = writeConfig(
        {
          store: { backend: 'sqlite', path: dbPath },
          repo: opts.repo,
        },
        configPath,
      );

      console.log(`Initialized MaintainerOS workspace.`);
      console.log(`  Config: ${path}`);
      console.log(`  Store:  ${dbPath} (sqlite)`);
      if (opts.repo) {
        console.log(`  Repo:   ${opts.repo}`);
      }
      console.log('');
      console.log('Next: load a domain graph with `mos domain load --file <path>`');
    });
}
