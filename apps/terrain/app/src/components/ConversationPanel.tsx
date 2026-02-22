'use client';

export default function ConversationPanel() {
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
        />
      </div>
    </main>
  );
}
