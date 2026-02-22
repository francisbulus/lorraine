# Lorraine

A verifiable epistemic trust engine.

Lorraine tracks what someone actually knows — not what they've completed, not what they claim, not what's been assumed. It maintains a trust model built on evidence, with provenance, that decays honestly over time and distinguishes what's been demonstrated from what's been inferred.

The engine is domain-agnostic. Applications are built on top of it.

## The first application

A learning OS. A conversational agent that builds a map of a domain, tracks what you own, and gets out of your way so you can discover — not be told — that you understand.

## Principles

1. Trust is the foundational primitive
2. Self-trust through independent arrival
3. The agent is a mapmaker, not a guide
4. Learning is terrain ownership, not path completion
5. The gate is a threshold, not a test
6. The agent prompts self-reflection, not judgment
7. Collapse the cost of action until self-trust emerges
8. Approach-agnostic
9. Difficulty is sacred
10. Foundational capability over topical coverage
11. Failure is cheap, visible, and navigable

## Structure

```
engine/     — the trust engine (observe, model, decay, expose)
domains/    — pluggable domain knowledge graphs
llm/        — model provider abstraction
apps/       — applications built on the engine
sdk/        — external interface for third parties
docs/       — specs and design documents
```

## Named after

[Lorraine Code](https://en.wikipedia.org/wiki/Lorraine_Code), who argued that knowing well is an obligation, not a convenience.
