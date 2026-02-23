import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, writeConfig, configExists, getConfigPath } from '../../src/lib/config.js';

const TEST_DIR = resolve(tmpdir(), 'mos-config-test-' + process.pid);
const TEST_CONFIG = resolve(TEST_DIR, 'config.toml');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('writeConfig', () => {
  it('creates config file with store section', () => {
    const path = writeConfig(
      { store: { backend: 'sqlite', path: '~/.maintaineros/mos.db' } },
      TEST_CONFIG,
    );
    expect(path).toBe(TEST_CONFIG);
    const content = readFileSync(TEST_CONFIG, 'utf-8');
    expect(content).toContain('[store]');
    expect(content).toContain('backend = "sqlite"');
    expect(content).toContain('path = "~/.maintaineros/mos.db"');
  });

  it('includes repo when provided', () => {
    writeConfig(
      { store: { backend: 'sqlite', path: 'test.db' }, repo: 'acme/payments' },
      TEST_CONFIG,
    );
    const content = readFileSync(TEST_CONFIG, 'utf-8');
    expect(content).toContain('repo = "acme/payments"');
  });

  it('includes placeholder sections for llm, integrations, notifications', () => {
    writeConfig(
      { store: { backend: 'sqlite', path: 'test.db' } },
      TEST_CONFIG,
    );
    const content = readFileSync(TEST_CONFIG, 'utf-8');
    expect(content).toContain('[llm]');
    expect(content).toContain('[integrations');
    expect(content).toContain('[notifications]');
  });
});

describe('loadConfig', () => {
  it('loads a valid config file', () => {
    writeFileSync(
      TEST_CONFIG,
      `[store]\nbackend = "sqlite"\npath = "~/.maintaineros/mos.db"\n`,
    );
    const config = loadConfig(TEST_CONFIG);
    expect(config.store.backend).toBe('sqlite');
    expect(config.store.path).toContain('maintaineros/mos.db');
  });

  it('exits with code 3 when config is missing', () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as never);
    const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadConfig(resolve(TEST_DIR, 'nonexistent.toml'))).toThrow('process.exit');
    expect(mockExit).toHaveBeenCalledWith(3);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Config not found'));

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});

describe('configExists', () => {
  it('returns false when no config file', () => {
    expect(configExists(resolve(TEST_DIR, 'nope.toml'))).toBe(false);
  });

  it('returns true when config file exists', () => {
    writeFileSync(TEST_CONFIG, '[store]\nbackend = "sqlite"\npath = "test.db"\n');
    expect(configExists(TEST_CONFIG)).toBe(true);
  });
});
