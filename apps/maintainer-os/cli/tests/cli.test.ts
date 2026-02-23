import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const CLI_PATH = resolve(import.meta.dirname, '../src/cli.ts');

function runMos(args: string[]): string {
  return execFileSync('npx', ['tsx', CLI_PATH, ...args], {
    cwd: resolve(import.meta.dirname, '..'),
    encoding: 'utf-8',
    timeout: 10_000,
  });
}

describe('mos CLI', () => {
  it('prints help with command list', () => {
    const output = runMos(['--help']);
    expect(output).toContain('MaintainerOS');
    expect(output).toContain('init');
    expect(output).toContain('domain');
    expect(output).toContain('ingest');
    expect(output).toContain('status');
    expect(output).toContain('ready');
    expect(output).toContain('why');
    expect(output).toContain('reviewers');
    expect(output).toContain('calibrate');
    expect(output).toContain('retract');
  });

  it('prints version', () => {
    const output = runMos(['--version']);
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
