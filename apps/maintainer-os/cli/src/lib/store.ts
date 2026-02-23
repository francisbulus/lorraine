import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { createSQLiteStore } from '../engine.js';
import type { Store } from '../engine.js';
import { loadConfig } from './config.js';
import { EXIT_STORAGE_ERROR } from '../types.js';

let cachedStore: Store | null = null;

export function getStore(configPath?: string): Store {
  if (cachedStore) return cachedStore;

  const config = loadConfig(configPath);
  const dbPath = config.store.path;

  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    cachedStore = createSQLiteStore(dbPath);
    return cachedStore;
  } catch (err) {
    console.error(`Failed to open store at ${dbPath}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_STORAGE_ERROR);
  }
}

export function closeStore(): void {
  if (cachedStore) {
    cachedStore.close();
    cachedStore = null;
  }
}
