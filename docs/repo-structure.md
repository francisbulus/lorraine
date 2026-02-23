# Lorraine: Repository Structure

**Version:** 0.3<br>
**Last Updated:** February 23, 2026

```
lorraine/
│
├── README.md                          # What this is, the four layers, how it fits
├── LICENSE
│
├── docs/                              # The spec (the actual standard)
│   ├── foundational.md                # The soul: invariants, defaults, trust primitive, Sekiro principle
│   ├── engine-api.md                  # The contract: every core and services API
│   ├── how-it-works.md                # The walkthrough: four layers with concrete examples
│   ├── building-on-lorraine.md        # How to build an application, with full worked example
│   ├── domain-schema.md               # Domain graph schema: concepts, edges, territories, thresholds
│   ├── philosophy.md                  # Intellectual lineage: Code, Fricker, Goldman, Fonagy
│   ├── why-llms.md                    # Why LLMs are necessary for rich verification surfaces
│   ├── auditability.md                # What the architecture lets you answer for free
│   ├── repo-structure.md              # This file
│   └── decisions/                     # Architecture Decision Records
│       └── ...
│
├── engine/                            # Reference implementation of the Lorraine spec (TypeScript)
│   │                                  # This is the framework. Import it and call the interface.
│   │                                  # Two parts: Core (deterministic, no LLM) +
│   │                                  # Services (LLM-powered, optional).
│   │
│   ├── trust/                         # Core: Trust state management
│   │   ├── record.ts                  # recordVerification: atomic evidence write
│   │   ├── claim.ts                   # recordClaim: self-reported belief capture
│   │   ├── retract.ts                 # retractEvent: event correction with audit trail
│   │   ├── query.ts                   # getTrustState / getBulkTrustState: derived reads
│   │   ├── propagate.ts              # propagateTrust: ripple effects across graph
│   │   └── decay.ts                   # decayTrust: time-based confidence degradation
│   │
│   ├── graph/                         # Core: The concept graph structure
│   │   ├── nodes.ts                   # Concept node definitions and operations
│   │   ├── edges.ts                   # Relationship edge types and inference strength
│   │   └── load.ts                    # loadConcepts: bulk graph ingestion and validation
│   │
│   ├── epistemics/                    # Core: Framework self-awareness
│   │   ├── calibrate.ts               # calibrate: model accuracy + claim calibration
│   │   └── explain.ts                 # explainDecision: transparent reasoning chains
│   │
│   ├── services/                      # Services: LLM-powered adapters (optional)
│   │   ├── generate.ts                # generateVerification: produce verification interactions
│   │   ├── interpret.ts               # interpretResponse: translate responses to trust updates
│   │   ├── implicit.ts                # extractImplicitSignals: mine conversation for signals
│   │   └── self-request.ts            # requestSelfVerification: person-initiated checks
│   │
│   ├── store/                         # Data layer: persistence interface + implementations
│   │   ├── interface.ts               # What any database must implement
│   │   └── sqlite.ts                  # SQLite implementation (reference)
│   │
│   ├── types.ts                       # The schema (the spec, in code)
│   └── index.ts                       # Engine entry point: exports the full API
│
├── domains/                           # Example domain knowledge graphs
│   │                                  # Each domain is a pluggable dataset.
│   │                                  # The framework is domain-agnostic. These are data.
│   │
│   ├── schema.ts                      # Domain graph schema: what a valid domain looks like
│   ├── loader.ts                      # Loads and validates domain graphs
│   ├── networking/
│   │   ├── graph.json                 # Concepts, relationships, territories, thresholds
│   │   └── meta.json                  # Domain metadata: name, description, prerequisites
│   └── ...
│
├── llm/                               # LLM provider abstraction
│   │                                  # The engine services define WHAT the LLM needs to produce.
│   │                                  # This layer handles HOW: provider-specific integration.
│   │
│   ├── interface.ts                   # What the engine services need from the LLM
│   ├── providers/
│   │   ├── anthropic.ts               # Claude integration
│   │   ├── openai.ts                  # OpenAI integration
│   │   └── local.ts                   # Ollama / local model integration
│   ├── prompts/                       # Prompt templates
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
├── apps/                              # Reference applications built on the framework
│   │                                  # Each app is opinionated. The framework is not.
│   │                                  # Apps depend on engine, never the reverse.
│   │
│   └── terrain/                       # Reference application: Terrain (Learning OS)
│       │                              # See apps/terrain/SPEC.md for full specification.
│       │
│       ├── SPEC.md                    # Terrain spec: beliefs, agent, modes, guardrails
│       ├── conversation/              # The primary interface
│       │   ├── loop.ts                # processConversationTurn: main interaction loop
│       │   ├── mode-detection.ts      # Detect when conversation should become a mode
│       │   ├── claims.ts              # Claim extraction from natural conversation
│       │   └── history.ts             # Session history and continuity
│       │
│       ├── modes/                     # The six verification surfaces
│       │   ├── explain/               # First-principles layered explanation
│       │   │   ├── depth-ladder.ts    # The four-layer depth model
│       │   │   └── renderer.ts        # How explanations are presented
│       │   ├── sandbox/               # Annotated code execution
│       │   │   ├── runtime.ts         # Code execution environment
│       │   │   ├── annotator.ts       # The annotation engine
│       │   │   └── suggestions.ts     # Experiment suggestion logic
│       │   ├── grill/                 # Adaptive questioning
│       │   │   ├── generator.ts       # Question generation (uses engine + LLM)
│       │   │   ├── difficulty.ts      # Difficulty axis selection
│       │   │   └── feedback.ts        # Post-answer flow
│       │   ├── sketch/                # Visual thinking canvas
│       │   │   ├── canvas.ts          # Drawing surface
│       │   │   └── critique.ts        # Agent analysis of sketches
│       │   ├── write/                 # Feynman technique writing
│       │   │   ├── editor.ts          # Writing surface
│       │   │   └── feedback.ts        # Real-time gap detection
│       │   └── provision/             # Environment provisioning
│       │       ├── templates.ts       # Pre-built environment templates
│       │       └── lifecycle.ts       # Create, snapshot, restore, destroy
│       │
│       ├── map/                       # The trust map visualization
│       │   ├── renderer.ts            # How the map is displayed
│       │   ├── territories.ts         # Territory clustering and ownership computation
│       │   ├── thresholds.ts          # Threshold detection and readiness criteria
│       │   ├── navigation.ts          # Interaction with the map
│       │   └── trust-dashboard.ts     # The transparent trust state view
│       │
│       ├── calibration/               # Self-calibration view
│       │   └── view.ts               # Claim vs. evidence gap visualization
│       │
│       ├── guardrails/                # Operational integrity rules
│       │   ├── signal-policy.ts       # Implicit signal write policy
│       │   ├── claim-rules.ts         # Claim extraction rules
│       │   └── dedup.ts              # Signal deduplication
│       │
│       └── ui/                        # Frontend
│           └── ...
│
└── tests/
    ├── engine/                        # Framework tests: must pass independently of any app
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

### 1. The engine is the framework
The `engine/` directory is the reference implementation of the Lorraine spec. It implements the four layers (schema, data, computation, query) as a TypeScript library. Import it and call the interface directly. If you need HTTP access, wrap it in a server. If you need Lorraine in another language, implement the spec in `docs/`.

### 2. Engine core vs. engine services
The engine has two parts. Core (trust/, graph/, epistemics/, store/) is deterministic with zero LLM dependencies. Services (services/) is LLM-powered and optional. Core can run fully encrypted client-side. Services is where plaintext meets the LLM. The boundary is explicit. An application that only receives external verification events doesn't need services at all.

### 3. Engine has zero UI dependencies
The `engine/` directory is pure logic. It could run in a CLI, a web app, a mobile app, or as a headless service processing events from a CI/CD pipeline. It imports nothing from `apps/`.

### 4. Domains are data, not code
Domain knowledge graphs live in `domains/` as JSON, not as application logic. Adding a new domain means adding a JSON file, not writing code. The framework validates and loads them through a standard schema.

### 5. LLM is a swappable layer
The `llm/` directory abstracts model providers. The engine services define what they need (through `llm/interface.ts`). Providers implement that interface. Switching from Claude to a local model means changing a config, not refactoring.

### 6. Apps depend on engine, never the reverse
`apps/terrain/` imports from `engine/`. `engine/` never imports from `apps/`. This is enforced structurally. The framework doesn't know what applications exist. Each application is opinionated; the engine is not.

### 7. Tests mirror the architecture
Engine tests run without any app. App tests run with the engine. This validates that the framework works independently of any application built on it.

### 8. Application-level concepts live in applications
Territories, thresholds, goals, sessions, maps, modes, guardrails: these are Terrain concepts, not framework concepts. They live in `apps/terrain/`, not in `engine/`. Other applications built on Lorraine will have their own application-level concepts.
