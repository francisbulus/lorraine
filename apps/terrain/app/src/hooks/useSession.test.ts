import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';

describe('useSession', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('starts with empty initial state', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.messages).toEqual([]);
    expect(result.current.sessionId).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.initialized).toBe(false);
  });

  it('initSession fetches and sets session data', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        concepts: [{ id: 'tcp', name: 'TCP', trustLevel: 'untested' }],
        edges: [],
        territories: [],
        trustStates: {},
        calibration: null,
      }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.initSession();
    });

    expect(result.current.sessionId).toBe('test-session');
    expect(result.current.concepts).toHaveLength(1);
    expect(result.current.initialized).toBe(true);
  });

  it('sendMessage adds learner message and then agent response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        agentResponse: 'TCP is a transport protocol.',
        trustUpdates: [],
        concepts: [],
        edges: [],
        territories: [],
        trustStates: {},
        calibration: null,
      }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.sendMessage('What is TCP?');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('learner');
    expect(result.current.messages[0].content).toBe('What is TCP?');
    expect(result.current.messages[1].role).toBe('agent');
    expect(result.current.messages[1].content).toBe('TCP is a transport protocol.');
  });

  it('sendMessage creates trust updates from response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        agentResponse: 'Correct.',
        trustUpdates: [
          { conceptId: 'tcp-basics', newLevel: 'inferred', reason: 'correct usage' },
        ],
        concepts: [],
        edges: [],
        territories: [],
        trustStates: {},
        calibration: null,
      }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.sendMessage('TCP provides reliable delivery');
    });

    expect(result.current.trustUpdates).toHaveLength(1);
    expect(result.current.trustUpdates[0].conceptId).toBe('tcp-basics');
    expect(result.current.trustUpdates[0].newLevel).toBe('inferred');
  });

  it('handles API errors gracefully', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.loading).toBe(false);
    // Learner message was added before the error.
    expect(result.current.messages).toHaveLength(1);
  });

  it('sets loading while waiting for response', async () => {
    let resolvePromise: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    fetchSpy.mockReturnValueOnce(pending);

    const { result } = renderHook(() => useSession());

    // Start sending — don't await.
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('hello');
    });

    // Loading should be true now.
    expect(result.current.loading).toBe(true);

    // Resolve the fetch.
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => ({
          sessionId: 's',
          agentResponse: 'hi',
          trustUpdates: [],
          concepts: [],
          edges: [],
          territories: [],
          trustStates: {},
          calibration: null,
        }),
      } as Response);
      await sendPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('getTrustStateForConcept returns state when available', async () => {
    const mockTrustState = {
      conceptId: 'tcp-basics',
      personId: 'test',
      level: 'verified' as const,
      decayedConfidence: 0.9,
      rawConfidence: 0.9,
      modalitiesTested: [],
      verificationCount: 1,
      lastVerified: Date.now(),
      verificationHistory: [],
      claimHistory: [],
      calibrationGap: null,
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 's',
        agentResponse: 'ok',
        trustUpdates: [],
        concepts: [],
        edges: [],
        territories: [],
        trustStates: { 'tcp-basics': mockTrustState },
        calibration: null,
      }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.sendMessage('test');
    });

    expect(result.current.getTrustStateForConcept('tcp-basics')).toEqual(mockTrustState);
    expect(result.current.getTrustStateForConcept('unknown')).toBeNull();
  });

  it('initSession handles errors gracefully', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Init failed' }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.initSession();
    });

    expect(result.current.error).toBe('Init failed');
    expect(result.current.initialized).toBe(true);
  });

  it('tracks mode from chat response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        agentResponse: 'Here is how TCP works.',
        trustUpdates: [],
        mode: 'explain',
        concepts: [],
        edges: [],
        territories: [],
        trustStates: {},
        calibration: null,
      }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.sendMessage('What is TCP?');
    });

    expect(result.current.mode).toBe('explain');
  });

  it('tracks sandbox state from sandboxStarted response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        agentResponse: 'Try writing some code.',
        trustUpdates: [],
        mode: 'sandbox',
        sandboxStarted: { conceptId: 'tcp-basics' },
        concepts: [],
        edges: [],
        territories: [],
        trustStates: {},
        calibration: null,
      }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.sendMessage('Let me try that in code');
    });

    expect(result.current.sandboxActive).toBe(true);
    expect(result.current.sandboxConceptId).toBe('tcp-basics');
    expect(result.current.mode).toBe('sandbox');
  });

  it('runSandboxCode returns execution result', async () => {
    // First call: init sandbox via chat
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        agentResponse: 'Try it.',
        trustUpdates: [],
        mode: 'sandbox',
        sandboxStarted: { conceptId: 'tcp-basics' },
        concepts: [],
        edges: [],
        territories: [],
        trustStates: {},
        calibration: null,
      }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.sendMessage('Can I try in code?');
    });

    // Second call: run sandbox code
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        execution: { success: true, output: 'hello', error: null, duration: 5 },
        annotation: 'The code logs a string.',
        suggestion: null,
        trustUpdates: [],
        mode: 'sandbox',
        concepts: [],
        edges: [],
        territories: [],
        trustStates: {},
        calibration: null,
      }),
    } as Response);

    let sandboxResult: Awaited<ReturnType<typeof result.current.runSandboxCode>>;
    await act(async () => {
      sandboxResult = await result.current.runSandboxCode('console.log("hello")');
    });

    expect(sandboxResult!.execution.success).toBe(true);
    expect(sandboxResult!.execution.output).toBe('hello');
    expect(sandboxResult!.annotation).toBe('The code logs a string.');
  });

  it('closeSandbox resets sandbox state', async () => {
    // Setup sandbox active state
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        agentResponse: 'Try it.',
        trustUpdates: [],
        mode: 'sandbox',
        sandboxStarted: { conceptId: 'tcp-basics' },
        concepts: [],
        edges: [],
        territories: [],
        trustStates: {},
        calibration: null,
      }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.sendMessage('Can I try in code?');
    });

    expect(result.current.sandboxActive).toBe(true);

    // Close sandbox
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'test-session',
        mode: 'conversation',
      }),
    } as Response);

    await act(async () => {
      await result.current.closeSandbox();
    });

    expect(result.current.sandboxActive).toBe(false);
    expect(result.current.sandboxConceptId).toBeNull();
    expect(result.current.mode).toBe('conversation');
  });
});
