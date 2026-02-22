'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from './TopBar';
import type { AppState } from './TopBar';
import ConversationPanel from './ConversationPanel';
import MapView from './MapView';
import Drawer from './Drawer';
import ConceptDetail from './ConceptDetail';
import SelfCalibration from './SelfCalibration';
import { useSession } from '../hooks/useSession';

export interface DrawerState {
  type: 'concept' | 'calibration';
  conceptId?: string;
}

export default function AppShell() {
  const [appState, setAppState] = useState<AppState>('conversation');
  const [sessionStart] = useState(() => Date.now());
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  const session = useSession();

  // Initialize session on mount.
  useEffect(() => {
    if (!session.initialized) {
      session.initSession();
    }
  }, [session.initialized, session.initSession]);

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
    setDrawer({ type: 'concept', conceptId });
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
        if (drawer?.type === 'concept') {
          closeDrawer();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleState, closeDrawer, drawer]);

  // Build concept detail for drawer.
  const drawerConceptDetail = drawer?.type === 'concept' && drawer.conceptId
    ? (() => {
        const ts = session.getTrustStateForConcept(drawer.conceptId);
        if (!ts) return null;
        const concept = session.concepts.find((c) => c.id === drawer.conceptId);
        return {
          conceptName: concept?.name ?? drawer.conceptId,
          trustState: ts,
        };
      })()
    : null;

  const hasCalibrationData = session.calibration !== null &&
    (session.calibration.aligned.length +
      session.calibration.overclaimed.length +
      session.calibration.underclaimed.length) > 0;

  return (
    <div className="app-shell">
      <TopBar
        appState={appState}
        onToggleState={toggleState}
        onCalibrationClick={openCalibrationDrawer}
        sessionStart={sessionStart}
        hasCalibrationData={hasCalibrationData}
      />

      <div className="app-main">
        {appState === 'conversation' ? (
          <div className="conversation-state">
            <ConversationPanel
              messages={session.messages}
              trustUpdates={session.trustUpdates}
              onSubmit={session.sendMessage}
              loading={session.loading}
              error={session.error}
            />
          </div>
        ) : (
          <MapView
            concepts={session.concepts}
            edges={session.edges}
            territories={session.territories}
            onConceptClick={handleConceptClick}
          />
        )}
      </div>

      <Drawer
        open={drawer !== null}
        onClose={closeDrawer}
        ariaLabel={drawer?.type === 'calibration' ? 'Calibration' : 'Concept detail'}
      >
        {drawer?.type === 'concept' && drawerConceptDetail && (
          <ConceptDetail {...drawerConceptDetail} />
        )}
        {drawer?.type === 'calibration' && session.calibration && (
          <SelfCalibration data={session.calibration} />
        )}
      </Drawer>
    </div>
  );
}
