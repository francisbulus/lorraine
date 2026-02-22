# Lorraine

A verifiable epistemic trust engine.

Lorraine tracks what someone actually knows — not what they've completed, not what they claim, not what's been assumed. It maintains a trust model built on evidence, with provenance, that decays honestly over time and distinguishes what's been demonstrated from what's been inferred.

The engine is domain-agnostic. It serves any context where the gap between "claims to know" and "actually knows" has consequences: learning, hiring, onboarding, certification, organizational competency, AI evaluation.

## Engine primitives

Five things. Everything else is built on top.

- **Concept** — a node in the graph, something a person could know or not know
- **Edge** — a typed, weighted connection between concepts
- **Verification event** — a moment where understanding was observed, with provenance
- **Claim event** — a person's self-reported belief about their understanding
- **Trust state** — per concept, per person, derived from events + decay + propagation

## Engine invariants

These hold in every application context. Non-negotiable.

1. **Trust is the foundational primitive** — everything evaluates against accuracy and depth of trust
2. **The system never inflates trust** — conservative propagation, aggressive failure propagation
3. **Transparent and challengeable** — every trust claim traces to evidence, the person can always ask why
4. **Failure is the most informative event** — visible, recorded, diagnostic
5. **Never manipulates verification to inflate trust** — no leading questions, no score-boosting
6. **Trust state is derived, not stored** — recomputable from events, no manual overrides, corrections via retraction

## Architecture

```
engine/
├── trust/          — record, query, propagate, decay (engine core)
├── graph/          — concept and edge management (engine core)
├── epistemics/     — calibrate, explain (engine core)
├── store/          — persistence layer (engine core)
├── services/       — LLM-powered verification generation + interpretation
├── index.ts
└── types.ts

domains/            — pluggable domain knowledge graphs (JSON data)
llm/                — model provider abstraction
apps/
└── terrain/        — first application: a learning OS
sdk/                — external interface for third parties
docs/               — engine-level specs and design documents
tests/              — mirrors engine structure
```

**Engine core** is deterministic. No LLM dependency. Can run fully encrypted.

**Engine services** are LLM-powered adapters — generate verification prompts, interpret responses, extract implicit signals. Vary by application context.

**Applications** sit on top of core + services. They load domains, read trust state, group concepts, define readiness criteria, manage interaction.


## Applications
## #1: Terrain

A learning OS. A conversational agent that builds a map of what you know, collapses the cost of trying, and gets out of your way so you can discover — not be told — that you understand.

Terrain enforces all engine invariants and adds its own policies: the agent is a mapmaker not a guide, learning is terrain ownership not path completion, no gamification, no praise, no urgency, difficulty is sacred.

See `apps/terrain/SPEC.md` for the full specification.

## Docs

|Document|What it covers|
|---|---|
|`docs/foundational.md`|The soul — invariants, defaults, policies, trust primitive, Sekiro principle|
|`docs/engine-api.md`|The contract — every core and services API|
|`docs/domain-schema.md`|The content model — how domains are structured|
|`docs/philosophy.md`|Intellectual lineage — Code, Fricker, Goldman, Fonagy|
|`docs/why-llms.md`|Why LLMs are architecturally necessary|
|`docs/auditability.md`|Audit trail, introspection, what the architecture lets you answer|
|`docs/repo-structure.md`|Codebase map and build phases|

## Named after

**Lorraine Code**, who argued that knowing well is an obligation, not a convenience. Her work on epistemic responsibility is the philosophical foundation of this system.
