'use client';

export interface TrustUpdateAnnotationProps {
  conceptId: string;
  newLevel: string;
  reason: string;
}

export default function TrustUpdateAnnotation({
  conceptId,
  newLevel,
  reason,
}: TrustUpdateAnnotationProps) {
  return (
    <div className="trust-annotation font-data" role="status">
      <span className="trust-annotation__line">
        ——— {conceptId} → {newLevel} ({reason}) ———
      </span>
    </div>
  );
}
