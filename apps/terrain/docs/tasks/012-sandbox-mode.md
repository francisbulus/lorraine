# 012 — Sandbox Mode (Phase 2)

## Goal

Implement sandbox mode — code execution with agent annotation. The learner runs code, the agent annotates what's happening at the layers below. Renders inline in the conversation.

## Acceptance Criteria

- [x] Code editor renders inline in conversation (within a `--ground-mid` container, 1px `--stone` border)
- [x] Code in `--font-data` (IBM Plex Mono)
- [x] [Run] button executes code (sandboxed execution environment)
- [x] Agent annotates output: explains what happened at layers below the code
- [x] Agent can suggest experiments: "What happens if you set the timeout to 0? Try it."
- [x] Agent steps back during experimentation — watches, extracts implicit signals, annotates when asked
- [x] Implicit signals from sandbox: correct code without hints (strong verification), debugging success (very strong), hypothesis testing (transfer signal)
- [x] Mode opening animation: container expands in height (300ms, `--ease-settle`), content fades in after (200ms, 100ms delay)
- [x] Mode transition triggers: "show me in code", "can I try that?", "let me experiment"

## Files to Create

- `apps/terrain/app/src/components/Sandbox.tsx`
- `apps/terrain/app/src/components/CodeEditor.tsx`
- `apps/terrain/app/src/lib/sandbox-engine.ts`
- `apps/terrain/app/src/lib/code-executor.ts`

## Dependencies

- 005 (conversation loop — sandbox happens within conversation)
- 011 (explain mode — sandbox often follows explanation)

## Completion Log

- code-executor.ts: executeCode (Function constructor sandbox with whitelisted globals, safety checker blocks process/require/eval/fetch/document, console capture, timeout protection), checkSandboxSafety
- sandbox-engine.ts: detectSandboxRequest (8 patterns: "show me in code"/"can I try"/"let me experiment"/etc.), createSandboxEngine with startSandbox/runCode/endSandbox, LLM-powered annotation + signal extraction, parseSandboxSignals with concept filtering
- CodeEditor.tsx: textarea in font-data, Tab→2 spaces, Ctrl+Enter runs, [Run] button with disabled states
- Sandbox.tsx: inline container with ground-mid bg + stone border, header with label + close, output/error/annotation/suggestion/duration display
- CSS: sandbox-open animation (300ms ease-settle max-height expand), sandbox-content-fade (200ms 100ms delay), code-editor textarea/actions
- 46 new tests: code-executor (16), sandbox-engine (15), Sandbox+CodeEditor components (15)
