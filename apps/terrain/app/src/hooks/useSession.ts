'use client';

import { useState, useCallback, useRef } from 'react';
import type { ConversationMessage, TrustUpdate } from '../components/Conversation';
import type { TerritoryState } from '../lib/territory-state';
import type { VisualMapConcept, VisualMapEdge } from '../components/VisualMap';
import type { CalibrationData } from '../lib/calibration-data';
import type { TrustState } from '@engine/types';
import type { ExecutionResult } from '../lib/code-executor';

export type Mode = 'conversation' | 'explain' | 'sandbox' | 'grill' | 'write';

export interface SessionState {
  sessionId: string | null;
  messages: ConversationMessage[];
  trustUpdates: TrustUpdate[];
  trustStates: Record<string, TrustState>;
  concepts: VisualMapConcept[];
  edges: VisualMapEdge[];
  territories: TerritoryState[];
  calibration: CalibrationData | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  mode: Mode;
  sandboxActive: boolean;
  sandboxConceptId: string | null;
  focusedConceptId: string | null;
}

export interface SandboxRunResponse {
  execution: ExecutionResult;
  annotation: string;
  suggestion: string | null;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    messages: [],
    trustUpdates: [],
    trustStates: {},
    concepts: [],
    edges: [],
    territories: [],
    calibration: null,
    loading: false,
    error: null,
    initialized: false,
    mode: 'conversation',
    sandboxActive: false,
    sandboxConceptId: null,
    focusedConceptId: null,
  });

  const messageCounter = useRef(0);
  const trustUpdateCounter = useRef(0);

  const sendMessage = useCallback(async (text: string) => {
    // Add learner message immediately.
    const learnerId = `msg_${++messageCounter.current}`;
    const learnerMessage: ConversationMessage = {
      id: learnerId,
      role: 'learner',
      content: text,
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, learnerMessage],
      loading: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: state.sessionId,
          action: 'chat',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Add agent message.
      const agentId = `msg_${++messageCounter.current}`;
      const agentMessage: ConversationMessage = {
        id: agentId,
        role: 'agent',
        content: data.agentResponse,
      };

      // Build trust updates.
      const newTrustUpdates: TrustUpdate[] = (data.trustUpdates ?? []).map(
        (u: { conceptId: string; newLevel: string; reason: string }) => ({
          id: `tu_${++trustUpdateCounter.current}`,
          afterMessageId: agentId,
          conceptId: u.conceptId,
          newLevel: u.newLevel,
          reason: u.reason,
        })
      );

      setState((prev) => ({
        ...prev,
        sessionId: data.sessionId ?? prev.sessionId,
        messages: [...prev.messages, agentMessage],
        trustUpdates: [...prev.trustUpdates, ...newTrustUpdates],
        trustStates: data.trustStates ?? prev.trustStates,
        concepts: data.concepts ?? prev.concepts,
        edges: data.edges ?? prev.edges,
        territories: data.territories ?? prev.territories,
        calibration: data.calibration ?? prev.calibration,
        loading: false,
        mode: data.mode ?? prev.mode,
        sandboxActive: !!data.sandboxStarted || (data.mode === 'sandbox' && prev.sandboxActive),
        sandboxConceptId: data.sandboxStarted?.conceptId ?? (data.mode === 'sandbox' ? prev.sandboxConceptId : null),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Something went wrong',
      }));
    }
  }, [state.sessionId]);

  const runSandboxCode = useCallback(async (code: string): Promise<SandboxRunResponse> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sandbox-run',
          code,
          sessionId: state.sessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Build trust updates from sandbox signals.
      const newTrustUpdates: TrustUpdate[] = (data.trustUpdates ?? []).map(
        (u: { conceptId: string; newLevel: string; reason: string }) => ({
          id: `tu_${++trustUpdateCounter.current}`,
          afterMessageId: `sandbox_run_${Date.now()}`,
          conceptId: u.conceptId,
          newLevel: u.newLevel,
          reason: u.reason,
        })
      );

      setState((prev) => ({
        ...prev,
        trustUpdates: [...prev.trustUpdates, ...newTrustUpdates],
        trustStates: data.trustStates ?? prev.trustStates,
        concepts: data.concepts ?? prev.concepts,
        edges: data.edges ?? prev.edges,
        territories: data.territories ?? prev.territories,
        calibration: data.calibration ?? prev.calibration,
      }));

      return {
        execution: data.execution,
        annotation: data.annotation,
        suggestion: data.suggestion,
      };
    } catch (err) {
      return {
        execution: {
          success: false,
          output: '',
          error: err instanceof Error ? err.message : 'Sandbox error',
          duration: 0,
        },
        annotation: '',
        suggestion: null,
      };
    }
  }, [state.sessionId]);

  const closeSandbox = useCallback(async () => {
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end-mode',
          sessionId: state.sessionId,
        }),
      });
    } catch {
      // Best-effort close.
    }

    setState((prev) => ({
      ...prev,
      sandboxActive: false,
      sandboxConceptId: null,
      mode: 'conversation',
    }));
  }, [state.sessionId]);

  const initSession = useCallback(async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        sessionId: data.sessionId,
        concepts: data.concepts ?? [],
        edges: data.edges ?? [],
        territories: data.territories ?? [],
        trustStates: data.trustStates ?? {},
        calibration: data.calibration ?? null,
        mode: data.mode ?? 'conversation',
        initialized: true,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to initialize session',
        initialized: true,
      }));
    }
  }, []);

  const getTrustStateForConcept = useCallback(
    (conceptId: string): TrustState | null => {
      return state.trustStates[conceptId] ?? null;
    },
    [state.trustStates]
  );

  const focusConcept = useCallback(async (conceptId: string) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      focusedConceptId: conceptId,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'focus-concept',
          conceptId,
          sessionId: state.sessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Add agent message.
      const agentId = `msg_${++messageCounter.current}`;
      const agentMessage: ConversationMessage = {
        id: agentId,
        role: 'agent',
        content: data.agentResponse,
      };

      // Build trust updates.
      const newTrustUpdates: TrustUpdate[] = (data.trustUpdates ?? []).map(
        (u: { conceptId: string; newLevel: string; reason: string }) => ({
          id: `tu_${++trustUpdateCounter.current}`,
          afterMessageId: agentId,
          conceptId: u.conceptId,
          newLevel: u.newLevel,
          reason: u.reason,
        })
      );

      setState((prev) => ({
        ...prev,
        sessionId: data.sessionId ?? prev.sessionId,
        messages: [...prev.messages, agentMessage],
        trustUpdates: [...prev.trustUpdates, ...newTrustUpdates],
        trustStates: data.trustStates ?? prev.trustStates,
        concepts: data.concepts ?? prev.concepts,
        edges: data.edges ?? prev.edges,
        territories: data.territories ?? prev.territories,
        calibration: data.calibration ?? prev.calibration,
        loading: false,
        mode: data.mode ?? prev.mode,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Something went wrong',
      }));
    }
  }, [state.sessionId]);

  return {
    ...state,
    sendMessage,
    initSession,
    getTrustStateForConcept,
    runSandboxCode,
    closeSandbox,
    focusConcept,
  };
}
