# 024 — Conversation Page Feel (Phase 3)

## Goal

Transform the conversation from a chat-app layout (fixed viewport, internal scroll, pinned input) to a page/document feel — a long document that grows as you think. Input inline at the end of content, sandbox inline in the flow, generous whitespace, no chat-window feel.

## Acceptance Criteria

- [ ] Conversation scrolls as a document (outer container scrolls, not inner messages div)
- [ ] Input renders inline at the end of content, not pinned at bottom
- [ ] Sandbox renders inline in the document flow with proper spacing
- [ ] Loading and error indicators render inline in flow
- [ ] Empty state still fills viewport and centers content
- [ ] Auto-scroll works: new messages scroll into view when user is at bottom
- [ ] User can scroll up without being snapped back
- [ ] Multi-paragraph messages have proper spacing between paragraphs
- [ ] No chat bubbles, no avatars, no chat-window feel
- [ ] Map mode unaffected
- [ ] All existing tests pass (minus removed input-in-Conversation tests)

## Files Modified

- `app/src/app/globals.css` — Spacing token, remove overflow constraints, new classes
- `app/src/components/Conversation.tsx` — Strip to pure message renderer
- `app/src/components/ConversationPanel.tsx` — Document flow, auto-scroll, inline everything
- `app/src/components/Message.tsx` — Multi-paragraph splitting
- `app/src/components/Conversation.test.tsx` — Remove input tests, update render calls
- `app/src/components/ConversationPanel.test.tsx` — Add inline input test

## Dependencies

- None (Phase 3 visual/UX refinement, independent of 018-023)
