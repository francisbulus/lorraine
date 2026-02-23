import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { parse, stringify } from 'smol-toml';
import type { MosConfig } from '../types.js';
import { EXIT_CONFIG_ERROR } from '../types.js';

const DEFAULT_CONFIG_DIR = resolve(homedir(), '.config', 'maintaineros');
const DEFAULT_CONFIG_PATH = resolve(DEFAULT_CONFIG_DIR, 'config.toml');

export function getConfigPath(override?: string): string {
  return override ?? DEFAULT_CONFIG_PATH;
}

export function configExists(configPath?: string): boolean {
  return existsSync(getConfigPath(configPath));
}

export function loadConfig(configPath?: string): MosConfig {
  const path = getConfigPath(configPath);
  if (!existsSync(path)) {
    console.error(`Config not found at ${path}. Run \`mos init\` to create one.`);
    process.exit(EXIT_CONFIG_ERROR);
  }

  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = parse(raw);
    return validateConfig(parsed);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Config not found')) throw err;
    console.error(`Invalid config at ${path}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_CONFIG_ERROR);
  }
}

function validateConfig(raw: Record<string, unknown>): MosConfig {
  const store = raw['store'] as Record<string, unknown> | undefined;
  if (!store || typeof store['backend'] !== 'string' || typeof store['path'] !== 'string') {
    throw new Error('Config must include [store] with backend and path');
  }
  return {
    store: {
      backend: store['backend'] as 'sqlite',
      path: expandHome(store['path'] as string),
    },
    repo: raw['repo'] as string | undefined,
    llm: raw['llm'] as MosConfig['llm'],
    integrations: raw['integrations'] as MosConfig['integrations'],
    notifications: raw['notifications'] as MosConfig['notifications'],
  };
}

export function writeConfig(config: MosConfig, configPath?: string): string {
  const path = getConfigPath(configPath);
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tomlObj: Record<string, unknown> = {
    store: {
      backend: config.store.backend,
      path: config.store.path,
    },
  };

  if (config.repo) {
    tomlObj['repo'] = config.repo;
  }

  tomlObj['llm'] = { provider: '', model: '' };
  tomlObj['integrations'] = {
    github: { enabled: false, repo: '' },
    incidents: { enabled: false, provider: '' },
  };
  tomlObj['notifications'] = { channel: '' };

  writeFileSync(path, stringify(tomlObj), 'utf-8');
  return path;
}

function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return resolve(homedir(), p.slice(2));
  }
  return p;
}
