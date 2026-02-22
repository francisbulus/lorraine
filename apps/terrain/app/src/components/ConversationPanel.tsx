'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import Conversation from './Conversation';
import ConversationInput from './ConversationInput';
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
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLMainElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastMessageCount = useRef(0);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (autoScroll && messages.length > lastMessageCount.current) {
      scrollAnchorRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
    lastMessageCount.current = messages.length;
  }, [messages.length, autoScroll]);

  // Track whether user is near the bottom
  const handleScroll = useCallback(() => {
    const scrollContainer = mainRef.current?.parentElement;
    if (!scrollContainer) return;
    const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 40;
    setAutoScroll(isAtBottom);
  }, []);

  // Attach scroll listener to .conversation-state (parent of <main>)
  useEffect(() => {
    const scrollContainer = mainRef.current?.parentElement;
    if (!scrollContainer) return;
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (!hasMessages) {
    return (
      <main ref={mainRef} className="conversation-panel conversation-panel--empty" aria-label="Conversation">
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
    <main ref={mainRef} className="conversation-panel" aria-label="Conversation">
      <Conversation
        messages={messages}
        trustUpdates={trustUpdates}
      />
      {sandboxActive && sandboxConceptId && onSandboxRun && (
        <div className="conversation__sandbox-inline">
          <Sandbox
            conceptId={sandboxConceptId}
            onRun={onSandboxRun}
            onClose={onSandboxClose}
          />
        </div>
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
      <ConversationInput onSubmit={onSubmit} disabled={loading} />
      <div ref={scrollAnchorRef} className="conversation__scroll-anchor" />
    </main>
  );
}
