# Lorraine — Repository Structure

**Version:** 0.1
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
│   ├── main-spec.md                   # Implementation detail — modes, security, UX (partially superseded)
│   ├── philosophy.md                  # Intellectual lineage — Code, Fricker, Goldman, Fonagy
│   ├── why-llms.md                    # Why LLMs are structurally necessary for this system
│   ├── repo-structure.md              # This file
│   └── decisions/                     # Architecture Decision Records
│       └── ...
│
├── engine/                            # The Verifiable Epistemic Trust Engine
│   │                                  # No UI. No application logic.
│   │                                  # It observes, models, decays, exposes.
│   │
│   ├── trust/                         # Trust state management
│   │   ├── record.ts                  # recordVerification — atomic write
│   │   ├── query.ts                   # getTrustState — atomic read
│   │   ├── propagate.ts               # propagateTrust — ripple effects across graph
│   │   └── decay.ts                   # decayTrust — time-based degradation
│   │
│   ├── graph/                         # The trust graph structure
│   │   ├── nodes.ts                   # Concept node definitions and operations
│   │   ├── edges.ts                   # Relationship edge types and inference strength
│   │   ├── territories.ts             # Territory clustering and ownership computation
│   │   └── thresholds.ts              # Threshold detection and readiness criteria
│   │
│   ├── verification/                  # The verification loop
│   │   ├── generate.ts                # generateVerification — produce verification interactions
│   │   ├── interpret.ts               # interpretResponse — translate responses to trust updates
│   │   ├── implicit.ts                # extractImplicitSignals — mine conversation for signals
│   │   └── self-request.ts            # requestSelfVerification — learner-initiated checks
│   │
│   ├── navigation/                    # Learner movement through terrain
│   │   ├── goals.ts                   # setGoal — declare destinations
│   │   ├── crossing.ts                # crossThreshold — territory transitions
│   │   └── map.ts                     # getMap — terrain visibility
│   │
│   ├── epistemics/                    # Agent self-awareness
│   │   ├── calibrate.ts               # calibrate — agent audits its own model
│   │   └── explain.ts                 # explainDecision — transparent reasoning
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
├── llm/                               # LLM integration layer
│   │                                  # Abstraction over model providers.
│   │                                  # The engine defines WHAT the LLM needs to produce.
│   │                                  # This layer handles HOW.
│   │
│   ├── interface.ts                   # What the engine needs from the LLM
│   ├── providers/
│   │   ├── anthropic.ts               # Claude integration
│   │   ├── openai.ts                  # OpenAI integration
│   │   └── local.ts                   # Ollama / local model integration
│   ├── prompts/                       # Prompt templates (implementation detail, not engine)
│   │   ├── explain.ts                 # Explanation generation at various depths
│   │   ├── grill.ts                   # Question generation across difficulty axes
│   │   ├── interpret.ts               # Response interpretation
│   │   ├── annotate.ts                # Sandbox execution annotation
│   │   └── implicit.ts                # Implicit signal extraction from conversation
│   └── extraction/                    # Structured data extraction from LLM responses
│       ├── trust-signals.ts           # Extract trust updates from natural language
│       └── concept-detection.ts       # Detect concept references in conversation
│
├── apps/                              # Applications built on the engine
│   │
│   ├── learning-os/                   # Application #1 — the learning OS
│   │   ├── conversation/              # The primary interface
│   │   │   ├── loop.ts                # processConversationTurn — main interaction loop
│   │   │   ├── mode-detection.ts      # Detect when conversation should become a mode
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
│   │   │   ├── navigation.ts          # Learner interaction with the map
│   │   │   └── trust-dashboard.ts     # The transparent trust state view
│   │   │
│   │   └── ui/                        # Frontend
│   │       ├── ...                    # (framework TBD — React, Svelte, etc.)
│   │       └── ...
│   │
│   └── [future-apps]/                 # Future applications on the engine
│       ├── team-competency/           # Organizational knowledge mapping
│       ├── hiring-signal/             # Verified skill assessment
│       ├── mentorship/                # Mentor-learner trust visibility
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
    │   ├── verification/
    │   ├── navigation/
    │   └── epistemics/
    ├── domains/                       # Domain graph validation tests
    ├── integration/                   # Engine + LLM integration tests
    └── apps/
        └── learning-os/              # Learning OS application tests
```

## Key Structural Decisions

### 1. Engine has zero UI dependencies
The `engine/` directory is pure logic. It could run in a CLI, a web app, a mobile app, or as a headless service. It imports nothing from `apps/`. This is the engine boundary.

### 2. Domains are data, not code
Domain knowledge graphs live in `domains/` as JSON, not as application logic. Adding a new domain means adding a JSON file, not writing code. The engine validates and loads them through a standard schema.

### 3. LLM is a swappable layer
The `llm/` directory abstracts model providers. The engine defines what it needs (through `llm/interface.ts`). Providers implement that interface. Switching from Claude to a local model means changing a config, not refactoring.

### 4. Apps depend on engine, never the reverse
`apps/learning-os/` imports from `engine/`. `engine/` never imports from `apps/`. This is enforced structurally — the engine doesn't know what applications exist.

### 5. SDK is the external interface
If third parties want to build on the trust engine — submitting verification events from their own platforms, registering new domains, reading trust state — they use the `sdk/`. This is the extensibility layer discussed in the OS analogy.

### 6. Tests mirror the architecture
Engine tests run without any app. App tests run with the engine. This validates that the engine works independently.
