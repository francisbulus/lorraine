'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import Message from './Message';
import type { MessageRole } from './Message';
import TrustUpdateAnnotation from './TrustUpdateAnnotation';
import ConversationInput from './ConversationInput';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
}

export interface TrustUpdate {
  id: string;
  afterMessageId: string;
  conceptId: string;
  newLevel: string;
  reason: string;
  seeReasoning?: () => void;
}

export interface ConversationProps {
  messages: ConversationMessage[];
  trustUpdates: TrustUpdate[];
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export default function Conversation({
  messages,
  trustUpdates,
  onSubmit,
  disabled = false,
}: ConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastMessageCount = useRef(0);

  // Auto-scroll to bottom when new messages arrive, unless user scrolled up
  useEffect(() => {
    if (autoScroll && scrollRef.current && messages.length > lastMessageCount.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    lastMessageCount.current = messages.length;
  }, [messages.length, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(isAtBottom);
  }, []);

  // Group messages and insert trust annotations between them
  const items: Array<
    { type: 'message'; message: ConversationMessage; isNew: boolean; prevRole?: MessageRole } |
    { type: 'trust'; update: TrustUpdate }
  > = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prevRole = i > 0 ? messages[i - 1].role : undefined;
    const isNew = i >= lastMessageCount.current - 1 && i === messages.length - 1;
    items.push({ type: 'message', message: msg, isNew, prevRole });

    // Insert any trust updates that appear after this message
    for (const update of trustUpdates) {
      if (update.afterMessageId === msg.id) {
        items.push({ type: 'trust', update });
      }
    }
  }

  return (
    <div className="conversation">
      <div
        className="conversation__messages"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {items.map((item) => {
          if (item.type === 'trust') {
            return (
              <TrustUpdateAnnotation
                key={item.update.id}
                conceptId={item.update.conceptId}
                newLevel={item.update.newLevel}
                reason={item.update.reason}
              />
            );
          }
          const spacingClass =
            item.prevRole && item.prevRole !== item.message.role
              ? 'conversation__speaker-change'
              : '';
          return (
            <div key={item.message.id} className={spacingClass}>
              <Message
                role={item.message.role}
                content={item.message.content}
                isNew={item.isNew}
              />
            </div>
          );
        })}
      </div>
      <ConversationInput onSubmit={onSubmit} disabled={disabled} />
    </div>
  );
}
