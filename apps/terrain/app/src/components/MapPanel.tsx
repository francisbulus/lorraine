'use client';

export interface MapPanelProps {
  open: boolean;
}

export default function MapPanel({ open }: MapPanelProps) {
  return (
    <aside
      className={`map-panel ${open ? 'map-panel--open' : 'map-panel--closed'}`}
      aria-label="Map"
    >
      <div className="map-panel__content">
        <p className="map-panel__empty font-data">
          No terrain yet.
        </p>
      </div>
    </aside>
  );
}
