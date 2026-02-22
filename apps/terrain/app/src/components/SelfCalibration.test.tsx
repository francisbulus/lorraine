import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SelfCalibration from './SelfCalibration';
import CalibrationSection from './CalibrationSection';
import type { CalibrationData, CalibrationConcept } from '../lib/calibration-data';
import type { CalibrateResult } from '@engine/types';

const BASE_CALIBRATE: CalibrateResult = {
  predictionAccuracy: 0.7,
  overconfidenceBias: 0.1,
  underconfidenceBias: 0.05,
  stalePercentage: 0.1,
  surpriseRate: 0.1,
  claimCalibration: 0.7,
  recommendation: 'Model is performing within acceptable parameters. Continue regular verification.',
};

const alignedConcept: CalibrationConcept = {
  conceptId: 'tcp-basics',
  category: 'aligned',
  claimConfidence: 0.7,
  evidenceConfidence: 0.75,
  gap: -0.05,
  trustLevel: 'verified',
};

const overclaimedConcept: CalibrationConcept = {
  conceptId: 'tcp-handshake',
  category: 'overclaimed',
  claimConfidence: 0.9,
  evidenceConfidence: 0.3,
  gap: 0.6,
  trustLevel: 'untested',
};

const underclaimedConcept: CalibrationConcept = {
  conceptId: 'tcp-retransmission',
  category: 'underclaimed',
  claimConfidence: 0.2,
  evidenceConfidence: 0.85,
  gap: -0.65,
  trustLevel: 'verified',
};

describe('SelfCalibration', () => {
  it('shows calibration percent', () => {
    const data: CalibrationData = {
      calibrationPercent: 73,
      aligned: [alignedConcept],
      overclaimed: [overclaimedConcept],
      underclaimed: [underclaimedConcept],
      calibrateResult: BASE_CALIBRATE,
    };

    render(<SelfCalibration data={data} />);
    expect(screen.getByText('73%')).toBeDefined();
    expect(screen.getByText(/the evidence agrees/)).toBeDefined();
  });

  it('shows trend when previousPercent provided', () => {
    const data: CalibrationData = {
      calibrationPercent: 73,
      aligned: [alignedConcept],
      overclaimed: [],
      underclaimed: [],
      calibrateResult: BASE_CALIBRATE,
    };

    render(<SelfCalibration data={data} previousPercent={61} />);
    expect(screen.getByText(/Your calibration is improving/)).toBeDefined();
    expect(screen.getByText(/61%/)).toBeDefined();
  });

  it('shows shift message when calibration decreased', () => {
    const data: CalibrationData = {
      calibrationPercent: 50,
      aligned: [alignedConcept],
      overclaimed: [overclaimedConcept],
      underclaimed: [],
      calibrateResult: BASE_CALIBRATE,
    };

    render(<SelfCalibration data={data} previousPercent={73} />);
    expect(screen.getByText(/Your calibration has shifted/)).toBeDefined();
  });

  it('shows empty state', () => {
    const data: CalibrationData = {
      calibrationPercent: 0,
      aligned: [],
      overclaimed: [],
      underclaimed: [],
      calibrateResult: BASE_CALIBRATE,
    };

    render(<SelfCalibration data={data} />);
    expect(screen.getByText(/Not enough data yet/)).toBeDefined();
  });

  it('renders recommendation', () => {
    const data: CalibrationData = {
      calibrationPercent: 50,
      aligned: [alignedConcept],
      overclaimed: [overclaimedConcept],
      underclaimed: [],
      calibrateResult: BASE_CALIBRATE,
    };

    render(<SelfCalibration data={data} />);
    expect(screen.getByText(BASE_CALIBRATE.recommendation)).toBeDefined();
  });

  it('has correct aria-label', () => {
    const data: CalibrationData = {
      calibrationPercent: 73,
      aligned: [alignedConcept],
      overclaimed: [],
      underclaimed: [],
      calibrateResult: BASE_CALIBRATE,
    };

    render(<SelfCalibration data={data} />);
    expect(screen.getByRole('region', { name: 'Self-calibration' })).toBeDefined();
  });
});

describe('CalibrationSection', () => {
  it('renders aligned section', () => {
    render(
      <CalibrationSection title="Aligned" category="aligned" concepts={[alignedConcept]} />
    );
    expect(screen.getByText('Aligned')).toBeDefined();
    expect(screen.getByText('tcp-basics')).toBeDefined();
    expect(screen.getByText(/evidence confirms/)).toBeDefined();
  });

  it('renders overclaimed section with percentages', () => {
    render(
      <CalibrationSection title="Overclaimed" category="overclaimed" concepts={[overclaimedConcept]} />
    );
    expect(screen.getByText('Overclaimed')).toBeDefined();
    expect(screen.getByText(/claimed 90%/)).toBeDefined();
    expect(screen.getByText(/evidence 30%/)).toBeDefined();
  });

  it('renders underclaimed section with percentages', () => {
    render(
      <CalibrationSection title="Underclaimed" category="underclaimed" concepts={[underclaimedConcept]} />
    );
    expect(screen.getByText('Underclaimed')).toBeDefined();
    expect(screen.getByText(/claimed 20%/)).toBeDefined();
    expect(screen.getByText(/evidence 85%/)).toBeDefined();
  });

  it('renders glyphs correctly', () => {
    render(
      <CalibrationSection title="Aligned" category="aligned" concepts={[alignedConcept]} />
    );
    expect(screen.getByText('●')).toBeDefined();
  });

  it('returns null for empty concepts', () => {
    const { container } = render(
      <CalibrationSection title="Empty" category="aligned" concepts={[]} />
    );
    expect(container.innerHTML).toBe('');
  });
});
