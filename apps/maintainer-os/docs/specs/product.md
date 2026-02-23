# MaintainerOS — Product Spec

**Version:** 0.1 (Draft)<br>
**Last Updated:** February 23, 2026<br>
**Source:** SPEC.md v0.2

This document covers what MaintainerOS is, what it believes, and how engineering teams experience it. For implementation details, architecture, engine API mapping, and build phases, see tech.md.

---

## 0. What This Application Believes

1. Real engineering work is the best evidence surface.
2. Review quality is a measurable trust signal.
3. Incident handling is a stronger signal than training checklists.
4. Readiness decisions should be explainable and challengeable.
5. Bus factor is a trust distribution problem, not a headcount problem.

MaintainerOS enforces all six Lorraine invariants. Trust is evidence-based, conservative, transparent, failure-informative, never manipulated, and always derived from events. The application never writes trust state directly. It only writes events.

---

## 1. The Question

**Who actually understands this codebase deeply enough to review, ship, and recover it safely?**

Not "who has been here the longest." Not "who completed the training." Not "who says they know it." Who has demonstrated understanding, with evidence, recently enough that the evidence hasn't decayed.

MaintainerOS answers this question through CLI workflows for engineering teams. No web UI required. Terminal-first.

---

## 2. Application-Level Concepts

These exist in MaintainerOS but not in the Lorraine engine. The engine provides concepts, edges, verification events, claim events, and derived trust state. MaintainerOS adds:

### 2.1 Codebase Domains

A domain graph for a repository or platform area. Concepts represent areas of understanding required to work effectively in a codebase: `auth-boundaries`, `migration-safety`, `cache-coherency`, `incident-triage`, `rollback-strategy`.

Domain graphs are loaded via `loadConcepts`. The engine doesn't know these are about a codebase. It just sees concepts and edges.

### 2.2 Concept-to-File Mappings

MaintainerOS maps concepts to file paths in the repository using glob patterns. This is how the application knows which concepts a PR touches.

When a PR changes `src/auth/session.ts` and `config/permissions.yaml`, the mapper resolves these to the `auth-boundaries` concept. A single file can map to multiple concepts. A PR touching both `src/auth/` and `src/cache/` maps to both `auth-boundaries` and `cache-coherency`.

This mapping is application-layer. The engine has no concept of files, PRs, or repositories.

### 2.3 Capability Bundles

Named groups of concepts tied to engineering responsibilities: `release-captain`, `primary-oncall`, `security-reviewer`, `schema-owner`.

A bundle is a question: "does this person have the demonstrated understanding required for this responsibility?" The engine provides the trust state. MaintainerOS defines what "required" means.

### 2.4 Role Gates

Readiness rules for a bundle. Each gate specifies: which concepts are required, at what trust level, and at what minimum confidence.

Example: `release-captain` requires `migration-safety` verified, `rollback-strategy` verified, `incident-triage` verified, `event-bus-semantics` inferred at >= 0.6 confidence.

Gates are evaluations, not locks. They answer "is this person ready?" with evidence. The organization decides what to do with the answer.

### 2.5 Evidence Channels

Where verification signals come from:
- GitHub PR merges and review comments
- CI pipeline outcomes
- Incident management events
- Postmortem quality checks
- Scheduled probe responses
- Manual manager claim reviews
- File-based event ingest

Each channel writes events through the engine's `recordVerification` or `recordClaim` APIs. The engine doesn't know or care which channel produced the event. It records the modality, result, and context.

---

## 3. Product Outcomes

### 3.1 What MaintainerOS Enables

**Reviewer assignment with evidence.** Instead of assigning reviewers by git blame or team rotation, recommend reviewers who have demonstrated understanding of the concepts a PR touches. Contested or stale trust flags risk.

**Readiness decisions with traceable reasoning.** When someone asks "is Alice ready for release captain?", the answer comes with evidence: which concepts are verified, which are contested, which are untested, and what would close the gaps.

**Early knowledge risk detection.** When only one person on the team has verified trust on a critical concept, that is a bus factor problem. MaintainerOS surfaces it before it becomes an incident.

**Team calibration.** The gap between what engineers claim they understand and what the evidence shows is diagnostic. Teams that track calibration over time develop better self-awareness about their collective capability.

### 3.2 What MaintainerOS Does Not Do

**Replace code review.** MaintainerOS recommends reviewers and surfaces trust context. It does not approve or reject PRs.

**Score performance.** Trust state is about understanding, not productivity. A person with contested trust on a concept is at the frontier of learning, not underperforming.

**Build reputation leaderboards.** No ranking engineers against each other. Trust state is per-person, per-concept, for operational decisions.

**Auto-promote to roles.** MaintainerOS provides readiness assessments. Humans make staffing decisions.

---

## 4. User Experience

### 4.1 The Engineer's Experience

Engineers interact with MaintainerOS through the CLI. They can:
- See their own trust map: what concepts are verified, inferred, contested, untested, stale
- Challenge the model: request verification on any concept they believe they understand
- See why the model believes what it believes: full evidence chains
- Record claims: self-assess their understanding so calibration can be tracked
- See their calibration: how well their self-assessment matches the evidence

The engineer always has access to their own data. Transparency is non-negotiable (Invariant 3).

### 4.2 The Manager's Experience

Managers use MaintainerOS for operational decisions:
- Evaluate readiness for roles and responsibilities
- Get reviewer recommendations for PRs
- See team-level knowledge distribution
- Identify concentrated risk (bus factor)
- Track calibration across the team

Every recommendation comes with an explain handle. "Why was Bob recommended for this review?" is always answerable.

### 4.3 The Team's Experience

At the team level, MaintainerOS enables rituals:
- Weekly readiness reviews against role gates
- Calibration discussions: where do claims diverge from evidence?
- Knowledge gap planning: which untested or stale concepts matter most?
- Incident retrospectives: did the responder's trust state predict their performance?

---

## 5. Evidence Quality

Not all evidence is equal. MaintainerOS classifies evidence by strength:

**Strong evidence.** Direct high-signal action under pressure. Incident response that restores service. Review comment that catches a real vulnerability. Transfer-level probe response that derives the answer from first principles.

**Medium evidence.** Quality review or partial real-world execution. PR merged touching relevant files. Probe response showing correct recall but not transfer.

**Weak evidence.** Low-context activity without quality proof. PR merged with no review discussion. Training completion without demonstration.

The engine records all events. The evidence policy determines how events are classified. Strong evidence produces `demonstrated`. Medium produces `partial`. Weak may not produce an event at all.

### 5.1 No Event on Absence

An uneventful on-call shift produces no verification event. A PR with no relevant file changes produces no event. Silence is not proof. The engine does not fabricate evidence from absence.

---

## 6. Probes

When concepts are stale, contested, or untested, MaintainerOS can generate verification probes. A probe is a targeted question or scenario designed to test understanding of a specific concept.

Probes are generated by the engine services layer (`generateVerification`). They are delivered through configured channels: Slack DM, GitHub comment, email, or CLI inbox. Responses are interpreted by `interpretResponse`, which returns per-concept trust updates with individual results.

Probes are optional. Phase 1 and Phase 2 operate without LLM or probes. External evidence from GitHub and incident tooling is sufficient for many operational decisions. Probes add depth when teams want it.

---

## 7. Privacy and Governance

1. Trust data is about demonstrated understanding of codebases, not personal attributes.
2. Engineers always see their own full trust state.
3. Manager views show readiness summaries, not raw event details, unless explicitly requested.
4. All retractions are logged with reason and actor.
5. Consent erasure is supported: retract all events for a person.
6. Every staffing recommendation is explainable from evidence.
