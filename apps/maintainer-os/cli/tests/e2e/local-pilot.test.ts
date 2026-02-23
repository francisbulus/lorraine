import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = resolve(tmpdir(), 'mos-e2e-' + process.pid);
const DB_PATH = resolve(TEST_DIR, 'mos.db');
const CONFIG_PATH = resolve(TEST_DIR, 'config.toml');
const CLI_PATH = resolve(import.meta.dirname, '../../src/cli.ts');
const FIXTURES = resolve(import.meta.dirname, '../../fixtures');

function mos(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync('npx', ['tsx', CLI_PATH, '--config', CONFIG_PATH, ...args], {
      cwd: resolve(import.meta.dirname, '../..'),
      encoding: 'utf-8',
      timeout: 15_000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: (err.stdout ?? '') + (err.stderr ?? ''), exitCode: err.status ?? 1 };
  }
}

describe('Phase 1 local pilot loop', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('runs the full loop: init, domain load, ingest, status, ready, why, calibrate, retract', { timeout: 60_000 }, () => {
    // 1. Init
    const init = mos(['init', '--repo', 'acme/payments', '--db', DB_PATH]);
    expect(init.exitCode).toBe(0);
    expect(init.stdout).toContain('Initialized MaintainerOS workspace');

    // 2. Domain load
    const domainLoad = mos(['domain', 'load', '--file', resolve(FIXTURES, 'example-domain.json')]);
    expect(domainLoad.exitCode).toBe(0);
    expect(domainLoad.stdout).toContain('Domain loaded');
    expect(domainLoad.stdout).toContain('Concepts: 8');

    // 3. Domain list
    const domainList = mos(['domain', 'list']);
    expect(domainList.exitCode).toBe(0);
    expect(domainList.stdout).toContain('Payments Core');

    // 4. Ingest events
    const ingest = mos(['ingest', 'run', '--source', 'file', '--file', resolve(FIXTURES, 'example-events.json')]);
    expect(ingest.exitCode).toBe(0);
    expect(ingest.stdout).toContain('Ingested');
    expect(ingest.stdout).toContain('verifications');

    // 5. Status
    const status = mos(['status', '--person', 'alice']);
    expect(status.exitCode).toBe(0);
    expect(status.stdout).toContain('Trust Map');
    expect(status.stdout).toContain('alice');

    // 6. Status JSON format
    const statusJson = mos(['--format', 'json', 'status', '--person', 'alice']);
    expect(statusJson.exitCode).toBe(0);
    const parsed = JSON.parse(statusJson.stdout);
    expect(parsed.person).toBe('alice');

    // 7. Ready (should fail since not all concepts are verified)
    const ready = mos(['ready', '--person', 'alice', '--bundle', 'release-captain']);
    expect(ready.exitCode).toBe(2);
    expect(ready.stdout).toContain('NOT READY');

    // 8. Ready JSON format
    const readyJson = mos(['--format', 'json', 'ready', '--person', 'alice', '--bundle', 'release-captain']);
    expect(readyJson.exitCode).toBe(2);
    const readyParsed = JSON.parse(readyJson.stdout);
    expect(readyParsed.ready).toBe(false);

    // 9. Why
    const why = mos(['why', '--person', 'alice', '--concept', 'rollback-strategy']);
    expect(why.exitCode).toBe(0);
    expect(why.stdout).toContain('Trust Explanation');
    expect(why.stdout).toContain('rollback-strategy');

    // 10. Why JSON format
    const whyJson = mos(['--format', 'json', 'why', '--person', 'alice', '--concept', 'rollback-strategy']);
    expect(whyJson.exitCode).toBe(0);
    const whyParsed = JSON.parse(whyJson.stdout);
    expect(whyParsed.level).toBe('verified');

    // 11. Calibrate
    const calibrate = mos(['calibrate', '--person', 'alice']);
    expect(calibrate.exitCode).toBe(0);
    expect(calibrate.stdout).toContain('Calibration');

    // 12. Calibrate JSON format
    const calibrateJson = mos(['--format', 'json', 'calibrate', '--person', 'alice']);
    expect(calibrateJson.exitCode).toBe(0);
    const calParsed = JSON.parse(calibrateJson.stdout);
    expect(typeof calParsed.predictionAccuracy).toBe('number');

    // 13. Reviewers
    const reviewers = mos(['reviewers', '--concepts', 'auth-boundaries,cache-coherency', '--top', '3']);
    expect(reviewers.exitCode).toBe(0);
    expect(reviewers.stdout).toContain('bob');

    // 14. Reviewers JSON format
    const reviewersJson = mos(['--format', 'json', 'reviewers', '--concepts', 'auth-boundaries,cache-coherency']);
    expect(reviewersJson.exitCode).toBe(0);
    const revParsed = JSON.parse(reviewersJson.stdout);
    expect(revParsed.reviewers.length).toBeGreaterThan(0);
  });
});
