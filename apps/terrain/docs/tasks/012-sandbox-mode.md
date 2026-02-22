# 012 — Sandbox Mode (Phase 2)

## Goal

Implement sandbox mode — code execution with agent annotation. The learner runs code, the agent annotates what's happening at the layers below. Renders inline in the conversation.

## Acceptance Criteria

- [ ] Code editor renders inline in conversation (within a `--ground-mid` container, 1px `--stone` border)
- [ ] Code in `--font-data` (IBM Plex Mono)
- [ ] [Run] button executes code (sandboxed execution environment)
- [ ] Agent annotates output: explains what happened at layers below the code
- [ ] Agent can suggest experiments: "What happens if you set the timeout to 0? Try it."
- [ ] Agent steps back during experimentation — watches, extracts implicit signals, annotates when asked
- [ ] Implicit signals from sandbox: correct code without hints (strong verification), debugging success (very strong), hypothesis testing (transfer signal)
- [ ] Mode opening animation: container expands in height (300ms, `--ease-settle`), content fades in after (200ms, 100ms delay)
- [ ] Mode transition triggers: "show me in code", "can I try that?", "let me experiment"

## Files to Create

- `apps/terrain/app/src/components/Sandbox.tsx`
- `apps/terrain/app/src/components/CodeEditor.tsx`
- `apps/terrain/app/src/lib/sandbox-engine.ts`
- `apps/terrain/app/src/lib/code-executor.ts`

## Dependencies

- 005 (conversation loop — sandbox happens within conversation)
- 011 (explain mode — sandbox often follows explanation)
