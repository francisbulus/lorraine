# 001 — Next.js Project Setup

## Goal

Initialize the Terrain web application with Next.js, Tailwind CSS, and the design system tokens as CSS custom properties. Wire up the engine as a local dependency.

## Acceptance Criteria

- [x] Next.js project created in `apps/terrain/app/` with App Router
- [x] Tailwind CSS configured with utility classes
- [x] All design system tokens from `docs/design-system.md` added as CSS custom properties in `globals.css` (colors, typography, spacing, animation easings)
- [x] Font imports added: Source Serif 4, iA Writer Quattro, Geist, IBM Plex Mono
- [x] Paper texture background treatment on body (soft-light blend, 0.025 opacity)
- [x] Scrollbar styling (thin, `--stone-faint` on transparent)
- [x] TypeScript configured with strict mode
- [x] Engine core importable from the app (local workspace dependency or path alias)
- [x] Engine services importable from the app
- [x] LLM provider importable from the app
- [x] Dev server runs without errors
- [x] Build passes

## Files to Create

- `apps/terrain/app/package.json`
- `apps/terrain/app/tsconfig.json`
- `apps/terrain/app/next.config.ts`
- `apps/terrain/app/postcss.config.mjs`
- `apps/terrain/app/src/app/layout.tsx`
- `apps/terrain/app/src/app/globals.css`
- `apps/terrain/app/src/app/page.tsx` (empty shell)

## Dependencies

None — first task.

## Completion Log

- All design system tokens implemented as CSS custom properties
- Fonts loaded via @fontsource packages (self-hosted, no CDN dependency)
- Engine wired via path aliases in tsconfig.json + webpack aliases in next.config.ts
- 6 tests verify engine core, services, and LLM provider are importable
- Build produces static pages, dev server responds 200
