import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSQLiteStore } from '@engine/store/sqlite';
import { loadConcepts } from '@engine/graph/load';
import { recordVerification } from '@engine/trust/record';
import { recordClaim } from '@engine/trust/claim';
import type { Store } from '@engine/store/interface';
import { computeCalibrationData } from './calibration-data';

let store: Store;

const CONCEPTS = [
  { id: 'tcp-basics', name: 'TCP Basics', description: 'TCP fundamentals' },
  { id: 'tcp-handshake', name: 'TCP Handshake', description: 'Three-way handshake' },
  { id: 'tcp-retransmission', name: 'TCP Retransmission', description: 'Retransmission mechanism' },
];

const EDGES = [
  { from: 'tcp-basics', to: 'tcp-handshake', type: 'prerequisite' as const, inferenceStrength: 0.6 },
];

const PERSON_ID = 'test-learner';
const CONCEPT_IDS = CONCEPTS.map((c) => c.id);

beforeEach(() => {
  store = createSQLiteStore(':memory:');
  loadConcepts(store, { concepts: CONCEPTS, edges: EDGES });
});

afterEach(() => {
  store.close();
});

describe('computeCalibrationData', () => {
  it('returns zero percent with no claims', () => {
    const data = computeCalibrationData(store, PERSON_ID, CONCEPT_IDS);
    expect(data.calibrationPercent).toBe(0);
    expect(data.aligned).toHaveLength(0);
    expect(data.overclaimed).toHaveLength(0);
    expect(data.underclaimed).toHaveLength(0);
  });

  it('categorizes aligned concept', () => {
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'test',
      source: 'internal',
    });
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      selfReportedConfidence: 0.3,
      context: 'I think I know TCP basics',
    });

    const data = computeCalibrationData(store, PERSON_ID, CONCEPT_IDS);
    expect(data.aligned.length).toBeGreaterThanOrEqual(1);
    expect(data.aligned.find((c) => c.conceptId === 'tcp-basics')).toBeDefined();
  });

  it('categorizes overclaimed concept', () => {
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      selfReportedConfidence: 0.9,
      context: 'I definitely know TCP basics',
    });

    const data = computeCalibrationData(store, PERSON_ID, CONCEPT_IDS);
    expect(data.overclaimed.length).toBeGreaterThanOrEqual(1);
    const overclaimed = data.overclaimed.find((c) => c.conceptId === 'tcp-basics');
    expect(overclaimed).toBeDefined();
    expect(overclaimed!.gap).toBeGreaterThan(0.1);
  });

  it('categorizes underclaimed concept', () => {
    // Strong verification evidence.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'grill:transfer',
      result: 'demonstrated',
      context: 'test',
      source: 'internal',
    });
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'sandbox:execution',
      result: 'demonstrated',
      context: 'test',
      source: 'internal',
    });
    // Low self-report.
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      selfReportedConfidence: 0.1,
      context: 'I am not sure about TCP basics',
    });

    const data = computeCalibrationData(store, PERSON_ID, CONCEPT_IDS);
    expect(data.underclaimed.length).toBeGreaterThanOrEqual(1);
    const underclaimed = data.underclaimed.find((c) => c.conceptId === 'tcp-basics');
    expect(underclaimed).toBeDefined();
    expect(underclaimed!.gap).toBeLessThan(-0.1);
  });

  it('computes calibration percent', () => {
    // One aligned, one overclaimed.
    recordVerification(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      modality: 'grill:recall',
      result: 'demonstrated',
      context: 'test',
      source: 'internal',
    });
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      selfReportedConfidence: 0.3,
      context: 'I know TCP basics',
    });
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-handshake',
      selfReportedConfidence: 0.95,
      context: 'I definitely know handshake',
    });

    const data = computeCalibrationData(store, PERSON_ID, CONCEPT_IDS);
    // 1 aligned out of 2 total = 50%
    expect(data.calibrationPercent).toBe(50);
  });

  it('includes calibrate result', () => {
    const data = computeCalibrationData(store, PERSON_ID, CONCEPT_IDS);
    expect(data.calibrateResult).toBeDefined();
    expect(typeof data.calibrateResult.recommendation).toBe('string');
  });

  it('includes gap values', () => {
    recordClaim(store, {
      personId: PERSON_ID,
      conceptId: 'tcp-basics',
      selfReportedConfidence: 0.8,
      context: 'claim',
    });

    const data = computeCalibrationData(store, PERSON_ID, CONCEPT_IDS);
    const entry = data.overclaimed.find((c) => c.conceptId === 'tcp-basics');
    expect(entry).toBeDefined();
    expect(entry!.claimConfidence).toBe(0.8);
    expect(typeof entry!.evidenceConfidence).toBe('number');
  });
});
