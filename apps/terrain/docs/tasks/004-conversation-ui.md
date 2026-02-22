# 004 — Conversation UI

## Goal

Build the conversation interface — the desk. Two-voice typography (agent in serif, learner in quasi-monospace), the input field, message rendering, and inline system annotations.

## Acceptance Criteria

- [x] Agent messages render in `--font-voice` (Source Serif 4), `--chalk`
- [x] Learner messages render in `--font-hand` (iA Writer Quattro), `--chalk`
- [x] No chat bubbles, no colored backgrounds per speaker, no avatars — typography is the only differentiation
- [x] Spacing: 24px between messages, 32px between speaker changes
- [x] New messages fade in with rise (translateY 6→0, opacity 0→1, 300ms, `--ease-appear`)
- [x] Input field: `--font-hand`, bottom border only (1px `--stone`), no placeholder, expands with content, min height 48px
- [x] Input on focus: bottom border transitions to `--chalk-dim`, 200ms
- [x] Auto-scroll to newest message, respects manual scroll position (stops auto-scroll if user scrolled up)
- [x] Inline trust update annotations: `——— concept → level (reason) ———` in `--font-data`, `--text-xs`, `--stone`, centered
- [x] Level-change notifications appear inline or as quiet toast (translateY 8→0, opacity 0→1, 300ms, auto-dismiss 5s)
- [x] "[see reasoning]" link on level-change notifications (opens margin panel detail)
- [x] Submit on Enter, Shift+Enter for newline

## Files to Create

- `apps/terrain/app/src/components/Conversation.tsx`
- `apps/terrain/app/src/components/Message.tsx`
- `apps/terrain/app/src/components/ConversationInput.tsx`
- `apps/terrain/app/src/components/TrustUpdateAnnotation.tsx`

## Dependencies

- 003 (app shell — conversation renders in center panel)

## Completion Log

- Two-voice conversation with serif agent / quasi-mono learner — no bubbles, no avatars
- Message spacing: 24px same speaker, 32px on speaker change
- Input: textarea with auto-expand, Enter submits, Shift+Enter newlines
- Trust annotations render inline between messages
- Auto-scroll with manual-scroll-up detection
- 10 tests covering rendering, typography, input behavior, submit logic, anti-patterns
