# Lorraine

An opinionated trust framework for verifiable knowledge claims.

Lorraine tracks what someone actually knows — not what they've completed, not what they claim, not what's been assumed. It maintains a trust model built on evidence, with provenance, that decays honestly over time and distinguishes what's been demonstrated from what's been inferred.

You define what "knows X" means in your context. Lorraine guarantees the evidence behind it is honest.

The framework is domain-agnostic. You bring a domain (what there is to know), a service layer (how verification happens), and an application (who's looking and why). Lorraine handles the trust math.

## Four layers

**Schema** — the shape of trust data. Five primitives, nothing else.

- **Concept** — a node in the graph, something a person could know or not know
- **Edge** — a typed, weighted connection between concepts
- **Verification event** — a moment where understanding was observed, with provenance
- **Claim event** — a person's self-reported belief about their understanding
- **Trust state** — per concept, per person, derived from events + decay + propagation

**Data** — where trust data lives. Append-only event log. Storage-agnostic — the store interface abstracts persistence. Bring SQLite, Postgres, DynamoDB, whatever. Events are never deleted, only retracted.

**Computation** — what trust data means. This is where Lorraine's opinions live.

- Propagation rules: verification never propagates as verification, only as inference. Inference attenuates with distance. Failure propagates aggressively. Cross-modality compounds. Time decays trust.
- These rules are hardcoded. They are epistemic integrity constraints, not tunable parameters. If they were configurable, a bad configuration could inflate trust scores.
- Trust state is always derived from events through these rules. Never stored directly. Always recomputable.

**Query** — how you ask questions about trust data. Every query recomputes from events through the computation layer. Derived reads, not stored reads.

- What does this person know about X? (`getTrustState`)
- What do they know across these concepts? (`getBulkTrustState`)
- Show me the knowledge structure with trust overlay (`getGraph`)
- Why does the system believe this? (`explainDecision`)
- How accurate is the model? How calibrated is the person? (`calibrate`)

## Invariants

These hold in every context. Non-negotiable.

1. **Trust is the foundational primitive** — everything evaluates against accuracy and depth of trust
2. **The system never inflates trust** — conservative propagation, aggressive failure propagation
3. **Transparent and challengeable** — every trust claim traces to evidence, the person can always ask why
4. **Failure is the most informative event** — visible, recorded, diagnostic
5. **Never manipulates verification to inflate trust** — no leading questions, no score-boosting
6. **Trust state is derived, not stored** — recomputable from events, no manual overrides, corrections via retraction

## How it fits

```
Your application          — UI, business logic, context
Your service layer        — how verification happens (LLM, human interviewer,
                            CI/CD pipeline, exam system, whatever)
Your database             — Postgres, SQLite, DynamoDB, whatever
──────────────────────────────────────────────────────────────
Lorraine SDK              — schema + computation + query
                            the opinions that make trust honest
```

Lorraine is the line in the middle. Everything above it is yours. You bring your own database, your own verification method, your own application. Lorraine gives you the guarantee that whatever trust data flows through the system is epistemically honest.

The SDK doesn't care how you verify. It cares that when you record a verification event, you include the modality, the result, and the context. It doesn't care where you store it. It cares that the store implements the interface. It doesn't care what your app does with trust state. It cares that trust state is derived from events through the computation rules, not manually set.

The TypeScript implementation in `engine/` is the first SDK. The framework is language-agnostic — the spec defines the schema, invariants, computation rules, and query semantics. Any implementation that follows the spec produces compatible trust data.

## What you build on top

The four layers are self-sufficient. You can use Lorraine without an LLM, without a UI, without an application. Pipe in structured events from a CI/CD pipeline and query trust state from a script.

For richer interaction, add:

**Services** — LLM-powered adapters that generate verification prompts, interpret responses, and extract implicit signals from natural interaction. Pluggable. Bring your own LLM or don't use one at all.

**Domains** — portable knowledge graphs that describe what there is to know about a subject. Concepts, edges, territories, thresholds. The same domain works across learning, hiring, onboarding, certification.

**Applications** — the context layer. Who's asking, what trust level they require, what they do with the answer. A learning app, a hiring tool, a team dashboard, an onboarding tracker — all reading from the same trust model.

## Architecture

```
engine/
├── trust/          — record, query, propagate, decay
├── graph/          — concept and edge management
├── epistemics/     — calibrate, explain
├── store/          — persistence interface + implementations
├── services/       — LLM-powered adapters (optional)
├── index.ts
└── types.ts

domains/            — pluggable domain knowledge graphs
llm/                — model provider abstraction
apps/               — applications built on the framework
sdk/                — external interface for third parties
docs/               — specs and design documents
tests/              — mirrors engine structure
```

## Reference application: Terrain

A learning OS built on Lorraine. A conversational agent backed by the trust framework, with a map that shows what you know, where the boundaries are, and where to go next. Terrain proves the framework works for self-directed learning. See `apps/terrain/SPEC.md`.

## Docs

| Document | What it covers |
|----------|---------------|
| [`docs/how-it-works.md`](docs/how-it-works.md) | The walkthrough — what happens at each layer, with concrete examples |
| [`docs/foundational.md`](docs/foundational.md) | The soul — invariants, defaults, trust primitive, Sekiro principle |
| [`docs/engine-api.md`](docs/engine-api.md) | The contract — every core and services API |
| [`docs/domain-schema.md`](docs/domain-schema.md) | The content model — how domains are structured |
| [`docs/philosophy.md`](docs/philosophy.md) | Intellectual lineage — Code, Fricker, Goldman, Fonagy |
| [`docs/why-llms.md`](docs/why-llms.md) | Why LLMs are architecturally necessary for rich interaction |
| [`docs/auditability.md`](docs/auditability.md) | What the architecture lets you answer for free |

## Named after

**Lorraine Code**, who argued that knowing well is an obligation, not a convenience. Her work on epistemic responsibility is the philosophical foundation of this framework.
