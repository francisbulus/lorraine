import { describe, it, expect } from 'vitest';
import { executeCode, checkSandboxSafety } from './code-executor';

describe('checkSandboxSafety', () => {
  it('allows safe code', () => {
    expect(checkSandboxSafety('console.log(1 + 2)')).toBeNull();
    expect(checkSandboxSafety('const x = [1, 2, 3].map(n => n * 2)')).toBeNull();
  });

  it('blocks process access', () => {
    const result = checkSandboxSafety('process.exit(1)');
    expect(result).toContain('process');
  });

  it('blocks require', () => {
    const result = checkSandboxSafety('const fs = require("fs")');
    expect(result).toContain('require');
  });

  it('blocks eval', () => {
    const result = checkSandboxSafety('eval("alert(1)")');
    expect(result).toContain('eval');
  });

  it('blocks fetch', () => {
    const result = checkSandboxSafety('fetch("https://example.com")');
    expect(result).toContain('fetch');
  });

  it('blocks document access', () => {
    const result = checkSandboxSafety('document.createElement("div")');
    expect(result).toContain('document');
  });
});

describe('executeCode', () => {
  it('executes simple arithmetic', async () => {
    const result = await executeCode('console.log(2 + 3)');
    expect(result.success).toBe(true);
    expect(result.output).toBe('5');
    expect(result.error).toBeNull();
  });

  it('captures multiple console.log calls', async () => {
    const result = await executeCode('console.log("a"); console.log("b")');
    expect(result.success).toBe(true);
    expect(result.output).toBe('a\nb');
  });

  it('returns return value when no logs', async () => {
    const result = await executeCode('return 42');
    expect(result.success).toBe(true);
    expect(result.output).toBe('42');
  });

  it('handles runtime errors', async () => {
    const result = await executeCode('throw new Error("boom")');
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
  });

  it('handles syntax errors', async () => {
    const result = await executeCode('const x = {');
    expect(result.success).toBe(false);
    expect(result.error).not.toBeNull();
  });

  it('rejects unsafe code before execution', async () => {
    const result = await executeCode('process.exit(1)');
    expect(result.success).toBe(false);
    expect(result.error).toContain('process');
    expect(result.duration).toBe(0);
  });

  it('provides Math in sandbox', async () => {
    const result = await executeCode('console.log(Math.max(1, 5, 3))');
    expect(result.success).toBe(true);
    expect(result.output).toBe('5');
  });

  it('provides Array methods in sandbox', async () => {
    const result = await executeCode('console.log([1,2,3].filter(n => n > 1).length)');
    expect(result.success).toBe(true);
    expect(result.output).toBe('2');
  });

  it('reports duration', async () => {
    const result = await executeCode('console.log("fast")');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('captures console.error', async () => {
    const result = await executeCode('console.error("bad")');
    expect(result.success).toBe(true);
    expect(result.output).toBe('[error] bad');
  });
});
