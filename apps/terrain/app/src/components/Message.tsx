'use client';

export type MessageRole = 'agent' | 'learner';

export interface MessageProps {
  role: MessageRole;
  content: string;
  isNew?: boolean;
}

export default function Message({ role, content, isNew = false }: MessageProps) {
  const roleClass = role === 'agent' ? 'message--agent font-voice' : 'message--learner font-hand';
  const animClass = isNew ? 'message--new' : '';

  return (
    <div
      className={`message ${roleClass} ${animClass}`}
      data-role={role}
    >
      {content}
    </div>
  );
}
