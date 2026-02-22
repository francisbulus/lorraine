'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from './TopBar';
import type { AppState } from './TopBar';
import ConversationPanel from './ConversationPanel';
import MapView from './MapView';
import Drawer from './Drawer';
import ConceptDetail from './ConceptDetail';
import SelfCalibration from './SelfCalibration';
import type { ConceptDetailProps } from './ConceptDetail';
import type { SelfCalibrationProps } from './SelfCalibration';
import type { VisualMapConcept, VisualMapEdge } from './VisualMap';
import type { TerritoryState } from '../lib/territory-state';

export interface DrawerState {
  type: 'concept' | 'calibration';
  conceptDetail?: ConceptDetailProps;
  calibrationData?: SelfCalibrationProps;
}

export default function AppShell() {
  const [appState, setAppState] = useState<AppState>('conversation');
  const [sessionStart] = useState(() => Date.now());
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  // Placeholder data — will be wired to real sources in later tasks.
  const [concepts] = useState<VisualMapConcept[]>([]);
  const [edges] = useState<VisualMapEdge[]>([]);
  const [territories] = useState<TerritoryState[]>([]);

  const toggleState = useCallback(() => {
    setAppState((s) => (s === 'conversation' ? 'map' : 'conversation'));
  }, []);

  const openCalibrationDrawer = useCallback(() => {
    setDrawer({ type: 'calibration' });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
  }, []);

  const handleConceptClick = useCallback((conceptId: string) => {
    // In a wired app, this would load concept detail from engine.
    // For now, open drawer with placeholder.
    setDrawer({
      type: 'concept',
      conceptDetail: {
        conceptName: conceptId,
        trustState: {
          conceptId,
          personId: '',
          level: 'untested',
          decayedConfidence: 0,
          rawConfidence: 0,
          modalitiesTested: [],
          verificationCount: 0,
          lastVerified: null,
          verificationHistory: [],
          claimHistory: [],
          calibrationGap: null,
        },
      },
    });
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'm') {
        e.preventDefault();
        toggleState();
      }
      if (mod && e.key === '.') {
        e.preventDefault();
        // Toggle context drawer — if open, close; if closed, no-op (needs a concept).
        if (drawer?.type === 'concept') {
          closeDrawer();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleState, closeDrawer, drawer]);

  return (
    <div className="app-shell">
      <TopBar
        appState={appState}
        onToggleState={toggleState}
        onCalibrationClick={openCalibrationDrawer}
        sessionStart={sessionStart}
        hasCalibrationData={false}
      />

      <div className="app-main">
        {appState === 'conversation' ? (
          <div className="conversation-state">
            <ConversationPanel />
          </div>
        ) : (
          <MapView
            concepts={concepts}
            edges={edges}
            territories={territories}
            onConceptClick={handleConceptClick}
          />
        )}
      </div>

      <Drawer
        open={drawer !== null}
        onClose={closeDrawer}
        ariaLabel={drawer?.type === 'calibration' ? 'Calibration' : 'Concept detail'}
      >
        {drawer?.type === 'concept' && drawer.conceptDetail && (
          <ConceptDetail {...drawer.conceptDetail} />
        )}
        {drawer?.type === 'calibration' && drawer.calibrationData && (
          <SelfCalibration {...drawer.calibrationData} />
        )}
      </Drawer>
    </div>
  );
}
