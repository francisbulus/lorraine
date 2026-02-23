import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { loadConcepts } from '../engine.js';
import type { Store, EdgeType } from '../engine.js';
import type { DomainPack, DomainMetadata } from '../types.js';

const DOMAIN_META_FILE = '.mos-domains.json';

export function validateDomainPack(raw: unknown): { pack: DomainPack; errors: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { pack: { concepts: [], edges: [] }, errors: ['Domain pack must be a JSON object'] };
  }

  const obj = raw as Record<string, unknown>;

  // Validate concepts
  if (!Array.isArray(obj['concepts'])) {
    errors.push('Missing or invalid "concepts" array');
    return { pack: { concepts: [], edges: [] }, errors };
  }

  const concepts: DomainPack['concepts'] = [];
  for (const [i, c] of (obj['concepts'] as unknown[]).entries()) {
    if (!c || typeof c !== 'object') {
      errors.push(`concepts[${i}]: must be an object`);
      continue;
    }
    const concept = c as Record<string, unknown>;
    if (typeof concept['id'] !== 'string' || !concept['id']) {
      errors.push(`concepts[${i}]: missing or invalid "id"`);
      continue;
    }
    concepts.push({
      id: concept['id'] as string,
      name: (concept['name'] as string) ?? concept['id'] as string,
      description: (concept['description'] as string) ?? '',
    });
  }

  // Validate edges
  const edges: DomainPack['edges'] = [];
  const conceptIds = new Set(concepts.map((c) => c.id));

  if (Array.isArray(obj['edges'])) {
    for (const [i, e] of (obj['edges'] as unknown[]).entries()) {
      if (!e || typeof e !== 'object') {
        errors.push(`edges[${i}]: must be an object`);
        continue;
      }
      const edge = e as Record<string, unknown>;
      if (typeof edge['from'] !== 'string' || typeof edge['to'] !== 'string') {
        errors.push(`edges[${i}]: missing "from" or "to"`);
        continue;
      }
      if (!conceptIds.has(edge['from'] as string)) {
        errors.push(`edges[${i}]: "from" concept "${edge['from']}" not found`);
        continue;
      }
      if (!conceptIds.has(edge['to'] as string)) {
        errors.push(`edges[${i}]: "to" concept "${edge['to']}" not found`);
        continue;
      }
      edges.push({
        from: edge['from'] as string,
        to: edge['to'] as string,
        type: (edge['type'] as string) ?? 'related_to',
        inferenceStrength: typeof edge['inferenceStrength'] === 'number' ? edge['inferenceStrength'] : 0.5,
      });
    }
  }

  const pack: DomainPack = {
    id: (obj['id'] as string) ?? undefined,
    name: (obj['name'] as string) ?? undefined,
    description: (obj['description'] as string) ?? undefined,
    version: (obj['version'] as string) ?? undefined,
    concepts,
    edges,
    mappings: obj['mappings'] as DomainPack['mappings'],
    bundles: obj['bundles'] as DomainPack['bundles'],
  };

  return { pack, errors };
}

export function loadDomainPack(store: Store, filePath: string): {
  loaded: number;
  edgesCreated: number;
  errors: string[];
  pack: DomainPack;
} {
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const { pack, errors } = validateDomainPack(raw);

  if (errors.length > 0) {
    return { loaded: 0, edgesCreated: 0, errors, pack };
  }

  const result = loadConcepts(store, {
    concepts: pack.concepts,
    edges: pack.edges.map((e) => ({
      from: e.from,
      to: e.to,
      type: e.type as EdgeType,
      inferenceStrength: e.inferenceStrength,
    })),
  });

  return {
    loaded: result.loaded,
    edgesCreated: result.edgesCreated,
    errors: result.errors,
    pack,
  };
}

export function saveDomainMetadata(
  dbPath: string,
  pack: DomainPack,
  loaded: number,
  edgesCreated: number,
): void {
  const metaPath = resolve(dirname(dbPath), DOMAIN_META_FILE);
  const existing = loadDomainMetadataList(dbPath);
  const meta: DomainMetadata = {
    id: pack.id ?? pack.name ?? 'unknown',
    name: pack.name ?? pack.id ?? 'unknown',
    version: pack.version ?? '0.0',
    loadedAt: new Date().toISOString(),
    conceptCount: loaded,
    edgeCount: edgesCreated,
  };

  // Replace if same id exists, otherwise append
  const idx = existing.findIndex((m) => m.id === meta.id);
  if (idx >= 0) {
    existing[idx] = meta;
  } else {
    existing.push(meta);
  }

  writeFileSync(metaPath, JSON.stringify(existing, null, 2), 'utf-8');
}

export function loadDomainMetadataList(dbPath: string): DomainMetadata[] {
  const metaPath = resolve(dirname(dbPath), DOMAIN_META_FILE);
  if (!existsSync(metaPath)) return [];
  try {
    return JSON.parse(readFileSync(metaPath, 'utf-8'));
  } catch {
    return [];
  }
}
