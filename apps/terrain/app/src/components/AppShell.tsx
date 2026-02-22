'use client';

import { useState, useEffect, useCallback } from 'react';
import TopBar from './TopBar';
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
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [sessionStart] = useState(() => Date.now());
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  const session = useSession();

  // Initialize session on mount.
  useEffect(() => {
    if (!session.initialized) {
      session.initSession();
    }
  }, [session.initialized, session.initSession]);

  const openCalibrationDrawer = useCallback(() => {
    setDrawer({ type: 'calibration' });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
  }, []);

  const handleConceptClick = useCallback((conceptId: string) => {
    setSelectedConcept(conceptId);
    session.focusConcept(conceptId);
  }, [session.focusConcept]);

  const handleCloseConversation = useCallback(() => {
    setSelectedConcept(null);
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedConcept) {
          setSelectedConcept(null);
        }
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === '.') {
        e.preventDefault();
        if (drawer?.type === 'concept') {
          closeDrawer();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDrawer, drawer, selectedConcept]);

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

  // Find focused concept name for top bar.
  const focusedConceptName = selectedConcept
    ? session.concepts.find((c) => c.id === selectedConcept)?.name ?? null
    : null;

  const isSplit = selectedConcept !== null;

  return (
    <div className="app-shell">
      <TopBar
        onCalibrationClick={openCalibrationDrawer}
        sessionStart={sessionStart}
        hasCalibrationData={hasCalibrationData}
        focusedConcept={focusedConceptName}
      />

      <div className={`app-main ${isSplit ? 'app-main--split' : 'app-main--map-full'}`}>
        <div className={isSplit ? 'app-main__map' : undefined}>
          <MapView
            concepts={session.concepts}
            edges={session.edges}
            territories={session.territories}
            activeConcept={selectedConcept}
            onConceptClick={handleConceptClick}
          />
        </div>
        {isSplit && (
          <div className="app-main__conversation">
            <ConversationPanel
              messages={session.messages}
              trustUpdates={session.trustUpdates}
              onSubmit={session.sendMessage}
              loading={session.loading}
              error={session.error}
              sandboxActive={session.sandboxActive}
              sandboxConceptId={session.sandboxConceptId}
              onSandboxRun={session.runSandboxCode}
              onSandboxClose={session.closeSandbox}
            />
          </div>
        )}
        {!isSplit && session.concepts.length > 0 && (
          <div className="map-hint font-system">
            Click any concept to begin.
          </div>
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
