# MaintainerOS — Tech Spec

**Version:** 0.1 (Draft)<br>
**Last Updated:** February 23, 2026<br>
**Source:** SPEC.md v0.2

This document covers how MaintainerOS works technically: architecture, data flows, evidence policy, engine API mapping, and implementation phases. For product philosophy, user experience, and application-level concepts, see product.md. For CLI command specifications, output layouts, and UX principles, see cli.md.

---

## 1. Architecture

MaintainerOS is a CLI application built on the Lorraine engine. Phase 1 ships as a single binary. All components are logical modules within one process.

### 1.1 Components

1. **CLI layer.** Commander.js program with commands that read config, initialize the store, and call engine APIs. Human-readable output by default, structured output via `--format json/yaml`.

2. **Config manager.** Reads `~/.config/maintaineros/config.toml`. Provides store backend, LLM provider, integration settings, and notification config to all commands.

3. **Store adapter.** Wraps the Lorraine SQLite store from `engine/store/sqlite.ts`. Initializes the database from config path. Exposes the store interface to all commands.

4. **Domain service.** Loads and validates domain packs (JSON). Handles standard Lorraine fields (concepts, edges) plus MaintainerOS extensions (concept-to-file mappings, capability bundles, role gates). Calls `loadConcepts` on the engine core.

5. **Evidence router.** Normalizes signals from all sources (file ingest, GitHub, incidents, probe responses), applies evidence policy, and writes events via `recordVerification` and `recordClaim`. Calls `propagateTrust` after each batch.

6. **File mapper.** Resolves file paths to concept IDs using glob patterns from domain pack mappings. Used by GitHub ingest (Phase 2) and reviewer recommendation.

7. **Role gate evaluator.** Reads bundle definitions and gate requirements. Calls `getBulkTrustState`, compares against thresholds, returns pass/fail per concept with blockers and suggestions.

8. **Reviewer scorer.** Scores candidates against a set of concepts. Penalizes contested and stale trust. Ranks by coverage, confidence, and directness.

9. **LLM worker (Phase 3).** Calls `generateVerification`, `interpretResponse`, and `extractImplicitSignals` from engine services. Handles retries and parse fallbacks.

10. **Probe scheduler (Phase 3).** Scans for stale, contested, and untested required concepts. Queues probe generation jobs with priority ordering.

11. **Notifier (Phase 3).** Sends probes and results to Slack, email, GitHub comments, or CLI inbox.

12. **GitHub ingest (Phase 2).** Fetches PR and review data. Maps files to concepts. Produces verification events.

13. **Incident ingest (Phase 4).** Fetches incident data. Maps responder actions to concepts. Produces verification events.

14. **Daemon (Phase 4).** Runs ingest workers, probe scheduler, and notifier as a long-running process with a durable job queue.

### 1.2 Runtime Topology

```
mos-cli
  -> engine core (in-process)
  -> engine services (via LLM worker, Phase 3)
  -> store (SQLite or Postgres)

External systems (Phase 2+)
  -> GitHub ingest -------\
  -> Incident ingest -------> Evidence router -> engine core

Probe scheduler (Phase 3) -> LLM worker -> Notifier -> Engineer response
                                              |              |
                                              +-------> Evidence router
```

### 1.3 Deployment Profiles

1. **local-single-process.** SQLite, in-process queue. Ideal for pilot teams.
2. **team-service.** Postgres, durable queue (Redis or PG-based), multiple workers.
3. **air-gapped.** No hosted LLM. Only structured external evidence plus local or manual prompts.

---

## 2. Data Flows

### 2.1 Ingest Flow

```
Source (file, GitHub, incidents)
  -> Adapter (parses source-specific format)
  -> Evidence router
     -> Applies evidence policy (section 3)
     -> For each valid event:
        recordVerification(conceptId, personId, modality, result, context, source)
        propagateTrust(sourceConceptId, personId, verificationEvent)
     -> For each claim:
        recordClaim(conceptId, personId, selfReportedConfidence, context)
  -> Summary (events processed, errors, concepts affected)
```

### 2.2 Readiness Evaluation Flow

```
mos ready --person X --bundle Y
  -> Load bundle definition (from domain pack or policy file)
  -> For each required concept:
     getTrustState(conceptId, personId)
     -> Compare level and confidence against gate threshold
  -> Aggregate: pass/fail per concept, overall pass/fail
  -> Generate suggestions for blockers
  -> Exit code 0 (ready) or 2 (not ready)
```

### 2.3 Reviewer Recommendation Flow

```
mos reviewers --concepts A,B,C --top N
  (Phase 2: mos reviewers --pr 482 --top N)
  -> Resolve PR files to concepts via file mapper (Phase 2)
  -> For each candidate person in the store:
     getBulkTrustState(personId, conceptIds)
     -> Score: coverage, confidence, directness, recency
     -> Penalize: contested, stale
  -> Rank candidates
  -> Return top N with explanation handles
```

### 2.4 Probe Flow (Phase 3)

```
Probe scheduler scans all persons against role gates
  -> Priority: contested > stale > untested > low-confidence inferred
  -> For each (person, concept) pair:
     generateVerification(personId, conceptId, applicationContext: "onboarding")
     -> Deliver via notifier (Slack, GitHub, CLI inbox)

Engineer responds
  -> interpretResponse(verificationId, personId, response, responseModality)
     -> Returns per-concept trust updates, each with its own result
  -> For each trust update:
     recordVerification(conceptId, personId, modality, result, context, source: "internal")
     propagateTrust(sourceConceptId, personId, verificationEvent)
  -> Calibration data updated
```

### 2.5 Explanation Flow

```
mos why --person X --concept Y
  -> getTrustState(conceptId, personId)
     -> Full derived state: level, confidence, verification history,
        claim history, modalities tested, inference chain, decay
  -> explainDecision(decisionType: "trust_update", decisionContext)
     -> Reasoning, trust inputs, alternatives, confidence
  -> Format as readable narrative with evidence chain
```

---

## 3. Evidence Policy

### 3.1 Evidence Strength Classes

- **Strong.** Direct high-signal action under pressure. Result: `demonstrated`.
- **Medium.** Quality review or partial real-world execution. Result: `partial`.
- **Weak.** Low-context activity without quality proof. Result: `partial` or no event.

### 3.2 Mapping Rules

**PR merged touching mapped files.**
- Default result: `partial` (merge alone is medium evidence).
- Upgraded to `demonstrated` if: rollback plan present, test evidence passes policy checks, review discussion shows reasoning depth.

**Review comment catches a real issue before merge.**
- Result: `demonstrated` for the reviewer on the relevant concept.
- Context includes the review comment content and the issue caught.

**Incident responder restores service inside SLA with correct mitigation.**
- Result: `demonstrated` for the responder on `incident-triage` and any relevant mitigation concepts.
- Context includes incident ID, timeline, and responder actions.

**Postmortem with quality gaps.**
- Result: `failed` or `partial` on `postmortem-quality` depending on severity.
- Context includes peer review feedback.

### 3.3 No Event on Absence

No meaningful action produces no verification event. An uneventful on-call shift, a PR with no mapped files, a training module completed without demonstration. Silence is not proof.

### 3.4 Modality

All external evidence uses `external:observed` modality. Probe responses use the probe's target modality (typically `grill:transfer` or `grill:inference`). Claims use `recordClaim`, not `recordVerification`.

---

## 4. Engine API Usage

### 4.1 Core APIs Used

| API | Used By | Purpose |
|-----|---------|---------|
| `loadConcepts` | Domain service | Ingest concept graph |
| `recordVerification` | Evidence router | Write verification events |
| `recordClaim` | Evidence router | Write claim events |
| `retractEvent` | Retract command | Correct events |
| `getTrustState` | Status, why, ready | Read single concept trust |
| `getBulkTrustState` | Status, ready, reviewers | Read trust across concepts |
| `propagateTrust` | Evidence router | Compute ripple effects |
| `decayTrust` | Decay scan | Time-based confidence degradation |
| `getGraph` | Status (verbose) | Full graph with trust overlay |
| `calibrate` | Calibrate command | Model and person accuracy |
| `explainDecision` | Why command | Transparent reasoning chains |

### 4.2 Services APIs Used (Phase 3+)

| API | Used By | Purpose |
|-----|---------|---------|
| `generateVerification` | Challenge, probe scheduler | Create verification prompts |
| `interpretResponse` | Challenge, probe scheduler | Translate responses to trust updates |
| `extractImplicitSignals` | Probe response handler | Mine responses for bonus signals |
| `requestSelfVerification` | Challenge (self-initiated) | Person-initiated verification |

### 4.3 Application Rule

MaintainerOS never writes trust state directly. It only writes events. Trust state is always derived by the engine from the event log through the computation layer. This is Invariant 6.

---

## 5. Data Contracts

### 5.1 Domain Pack Schema

```json
{
  "id": "payments-core",
  "name": "Payments Core",
  "description": "Core concepts for the payments codebase",
  "version": "0.1",
  "concepts": [
    { "id": "auth-boundaries", "name": "Auth Boundaries", "description": "..." }
  ],
  "edges": [
    { "from": "log-analysis", "to": "incident-triage", "type": "prerequisite", "inferenceStrength": 0.6 }
  ],
  "mappings": {
    "auth-boundaries": { "paths": ["src/auth/**", "config/permissions.yaml"] }
  },
  "bundles": {
    "release-captain": {
      "required": [
        { "concept": "migration-safety", "minLevel": "verified" },
        { "concept": "rollback-strategy", "minLevel": "verified" },
        { "concept": "incident-triage", "minLevel": "verified" },
        { "concept": "event-bus-semantics", "minLevel": "inferred", "minConfidence": 0.6 }
      ]
    }
  }
}
```

Standard Lorraine fields (`concepts`, `edges`) are passed to `loadConcepts`. MaintainerOS extensions (`mappings`, `bundles`) are stored and managed at the application layer.

### 5.2 Event Ingest Schema

```json
[
  {
    "type": "verification",
    "conceptId": "rollback-strategy",
    "personId": "alice",
    "modality": "external:observed",
    "result": "demonstrated",
    "context": "Rolled back deployment v2.4.7 during INC-4821",
    "source": "external",
    "timestamp": "2026-02-20T14:30:00Z"
  },
  {
    "type": "claim",
    "conceptId": "log-analysis",
    "personId": "alice",
    "selfReportedConfidence": 0.7,
    "context": "Team self-assessment survey",
    "timestamp": "2026-02-15T10:00:00Z"
  }
]
```

### 5.3 Role Gate Policy File

```yaml
bundles:
  release-captain:
    required:
      - concept: migration-safety
        min_level: verified
      - concept: rollback-strategy
        min_level: verified
      - concept: incident-triage
        min_level: verified
      - concept: event-bus-semantics
        min_level: inferred
        min_confidence: 0.6
```

Policy files override domain pack gates for the same bundle name. This allows teams to version-control readiness policies independently of domain graphs.

### 5.4 Config File

```toml
[store]
backend = "sqlite"
path = "~/.maintaineros/maintaineros.db"

[llm]
provider = "anthropic"
model = "claude-sonnet-4-20250514"

[integrations.github]
enabled = true
repo = "acme/payments"

[integrations.incidents]
enabled = true
provider = "pagerduty"

[notifications]
channel = "slack"
```

---

## 6. Implementation Phases

### Phase 1: Local Pilot (Tasks 001-010)

**Scope.** `mos init`, `mos domain load`, `mos ingest run --source file`, `mos status`, `mos ready`, `mos why`, `mos calibrate`, `mos retract`, `mos reviewers --concepts`. SQLite store. Manual event ingest from JSON/CSV. No LLM required.

**Exit criteria.** One repository modeled. One role gate evaluated end to end. Full local loop: init, load, ingest, status, ready, why.

### Phase 2: External Ingest + Reviewer Recs (Tasks 011-015)

**Scope.** Concept-to-file mapper. GitHub ingest worker. `mos reviewers --pr`. Role gate policy files (YAML). Scheduled decay scan. No LLM required.

**Exit criteria.** Reviewer recommendations include explain traces. Stale and contested alerts working daily.

### Phase 3: Probe Loop + LLM Services (Tasks 016-019)

**Scope.** LLM worker integration. `mos challenge`. Probe scheduler. Notifier integration (Slack, GitHub, CLI inbox).

**Exit criteria.** Scheduled probes with recorded evidence. Calibration reports used in team rituals.

### Phase 4: Incident Integration + Governance (Tasks 020-024)

**Scope.** Incident ingest worker. Retraction governance workflows. Permissioned readiness views. Daemon mode. Observability and metrics.

**Exit criteria.** On-call readiness decisions can be fully explained from evidence.

---

## 7. Testing Strategy

1. **Unit tests.** Domain mapping, role gate evaluation, evidence policy, reviewer scoring, command output formatting.

2. **Integration tests.** Ingest to event write to trust query loop. Probe generation to interpretation to verification write loop (Phase 3).

3. **Policy tests.** No direct trust-state mutation. Conservative behavior on ambiguous evidence. Evidence strength classification.

4. **Golden tests.** Fixed dataset snapshots for `mos ready`, `mos why`, `mos status`, and `mos reviewers`. Both `--format table` and `--format json` variants.

5. **End-to-end test.** Full Phase 1 loop: init, domain load, ingest events, status, ready, why. Zero errors, correct exit codes.

---

## 8. Reliability

### 8.1 Targets

- Ingest pipeline success >= 99%.
- Probe scheduling run success >= 99%.
- Mean decision explain latency < 1s for cached reads.

### 8.2 Retry Policy

- Transient upstream failures: exponential backoff with jitter.
- Poison messages: dead-letter queue plus manual inspect command.

### 8.3 Observability

CLI and service metrics: events ingested by source, contested concept count by team, stale required concepts by role, calibration distribution by engineer, queue depth and retry count.

---

## 9. Security and Privacy

1. Do not store full private code blobs unless required. Store references and minimal excerpts in event context fields.
2. Encrypt secrets and webhook tokens.
3. Log all retractions with reason and actor.
4. Restrict role-readiness views by manager permissions (Phase 4).
5. Preserve explainability for any staffing recommendation.
6. Support consent erasure: retract all events for a person via `retractEvent` with reason `consent_erasure`.
