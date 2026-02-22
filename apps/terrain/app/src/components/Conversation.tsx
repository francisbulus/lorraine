'use client';

import { useRef } from 'react';
import Message from './Message';
import type { MessageRole } from './Message';
import TrustUpdateAnnotation from './TrustUpdateAnnotation';

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
}

export default function Conversation({
  messages,
  trustUpdates,
}: ConversationProps) {
  const lastMessageCount = useRef(0);

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

  lastMessageCount.current = messages.length;

  return (
    <div className="conversation__messages">
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
  );
}
