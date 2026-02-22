'use client';

import type { CalibrationConcept, CalibrationCategory } from '../lib/calibration-data';

export interface CalibrationSectionProps {
  title: string;
  category: CalibrationCategory;
  concepts: CalibrationConcept[];
}

const GLYPH_MAP: Record<string, string> = {
  verified: '●',
  inferred: '○',
  contested: '◐',
  untested: '◌',
};

export default function CalibrationSection({
  title,
  category,
  concepts,
}: CalibrationSectionProps) {
  if (concepts.length === 0) return null;

  return (
    <div className="calibration-section" data-category={category}>
      <h3 className="calibration-section__title font-voice">{title}</h3>
      <ul className="calibration-section__list">
        {concepts.map((c) => (
          <li key={c.conceptId} className="calibration-section__item">
            <span className="calibration-section__glyph">
              {GLYPH_MAP[c.trustLevel] ?? '◌'}
            </span>
            <span className="calibration-section__name font-voice">
              {c.conceptId}
            </span>
            <span className="calibration-section__detail font-data">
              {category === 'overclaimed' && (
                <>claimed {Math.round(c.claimConfidence * 100)}%, evidence {Math.round(c.evidenceConfidence * 100)}%</>
              )}
              {category === 'underclaimed' && (
                <>claimed {Math.round(c.claimConfidence * 100)}%, evidence {Math.round(c.evidenceConfidence * 100)}%</>
              )}
              {category === 'aligned' && (
                <>claimed {Math.round(c.claimConfidence * 100)}%, evidence confirms</>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
