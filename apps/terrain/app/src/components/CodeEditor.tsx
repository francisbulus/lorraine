'use client';

import { useState, useRef, useCallback } from 'react';

export interface CodeEditorProps {
  initialCode?: string;
  onRun: (code: string) => void;
  disabled?: boolean;
}

export default function CodeEditor({
  initialCode = '',
  onRun,
  disabled = false,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts two spaces instead of moving focus.
      if (e.key === 'Tab') {
        e.preventDefault();
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = code.substring(0, start) + '  ' + code.substring(end);
        setCode(newValue);
        // Restore cursor position after React re-renders.
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        });
      }

      // Ctrl/Cmd+Enter runs code.
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!disabled && code.trim()) {
          onRun(code);
        }
      }
    },
    [code, disabled, onRun]
  );

  return (
    <div className="code-editor">
      <textarea
        ref={textareaRef}
        className="code-editor__textarea font-data"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        aria-label="Code editor"
        disabled={disabled}
      />
      <div className="code-editor__actions">
        <button
          className="code-editor__run font-system"
          onClick={() => onRun(code)}
          disabled={disabled || !code.trim()}
        >
          [Run]
        </button>
      </div>
    </div>
  );
}
