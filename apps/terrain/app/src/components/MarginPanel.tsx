'use client';

import ConceptDetail from './ConceptDetail';
import type { ConceptDetailProps } from './ConceptDetail';

export interface MarginPanelProps {
  open: boolean;
  conceptDetail?: ConceptDetailProps | null;
}

export default function MarginPanel({ open, conceptDetail = null }: MarginPanelProps) {
  return (
    <aside
      className={`margin-panel ${open ? 'margin-panel--open' : 'margin-panel--closed'}`}
      aria-label="Margin"
    >
      <div className="margin-panel__content">
        {conceptDetail ? (
          <div className="margin-panel__detail">
            <ConceptDetail {...conceptDetail} />
          </div>
        ) : (
          <p className="margin-panel__empty font-data">
            No context yet.
          </p>
        )}
      </div>
    </aside>
  );
}
