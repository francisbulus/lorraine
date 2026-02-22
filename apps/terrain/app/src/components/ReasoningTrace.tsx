'use client';

import { useState } from 'react';

export interface ReasoningTraceProps {
  reasoning: string;
}

export default function ReasoningTrace({ reasoning }: ReasoningTraceProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="reasoning-trace">
      <button
        className="reasoning-trace__toggle font-data"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '× hide reasoning' : '[see reasoning]'}
      </button>
      {expanded && (
        <div className="reasoning-trace__content font-voice">
          {reasoning}
        </div>
      )}
    </div>
  );
}
