'use client';

import { useState } from 'react';
import CodeEditor from './CodeEditor';
import type { ExecutionResult } from '../lib/code-executor';

export interface SandboxProps {
  conceptId: string;
  initialCode?: string;
  onRun: (code: string) => Promise<{
    execution: ExecutionResult;
    annotation: string;
    suggestion: string | null;
  }>;
  onClose?: () => void;
}

interface RunState {
  execution: ExecutionResult;
  annotation: string;
  suggestion: string | null;
}

export default function Sandbox({
  conceptId,
  initialCode,
  onRun,
  onClose,
}: SandboxProps) {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunState | null>(null);

  async function handleRun(code: string) {
    setRunning(true);
    try {
      const result = await onRun(code);
      setLastRun(result);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="sandbox" role="region" aria-label={`sandbox: ${conceptId}`}>
      <div className="sandbox__header">
        <span className="sandbox__label font-data">─ sandbox ─</span>
        {onClose && (
          <button className="sandbox__close font-data" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="sandbox__editor">
        <CodeEditor
          initialCode={initialCode}
          onRun={handleRun}
          disabled={running}
        />
      </div>

      {running && (
        <div className="sandbox__running font-data">running...</div>
      )}

      {lastRun && !running && (
        <div className="sandbox__output">
          {lastRun.execution.success ? (
            <pre className="sandbox__result font-data">
              {lastRun.execution.output || '(no output)'}
            </pre>
          ) : (
            <pre className="sandbox__error font-data">
              {lastRun.execution.error}
            </pre>
          )}

          <div className="sandbox__annotation font-voice">
            {lastRun.annotation}
          </div>

          {lastRun.suggestion && (
            <div className="sandbox__suggestion font-voice">
              {lastRun.suggestion}
            </div>
          )}

          <div className="sandbox__duration font-data">
            {lastRun.execution.duration.toFixed(0)}ms
          </div>
        </div>
      )}
    </div>
  );
}
