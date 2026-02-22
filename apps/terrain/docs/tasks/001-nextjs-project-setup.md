# 001 — Next.js Project Setup

## Goal

Initialize the Terrain web application with Next.js, Tailwind CSS, and the design system tokens as CSS custom properties. Wire up the engine as a local dependency.

## Acceptance Criteria

- [ ] Next.js project created in `apps/terrain/app/` with App Router
- [ ] Tailwind CSS configured with utility classes
- [ ] All design system tokens from `docs/design-system.md` added as CSS custom properties in `globals.css` (colors, typography, spacing, animation easings)
- [ ] Font imports added: Source Serif 4, iA Writer Quattro, Geist, IBM Plex Mono
- [ ] Paper texture background treatment on body (soft-light blend, 0.025 opacity)
- [ ] Scrollbar styling (thin, `--stone-faint` on transparent)
- [ ] TypeScript configured with strict mode
- [ ] Engine core importable from the app (local workspace dependency or path alias)
- [ ] Engine services importable from the app
- [ ] LLM provider importable from the app
- [ ] Dev server runs without errors
- [ ] Build passes

## Files to Create

- `apps/terrain/app/package.json`
- `apps/terrain/app/tsconfig.json`
- `apps/terrain/app/tailwind.config.ts`
- `apps/terrain/app/next.config.ts`
- `apps/terrain/app/src/app/layout.tsx`
- `apps/terrain/app/src/app/globals.css`
- `apps/terrain/app/src/app/page.tsx` (empty shell)

## Dependencies

None — first task.
