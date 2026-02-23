# CLAUDE.md — Lorraine Applications

This file provides guidance to Claude Code when working on applications built on the Lorraine engine.

## Skills

Always read and follow the skills in `apps/skills/`. These define coding standards and git practices that apply to all work in this repository.

## Workflow

1. **Start of session:** Read the relevant app's `SESSION.md` (e.g. `apps/terrain/SESSION.md`)
2. **Find current task:** Check `apps/<app>/docs/tasks/` for the next incomplete task
3. **Do the work:** Follow the task's acceptance criteria
4. **End of session:** Update the app's `SESSION.md` with progress, blockers, next steps

## Task System

Each app has its own task directory: `apps/<app>/docs/tasks/`, numbered sequentially (001, 002, ...).

- Each task has clear acceptance criteria
- Check off criteria as you complete them
- Mark task complete in the app's `SESSION.md` when done
- If blocked, note it in SESSION.md and move to next unblocked task

## Architecture

All applications sit on top of two engine layers:

- **Engine Core** (`engine/`) — deterministic trust machine. No LLM. Records events, computes trust state, propagates, decays, calibrates, explains. See `docs/engine-api.md`.
- **Engine Services** (`engine/services/`) — LLM-powered adapters. Generate verification prompts, interpret responses, extract implicit signals. See `docs/engine-api.md` Section 4.
- **LLM Provider** (`llm/`) — model provider abstraction. Services use this, applications don't call it directly.

Applications load domain packages into the core, read trust state, and build experiences on top.

## Engine Invariants

These hold in every application. Non-negotiable. Read `docs/foundational.md` for the full spec.

1. Trust is the foundational primitive
2. The system never inflates trust
3. Transparent and challengeable
4. Failure is the most informative event
5. Never manipulates verification to inflate trust
6. Trust state is derived, not stored

Applications must never violate these. If an application behavior conflicts with an invariant, the invariant wins.

## Application Structure

Each app lives in `apps/<app>/` and has:

```
apps/<app>/
├── docs/
│   ├── specs/          # Product spec, tech spec, and other specs
│   ├── tasks/          # Numbered task files
│   └── design-system.md  # Design system (web apps only)
├── SESSION.md          # Current session tracking
├── SPEC.md             # Full original specification
└── <app code>/         # The application itself
```

## Design Systems

Web UI applications have a `docs/design-system.md` file. **Before implementing any visual changes for a web app, read its design system fully.** These are app-specific design systems that must be followed exactly: colors, typography, layout, animation, and anti-patterns are all defined there. Do not deviate.

Applications that are not web UIs (CLIs, SDKs, APIs) will not have a design system file.

## CLI Specifications

CLI applications have a `docs/specs/cli.md` file. **Before implementing any CLI command, read the CLI spec fully.** It defines UX principles, output formatting conventions, color usage, exit codes, error message style, and example output layouts. These are the equivalent of a design system for terminal interfaces.

## Applications

- **terrain/** — A learning OS. Conversational agent that builds a map of what you know. Web app (Next.js + Tailwind with design system tokens as CSS custom properties). See `apps/terrain/SPEC.md` and `apps/terrain/docs/design-system.md`.

- **maintainer-os/** — Evidence ops for codebase understanding. CLI-first tool for engineering teams to answer who actually understands the codebase deeply enough to review, ship, and recover it safely. See `apps/maintainer-os/SPEC.md`.
