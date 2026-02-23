import type { OutputFormat } from '../types.js';

export function resolveFormat(formatStr: string): OutputFormat {
  if (formatStr === 'json' || formatStr === 'yaml' || formatStr === 'table') {
    return formatStr;
  }
  return 'table';
}

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputYaml(data: unknown): void {
  // Simple YAML-like output for Phase 1 (no yaml dependency)
  console.log(toYamlLike(data, 0));
}

function toYamlLike(value: unknown, indent: number): string {
  const prefix = '  '.repeat(indent);
  if (value === null || value === undefined) return `${prefix}null`;
  if (typeof value === 'string') return `${prefix}${value}`;
  if (typeof value === 'number' || typeof value === 'boolean') return `${prefix}${value}`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${prefix}[]`;
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) {
        const inner = toYamlLike(item, indent + 1);
        return `${prefix}- ${inner.trimStart()}`;
      }
      return `${prefix}- ${item}`;
    }).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.map(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        return `${prefix}${key}:\n${toYamlLike(val, indent + 1)}`;
      }
      return `${prefix}${key}: ${val}`;
    }).join('\n');
  }
  return `${prefix}${String(value)}`;
}
