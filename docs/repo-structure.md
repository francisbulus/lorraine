# Lorraine — Repository Structure

**Version:** 0.2
**Last Updated:** February 22, 2026

```
lorraine/
│
├── README.md                          # What this is, the vision, how to get started
├── LICENSE
│
├── docs/                              # All specs and design documents
│   ├── foundational.md                # The soul — principles, trust primitive, session narratives
│   ├── engine-api.md                  # The contract — every API, why it exists, what principle it serves
│   ├── domain-schema.md               # Domain graph schema — concepts, edges, territories, thresholds
│   ├── main-spec.md                   # Implementation detail — modes, security, UX (partially superseded)
│   ├── philosophy.md                  # Intellectual lineage — Code, Fricker, Goldman, Fonagy
│   ├── why-llms.md                    # Why LLMs are structurally necessary for this system
│   ├── repo-structure.md              # This file
│   └── decisions/                     # Architecture Decision Records
│       └── ...
│
├── engine/                            # The Verifiable Epistemic Trust Engine
│   │                                  # Two layers: Core (deterministic, no LLM) +
│   │                                  # Services (LLM-powered adapters).
│   │                                  # No UI. No application logic.
│   │
│   ├── trust/                         # Core: Trust state management
│   │   ├── record.ts                  # recordVerification — atomic evidence write
│   │   ├── claim.ts                   # recordClaim — self-reported belief capture
│   │   ├── retract.ts                 # retractEvent — event correction with audit trail
│   │   ├── query.ts                   # getTrustState / getBulkTrustState — atomic reads
│   │   ├── propagate.ts              # propagateTrust — ripple effects across graph
│   │   └── decay.ts                   # decayTrust — time-based degradation
│   │
│   ├── graph/                         # Core: The concept graph structure
│   │   ├── nodes.ts                   # Concept node definitions and operations
│   │   ├── edges.ts                   # Relationship edge types and inference strength
│   │   └── load.ts                    # loadConcepts — bulk graph ingestion
│   │
│   ├── epistemics/                    # Core: Engine self-awareness
│   │   ├── calibrate.ts               # calibrate — engine audits its own model + claim calibration
│   │   └── explain.ts                 # explainDecision — transparent reasoning
│   │
│   ├── services/                      # Services: LLM-powered adapters
│   │   ├── generate.ts                # generateVerification — produce verification interactions
│   │   ├── interpret.ts               # interpretResponse — translate responses to trust updates
│   │   ├── implicit.ts                # extractImplicitSignals — mine conversation for signals
│   │   └── self-request.ts            # requestSelfVerification — person-initiated checks
│   │
│   ├── store/                         # Persistence layer (abstract)
│   │   ├── interface.ts               # Storage interface — what the engine needs
│   │   ├── sqlite.ts                  # SQLite implementation (local/self-hosted)
│   │   └── postgres.ts                # Postgres implementation (cloud)
│   │
│   └── index.ts                       # Engine entry point — exports the engine API
│
├── domains/                           # Domain knowledge graphs (the content, not the engine)
│   │                                  # Each domain is a pluggable dataset.
│   │                                  # The engine is domain-agnostic. These are data.
│   │
│   ├── schema.ts                      # Domain graph schema — what a valid domain looks like
│   ├── loader.ts                      # Loads and validates domain graphs
│   ├── networking/
│   │   ├── graph.json                 # Concepts, relationships, territories, thresholds
│   │   └── meta.json                  # Domain metadata — name, description, prerequisites
│   ├── security/
│   │   ├── graph.json
│   │   └── meta.json
│   ├── databases/
│   │   ├── graph.json
│   │   └── meta.json
│   └── ...
│
├── llm/                               # LLM provider abstraction
│   │                                  # The engine services define WHAT the LLM needs to produce.
│   │                                  # This layer handles HOW — provider-specific integration.
│   │
│   ├── interface.ts                   # What the engine services need from the LLM
│   ├── providers/
│   │   ├── anthropic.ts               # Claude integration
│   │   ├── openai.ts                  # OpenAI integration
│   │   └── local.ts                   # Ollama / local model integration
│   ├── prompts/                       # Prompt templates (implementation detail, not engine)
│   │   ├── explain.ts                 # Explanation generation at various depths
│   │   ├── grill.ts                   # Question generation across difficulty axes
│   │   ├── interpret.ts               # Response interpretation
│   │   ├── annotate.ts                # Sandbox execution annotation
│   │   ├── implicit.ts                # Implicit signal extraction from conversation
│   │   └── claims.ts                  # Claim extraction from self-assessment language
│   └── extraction/                    # Structured data extraction from LLM responses
│       ├── trust-signals.ts           # Extract trust updates from natural language
│       └── concept-detection.ts       # Detect concept references in conversation
│
├── apps/                              # Applications built on the engine
│   │                                  # Each app is opinionated. The engine is not.
│   │                                  # Apps depend on engine, never the reverse.
│   │
│   ├── terrain/                       # Application #1 — Terrain (Learning OS)
│   │   │                              # See apps/terrain/README.md for full spec.
│   │   │                              # Enforces all invariants + defaults + 6 strict policies.
│   │   │
│   │   ├── README.md                  # Terrain spec v0.2 — beliefs, agent, modes, guardrails
│   │   ├── conversation/              # The primary interface
│   │   │   ├── loop.ts                # processConversationTurn — main interaction loop
│   │   │   ├── mode-detection.ts      # Detect when conversation should become a mode
│   │   │   ├── claims.ts              # Claim extraction from natural conversation
│   │   │   └── history.ts             # Session history and continuity
│   │   │
│   │   ├── modes/                     # The six verification surfaces
│   │   │   ├── explain/               # First-principles layered explanation
│   │   │   │   ├── depth-ladder.ts    # The four-layer depth model
│   │   │   │   └── renderer.ts        # How explanations are presented
│   │   │   ├── sandbox/               # Annotated code execution
│   │   │   │   ├── runtime.ts         # Code execution environment
│   │   │   │   ├── annotator.ts       # The annotation engine
│   │   │   │   └── suggestions.ts     # Experiment suggestion logic
│   │   │   ├── grill/                 # Adaptive questioning
│   │   │   │   ├── generator.ts       # Question generation (uses engine + LLM)
│   │   │   │   ├── difficulty.ts      # Difficulty axis selection
│   │   │   │   └── feedback.ts        # Post-answer flow
│   │   │   ├── sketch/                # Visual thinking canvas
│   │   │   │   ├── canvas.ts          # Drawing surface
│   │   │   │   └── critique.ts        # Agent analysis of sketches
│   │   │   ├── write/                 # Feynman technique writing
│   │   │   │   ├── editor.ts          # Writing surface
│   │   │   │   └── feedback.ts        # Real-time gap detection
│   │   │   └── provision/             # Environment provisioning
│   │   │       ├── templates.ts       # Pre-built environment templates
│   │   │       └── lifecycle.ts       # Create, snapshot, restore, destroy
│   │   │
│   │   ├── map/                       # The terrain visualization
│   │   │   ├── renderer.ts            # How the map is displayed
│   │   │   ├── territories.ts         # Territory clustering and ownership computation
│   │   │   ├── thresholds.ts          # Threshold detection and readiness criteria
│   │   │   ├── navigation.ts          # Learner interaction with the map
│   │   │   └── trust-dashboard.ts     # The transparent trust state view
│   │   │
│   │   ├── calibration/               # Self-calibration view
│   │   │   └── view.ts               # Claim vs. evidence gap visualization
│   │   │
│   │   ├── guardrails/                # Operational integrity rules
│   │   │   ├── signal-policy.ts       # Implicit signal write policy (6.1)
│   │   │   ├── claim-rules.ts         # Claim extraction rules (6.2)
│   │   │   └── dedup.ts              # Signal deduplication (6.4)
│   │   │
│   │   └── ui/                        # Frontend
│   │       ├── ...                    # (framework TBD — React, Svelte, etc.)
│   │       └── ...
│   │
│   └── [future-apps]/                 # Future applications on the engine
│       ├── hiring/                    # Verified skill assessment for hiring
│       ├── onboarding/                # Organizational knowledge onboarding
│       ├── certification/             # Standards-based certification
│       └── ...
│
├── sdk/                               # Public SDK for third parties building on the engine
│   ├── client.ts                      # Engine client — read/write trust state
│   ├── verification.ts                # Submit external verification events
│   ├── domains.ts                     # Register new domain graphs
│   └── types.ts                       # Shared type definitions
│
└── tests/
    ├── engine/                        # Engine tests — these must pass independently of any app
    │   ├── trust/
    │   ├── graph/
    │   ├── services/
    │   └── epistemics/
    ├── domains/                       # Domain graph validation tests
    ├── integration/                   # Engine + LLM integration tests
    └── apps/
        └── terrain/                   # Terrain application tests
```

## Key Structural Decisions

### 1. Engine has zero UI dependencies
The `engine/` directory is pure logic. It could run in a CLI, a web app, a mobile app, or as a headless service. It imports nothing from `apps/`. This is the engine boundary.

### 2. Engine Core vs. Engine Services
The engine has two layers. Core (trust/, graph/, epistemics/, store/) is deterministic with zero LLM dependencies. Services (services/) is LLM-powered. Core can run fully encrypted client-side. Services is where plaintext meets the LLM. The boundary is explicit.

### 3. Domains are data, not code
Domain knowledge graphs live in `domains/` as JSON, not as application logic. Adding a new domain means adding a JSON file, not writing code. The engine validates and loads them through a standard schema.

### 4. LLM is a swappable layer
The `llm/` directory abstracts model providers. The engine services define what they need (through `llm/interface.ts`). Providers implement that interface. Switching from Claude to a local model means changing a config, not refactoring.

### 5. Apps depend on engine, never the reverse
`apps/terrain/` imports from `engine/`. `engine/` never imports from `apps/`. This is enforced structurally — the engine doesn't know what applications exist. Each application is opinionated; the engine is not.

### 6. SDK is the external interface
If third parties want to build on the trust engine — submitting verification events from their own platforms, registering new domains, reading trust state — they use the `sdk/`. This is the extensibility layer discussed in the OS analogy.

### 7. Tests mirror the architecture
Engine tests run without any app. App tests run with the engine. This validates that the engine works independently.

### 8. Application-level concepts live in applications
Territories, thresholds, goals, sessions, maps, modes, guardrails — these are Terrain concepts, not engine concepts. They live in `apps/terrain/`, not in `engine/`. Other applications (hiring, onboarding, certification) will have their own application-level concepts.
