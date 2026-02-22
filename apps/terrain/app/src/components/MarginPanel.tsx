'use client';

export interface MarginPanelProps {
  open: boolean;
}

export default function MarginPanel({ open }: MarginPanelProps) {
  return (
    <aside
      className={`margin-panel ${open ? 'margin-panel--open' : 'margin-panel--closed'}`}
      aria-label="Margin"
    >
      <div className="margin-panel__content">
        <p className="margin-panel__empty font-data">
          No context yet.
        </p>
      </div>
    </aside>
  );
}
