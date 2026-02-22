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

  const paragraphs = content.split(/\n\n+/);

  return (
    <div
      className={`message ${roleClass} ${animClass}`}
      data-role={role}
    >
      {paragraphs.length === 1
        ? content
        : paragraphs.map((p, i) => (
            <p key={i} className="message__paragraph">{p}</p>
          ))}
    </div>
  );
}
