'use client';

import { useState, useEffect, useRef } from 'react';

export interface LevelChangeNotificationProps {
  conceptId: string;
  newLevel: string;
  reason: string;
  onSeeReasoning?: () => void;
  autoDismissMs?: number;
}

export default function LevelChangeNotification({
  conceptId,
  newLevel,
  reason,
  onSeeReasoning,
  autoDismissMs = 5000,
}: LevelChangeNotificationProps) {
  const [visible, setVisible] = useState(true);
  const [interacted, setInteracted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!interacted && autoDismissMs > 0) {
      timerRef.current = setTimeout(() => setVisible(false), autoDismissMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [interacted, autoDismissMs]);

  if (!visible) return null;

  function handleInteraction() {
    setInteracted(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  return (
    <div
      className="level-change"
      onMouseEnter={handleInteraction}
      role="status"
      aria-label={`${conceptId} changed to ${newLevel}`}
    >
      <span className="level-change__line font-data">
        ─── {conceptId} → {newLevel} ───
      </span>
      <span className="level-change__reason font-data">
        {reason}
      </span>
      {onSeeReasoning && (
        <button
          className="level-change__link font-data"
          onClick={() => {
            handleInteraction();
            onSeeReasoning();
          }}
        >
          [see reasoning]
        </button>
      )}
    </div>
  );
}
