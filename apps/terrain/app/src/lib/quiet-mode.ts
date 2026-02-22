import type { ImplicitSignal } from '@engine-services/types';

export interface PendingSignal {
  id: string;
  signal: ImplicitSignal;
  timestamp: number;
}

export interface QuietModeState {
  enabled: boolean;
  pendingSignals: PendingSignal[];
}

let nextId = 1;

export function createQuietMode() {
  let enabled = false;
  let pending: PendingSignal[] = [];

  function isEnabled(): boolean {
    return enabled;
  }

  function toggle(): boolean {
    enabled = !enabled;
    return enabled;
  }

  function setEnabled(value: boolean): void {
    enabled = value;
  }

  function addPending(signal: ImplicitSignal): PendingSignal {
    const ps: PendingSignal = {
      id: `ps_${nextId++}`,
      signal,
      timestamp: Date.now(),
    };
    pending.push(ps);
    return ps;
  }

  function acceptSignal(id: string): ImplicitSignal | null {
    const idx = pending.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const [removed] = pending.splice(idx, 1);
    return removed.signal;
  }

  function dismissSignal(id: string): boolean {
    const idx = pending.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    pending.splice(idx, 1);
    return true;
  }

  function getPending(): PendingSignal[] {
    return [...pending];
  }

  function clear(): void {
    pending = [];
  }

  return {
    isEnabled,
    toggle,
    setEnabled,
    addPending,
    acceptSignal,
    dismissSignal,
    getPending,
    clear,
  };
}
