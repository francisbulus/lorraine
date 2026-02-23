import { readFileSync } from 'node:fs';
import { recordVerification, recordClaim, propagateTrust } from '../engine.js';
import type { Store, Modality, VerificationResult } from '../engine.js';

const VALID_MODALITIES = new Set([
  'grill:recall', 'grill:inference', 'grill:transfer', 'grill:discrimination',
  'sandbox:execution', 'sandbox:debugging',
  'write:explanation', 'write:teaching',
  'sketch:diagram', 'sketch:process',
  'integrated:use', 'external:observed',
]);

const VALID_RESULTS = new Set(['demonstrated', 'failed', 'partial']);

interface RawEvent {
  type?: string;
  conceptId?: string;
  personId?: string;
  modality?: string;
  result?: string;
  context?: string;
  source?: string;
  timestamp?: string;
  selfReportedConfidence?: number;
}

export interface IngestResult {
  processed: number;
  verifications: number;
  claims: number;
  skipped: number;
  errors: string[];
  conceptsAffected: Set<string>;
  peopleAffected: Set<string>;
}

export function ingestEventsFromFile(store: Store, filePath: string): IngestResult {
  const content = readFileSync(filePath, 'utf-8');
  const events = parseEvents(content, filePath);
  return ingestEvents(store, events);
}

function parseEvents(content: string, filePath: string): RawEvent[] {
  if (filePath.endsWith('.csv')) {
    return parseCsv(content);
  }
  return JSON.parse(content) as RawEvent[];
}

function parseCsv(content: string): RawEvent[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]!] = values[i] ?? '';
    }
    return obj as unknown as RawEvent;
  });
}

function ingestEvents(store: Store, events: RawEvent[]): IngestResult {
  const result: IngestResult = {
    processed: 0,
    verifications: 0,
    claims: 0,
    skipped: 0,
    errors: [],
    conceptsAffected: new Set(),
    peopleAffected: new Set(),
  };

  for (const [i, event] of events.entries()) {
    const validation = validateEvent(event, i);
    if (validation) {
      result.errors.push(validation);
      result.skipped++;
      continue;
    }

    try {
      if (event.type === 'claim') {
        recordClaim(store, {
          personId: event.personId!,
          conceptId: event.conceptId!,
          selfReportedConfidence: event.selfReportedConfidence!,
          context: event.context ?? '',
          timestamp: event.timestamp ? new Date(event.timestamp).getTime() : undefined,
        });
        result.claims++;
      } else {
        const ts = event.timestamp ? new Date(event.timestamp).getTime() : undefined;
        const verificationResult = recordVerification(store, {
          personId: event.personId!,
          conceptId: event.conceptId!,
          modality: event.modality as Modality,
          result: event.result as VerificationResult,
          context: event.context ?? '',
          source: (event.source as 'internal' | 'external') ?? 'external',
          timestamp: ts,
        });

        propagateTrust(store, {
          personId: event.personId!,
          sourceConceptId: event.conceptId!,
          verificationEvent: {
            id: `ingest_${i}`,
            personId: event.personId!,
            conceptId: event.conceptId!,
            modality: event.modality as Modality,
            result: event.result as VerificationResult,
            context: event.context ?? '',
            source: (event.source as 'internal' | 'external') ?? 'external',
            timestamp: ts ?? Date.now(),
          },
        });

        result.verifications++;
      }

      result.conceptsAffected.add(event.conceptId!);
      result.peopleAffected.add(event.personId!);
      result.processed++;
    } catch (err) {
      result.errors.push(`Event ${i}: ${err instanceof Error ? err.message : String(err)}`);
      result.skipped++;
    }
  }

  return result;
}

function validateEvent(event: RawEvent, index: number): string | null {
  if (!event.personId) return `Event ${index}: missing personId`;
  if (!event.conceptId) return `Event ${index}: missing conceptId`;

  if (event.type === 'claim') {
    if (typeof event.selfReportedConfidence !== 'number' || event.selfReportedConfidence < 0 || event.selfReportedConfidence > 1) {
      return `Event ${index}: claim requires selfReportedConfidence between 0 and 1`;
    }
    return null;
  }

  // Default to verification
  if (!event.type) event.type = 'verification';
  if (event.type !== 'verification') return `Event ${index}: unknown type "${event.type}"`;
  if (!event.modality || !VALID_MODALITIES.has(event.modality)) {
    return `Event ${index}: invalid modality "${event.modality}"`;
  }
  if (!event.result || !VALID_RESULTS.has(event.result)) {
    return `Event ${index}: invalid result "${event.result}"`;
  }

  return null;
}
