'use client';

import type { CalibrationData } from '../lib/calibration-data';
import CalibrationSection from './CalibrationSection';

export interface SelfCalibrationProps {
  data: CalibrationData;
  previousPercent?: number | null;
}

export default function SelfCalibration({
  data,
  previousPercent = null,
}: SelfCalibrationProps) {
  const hasData = data.aligned.length + data.overclaimed.length + data.underclaimed.length > 0;

  if (!hasData) {
    return (
      <div className="self-calibration" role="region" aria-label="Self-calibration">
        <h2 className="self-calibration__title font-voice">Your Calibration</h2>
        <p className="self-calibration__empty font-voice">
          Not enough data yet. Make some claims and verify them to see your calibration.
        </p>
      </div>
    );
  }

  return (
    <div className="self-calibration" role="region" aria-label="Self-calibration">
      <h2 className="self-calibration__title font-voice">Your Calibration</h2>

      <p className="self-calibration__metric font-voice">
        When you say you know something, the evidence agrees{' '}
        <span className="self-calibration__percent font-data">
          {data.calibrationPercent}%
        </span>{' '}
        of the time.
      </p>

      {previousPercent !== null && previousPercent !== data.calibrationPercent && (
        <p className="self-calibration__trend font-voice">
          {data.calibrationPercent > previousPercent
            ? `Your calibration is improving. Previously: ${previousPercent}%. Now: ${data.calibrationPercent}%.`
            : `Your calibration has shifted. Previously: ${previousPercent}%. Now: ${data.calibrationPercent}%.`}
        </p>
      )}

      <div className="self-calibration__sections">
        <CalibrationSection
          title="Aligned"
          category="aligned"
          concepts={data.aligned}
        />
        <CalibrationSection
          title="Overclaimed"
          category="overclaimed"
          concepts={data.overclaimed}
        />
        <CalibrationSection
          title="Underclaimed"
          category="underclaimed"
          concepts={data.underclaimed}
        />
      </div>

      <p className="self-calibration__recommendation font-voice">
        {data.calibrateResult.recommendation}
      </p>
    </div>
  );
}
