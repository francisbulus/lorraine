'use client';

import Conversation from './Conversation';
import Sandbox from './Sandbox';
import type { ConversationMessage, TrustUpdate } from './Conversation';
import type { ExecutionResult } from '../lib/code-executor';

export interface ConversationPanelProps {
  messages: ConversationMessage[];
  trustUpdates: TrustUpdate[];
  onSubmit: (text: string) => void;
  loading: boolean;
  error: string | null;
  sandboxActive?: boolean;
  sandboxConceptId?: string | null;
  onSandboxRun?: (code: string) => Promise<{
    execution: ExecutionResult;
    annotation: string;
    suggestion: string | null;
  }>;
  onSandboxClose?: () => void;
}

export default function ConversationPanel({
  messages,
  trustUpdates,
  onSubmit,
  loading,
  error,
  sandboxActive = false,
  sandboxConceptId = null,
  onSandboxRun,
  onSandboxClose,
}: ConversationPanelProps) {
  const hasMessages = messages.length > 0;

  if (!hasMessages) {
    return (
      <main className="conversation-panel" aria-label="Conversation">
        <div className="conversation-panel__empty">
          <h1 className="conversation-panel__prompt font-voice">
            What do you want to learn?
          </h1>
          <input
            type="text"
            className="conversation-panel__input font-hand"
            autoFocus
            aria-label="Your message"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = (e.target as HTMLInputElement).value.trim();
                if (value) {
                  onSubmit(value);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="conversation-panel" aria-label="Conversation">
      <Conversation
        messages={messages}
        trustUpdates={trustUpdates}
        onSubmit={onSubmit}
        disabled={loading}
      />
      {sandboxActive && sandboxConceptId && onSandboxRun && (
        <Sandbox
          conceptId={sandboxConceptId}
          onRun={onSandboxRun}
          onClose={onSandboxClose}
        />
      )}
      {loading && (
        <div className="conversation-panel__loading font-data">
          thinking...
        </div>
      )}
      {error && (
        <div className="conversation-panel__error font-data">
          {error}
        </div>
      )}
    </main>
  );
}
