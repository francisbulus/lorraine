'use client';

import { useRef, useCallback } from 'react';

export interface ConversationInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export default function ConversationInput({ onSubmit, disabled = false }: ConversationInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const value = textareaRef.current?.value.trim();
        if (value) {
          onSubmit(value);
          if (textareaRef.current) {
            textareaRef.current.value = '';
            textareaRef.current.style.height = 'auto';
          }
        }
      }
    },
    [onSubmit]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  return (
    <div className="conversation-input">
      <textarea
        ref={textareaRef}
        className="conversation-input__field font-hand"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        rows={1}
        aria-label="Your message"
      />
    </div>
  );
}
