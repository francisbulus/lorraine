# MaintainerOS: Evidence Ops For Codebase Understanding

**Version:** 0.2 (Draft)<br>
**Last Updated:** February 23, 2026<br>
**Built on:** Lorraine engine core + services (`engine/` and `engine/services/`)<br>
**Mode:** CLI-first, no required web UI

MaintainerOS is an operational system for answering one question with evidence:

**Who actually understands this codebase deeply enough to review, ship, and recover it safely?**

It does not measure course completion. It does not measure self-confidence alone. It models demonstrated understanding, inferred understanding, decay, contestation, and calibration, then exposes this through CLI workflows for engineering teams.

---

## 0. What This Application Believes

1. Real engineering work is the best evidence surface.
2. Review quality is a measurable trust signal.
3. Incident handling is a stronger signal than training checklists.
4. Readiness decisions should be explainable and challengeable.
5. Bus factor is a trust distribution problem, not a headcount problem.

MaintainerOS enforces Lorraine invariants:
- Trust is evidence-based.
- Trust is conservative.
- Trust is transparent.
- Failure is informative.
- Trust state is derived from events, not manually edited.

---

## 1. Application-Level Concepts

These are MaintainerOS concepts. They are application-layer, not Lorraine primitives.

### 1.1 Codebase Domain

A domain graph for a repository or platform area.

Examples:
- `event-bus-semantics`
- `migration-safety`
- `cache-coherency`
- `auth-boundaries`
- `incident-triage`
- `rollback-strategy`

### 1.2 Concept-to-File Mapping

MaintainerOS maps concepts to file paths in the repository. This is how the application knows which concepts a PR touches. The mapping is defined in the domain pack:

```yaml
mappings:
  auth-boundaries:
    paths: ["src/auth/**", "config/permissions.yaml", "src/middleware/auth*"]
  migration-safety:
    paths: ["migrations/**", "src/db/migrate*", "scripts/schema-*"]
  cache-coherency:
    paths: ["src/cache/**", "src/events/invalidat*"]
  event-bus-semantics:
    paths: ["src/events/**", "src/pubsub/**", "config/event-schemas*"]
  incident-triage:
    paths: ["runbooks/**", "src/monitoring/**", "config/alerts*"]
  rollback-strategy:
    paths: ["scripts/rollback*", "src/deploy/**", "config/deploy*"]
```

Glob patterns are matched against the file list in a PR. When a PR touches files matching a concept's paths, that concept is associated with the PR for evidence recording and reviewer recommendation.

A single file can map to multiple concepts. A PR touching both `src/auth/` and `src/cache/` maps to both `auth-boundaries` and `cache-coherency`.

### 1.3 Capability Bundles

Named groups of concepts tied to engineering responsibilities.

Examples:
- `release-captain`
- `primary-oncall`
- `security-reviewer`
- `schema-owner`

### 1.4 Role Gates

Readiness rules for a bundle.

Example:
- `release-captain` requires:
  - `migration-safety`: `verified`
  - `rollback-strategy`: `verified`
  - `incident-triage`: `verified`
  - `event-bus-semantics`: at least `inferred` with confidence >= 0.6

### 1.5 Evidence Channels

Where signals come from:
- GitHub PR merges
- GitHub review comments
- CI pipeline outcomes
- Incident management events
- Postmortem quality checks
- Scheduled probe responses
- Human manager claim reviews

### 1.6 Operational Sessions

A bounded loop of:
1. Detect stale/contested gaps
2. Generate probes
3. Collect responses
4. Record verification
5. Propagate and recalibrate

---

## 2. Product Outcomes

### 2.1 Primary Outcomes

1. Assign reviewers with evidence, not familiarity.
2. Decide release captain and on-call readiness with traceable reasoning.
3. Detect concentrated knowledge risk early.
4. Improve team calibration between confidence and demonstrated ability.

### 2.2 Non-Goals

1. Replacing code review process.
2. Performance management scoring.
3. Building a social reputation leaderboard.
4. Auto-promoting engineers to roles without human decision.

---

## 3. CLI UX Specification

MaintainerOS is designed to be useful in terminal-only environments.

### 3.1 Command Groups

- `mos init`
- `mos domain`
- `mos ingest`
- `mos status`
- `mos ready`
- `mos why`
- `mos challenge`
- `mos calibrate`
- `mos reviewers`
- `mos retract`
- `mos daemon`

### 3.2 Primary Commands

#### `mos init`

Initialize local workspace and config.

```bash
mos init --repo github.com/acme/payments --db ~/.maintaineros/maintaineros.db
```

Creates:
- `~/.config/maintaineros/config.toml`
- local store connection
- default service endpoints

#### `mos domain load`

Load concept graph for a repository.

```bash
mos domain load --file ./domains/payments-core.json
```

Calls `loadConcepts`.

#### `mos status`

Show trust map summary for a person.

```bash
mos status --person alice
```

Output sections:
- Verified concepts
- Inferred concepts
- Contested concepts
- Untested concepts
- Stale concepts
- Calibration gap summary

#### `mos ready`

Evaluate readiness against a bundle.

```bash
mos ready --person alice --bundle release-captain
```

Returns:
- pass/fail per required concept
- confidence and decay notes
- blockers
- next best verification actions

#### `mos reviewers`

Recommend reviewers for a PR by concept coverage.

```bash
mos reviewers --pr 482 --top 3
```

Returns ranked reviewers with:
- concept coverage score
- direct verification ratio
- contested risk flags
- explanation handle (`mos why --decision ...`)

#### `mos why`

Explain a decision or trust state.

```bash
mos why --person alice --concept migration-safety
mos why --decision reviewer_assignment --id pr-482
```

Calls `explainDecision` and prints evidence chain.

#### `mos challenge`

Create or trigger self-initiated verification.

```bash
mos challenge --person alice --concept auth-boundaries
```

Calls `requestSelfVerification` or `generateVerification`, then posts to chosen channel.

#### `mos calibrate`

Inspect model quality and self-calibration.

```bash
mos calibrate --person alice
```

Calls `calibrate` and shows:
- prediction accuracy
- over/under-confidence bias
- stale percentage
- surprise rate
- claim calibration
- recommendation

#### `mos ingest run`

Run one-shot ingest from external systems.

```bash
mos ingest run --source github --since 24h
mos ingest run --source incidents --since 7d
```

Writes `recordVerification` events with `source: external`.

#### `mos daemon start`

Run local scheduler and workers.

```bash
mos daemon start --profile local
```

Starts:
- ingest workers
- probe scheduler
- notifier
- retry queue workers

### 3.3 Output Modes

All commands support:
- `--format table` (default)
- `--format json`
- `--format yaml`

### 3.4 Exit Codes

- `0`: success
- `2`: policy/readiness unmet
- `3`: configuration error
- `4`: upstream ingest error
- `5`: storage error
- `6`: LLM interpretation/generation failure

---

## 4. Core Workflows

### 4.1 Reviewer Assignment Workflow

1. PR metadata is mapped to concepts via the concept-to-file mapping.
2. Candidates are scored from `getBulkTrustState`.
3. Contested and stale concepts are penalized.
4. Top candidates are returned with rationale.

### 4.2 On-call Readiness Workflow

1. Evaluate role gate requirements.
2. Trigger probes for stale/untested/contested requirements.
3. Update trust after response + external incident events.
4. Recompute readiness.

### 4.3 Incident Evidence Workflow

1. Incident tooling emits structured events.
2. Mapper converts event to concept-level verification.
3. Call `recordVerification` with `external:observed` modality.
4. Call `propagateTrust` for related concepts.

### 4.4 Challenge Workflow

1. Engineer challenges model using `mos challenge`.
2. Prompt generated and delivered.
3. Response interpreted.
4. Verification event recorded.
5. Calibration gap updated.

---

## 5. Service Architecture

MaintainerOS can run fully headless with CLI + background daemons.

### 5.1 Components

Phase 1 ships as a single binary. The components below are logical modules, not separate services:

1. **CLI**: terminal UX, reads local config, calls engine directly.

2. **Domain service**: loads and validates domain packs, maintains role gate definitions.

3. **Evidence router**: normalizes internal and external signals, applies evidence policy, writes events via `recordVerification` and `recordClaim`.

4. **GitHub ingest**: consumes GitHub webhooks/events, maps PR/review artifacts to concept signals via the concept-to-file mapping.

5. **Incident ingest**: consumes incident management data, emits verification events for response quality.

6. **Probe scheduler**: runs periodic stale/contested scans, triggers `generateVerification` jobs.

7. **LLM worker**: runs `generateVerification`, `interpretResponse`, `extractImplicitSignals`. Handles parsing fallback and retries.

8. **Notifier**: sends probes/results to Slack, email, or GitHub comments.

9. **Store**: Lorraine store backend (SQLite for local, Postgres for team deployment).

10. **Queue**: durable queue for ingest and probe jobs.

### 5.2 Runtime Topology

```text
mos-cli
  -> engine core (in-process)
  -> engine services (via LLM worker)
  -> store

External systems
  -> GitHub ingest -------\
  -> Incident ingest -------> Evidence router -> engine core

Probe scheduler -> LLM worker -> Notifier -> Engineer response
                                    |              |
                                    +-------> Evidence router
```

### 5.3 Deployment Profiles

1. **local-single-process**: SQLite, in-process queue, ideal for pilot teams.

2. **team-service**: Postgres, durable queue (Redis/PG-based), multiple workers.

3. **air-gapped**: no hosted LLM, only structured external evidence + local/manual prompts.

---

## 6. Evidence Policy and Mapping

### 6.1 Evidence Strength Classes

- `strong`: direct high-signal action under pressure
- `medium`: quality review or partial real-world execution
- `weak`: low-context activity without quality proof

### 6.2 Mapping Examples

1. **PR merged touching migration files with rollback notes**
   - concept: `migration-safety`
   - modality: `external:observed`
   - result: `partial` by default
   - upgraded to `demonstrated` if rollback plan + test evidence pass policy checks

2. **Review comment catches a real race condition before merge**
   - concept: `cache-coherency`
   - modality: `external:observed`
   - result: `demonstrated`

3. **Incident responder restores service inside SLA with correct mitigation path**
   - concept: `incident-triage`
   - modality: `external:observed`
   - result: `demonstrated`

4. **Postmortem missing causal timeline**
   - concept: `postmortem-quality`
   - modality: `external:observed`
   - result: `failed` or `partial` by policy threshold

### 6.3 No Event On Absence

No meaningful action means no verification event. Silence is not proof.

---

## 7. Data Contracts

### 7.1 Domain Pack

`domains/<repo>.json`
- concepts
- edges
- concept-to-file mappings
- optional capability bundles and role gates (app layer)

### 7.2 Role Gate Spec

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

### 7.3 CLI Config

`~/.config/maintaineros/config.toml`

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

## 8. Lorraine API Usage Contract

### 8.1 Core APIs

- `loadConcepts`
- `recordVerification`
- `recordClaim`
- `retractEvent`
- `getTrustState`
- `getBulkTrustState`
- `propagateTrust`
- `decayTrust`
- `getGraph`
- `calibrate`
- `explainDecision`

### 8.2 Services APIs

- `generateVerification`
- `interpretResponse`
- `extractImplicitSignals`
- `requestSelfVerification`

### 8.3 Application Rule

MaintainerOS does not write trust state directly. It only writes events.

---

## 9. Probe Generation and Response Interpretation

### 9.1 Probe Policy

Default probe priority order:
1. Contested required concepts
2. Stale required concepts
3. Untested required concepts
4. Low-confidence inferred required concepts

### 9.2 Probe Delivery

Supported channels:
- Slack DM
- GitHub comment thread
- CLI inbox (`mos challenge pull`)

### 9.3 Response Handling

`interpretResponse` returns per-concept trust updates, each with its own `result` (demonstrated/failed/partial) and `newState`. A single response can touch multiple concepts with different outcomes.

For each trust update in the response:
1. Write `recordVerification` using the update's `result` and `evidence`
2. Run `propagateTrust` for affected concepts
3. Update calibration data

---

## 10. Security, Privacy, and Governance

1. Do not store full private code blobs unless required.
2. Store references and minimal excerpts in `context` where possible.
3. Encrypt secrets and webhook tokens.
4. Log all retractions with reason and actor.
5. Restrict role-readiness views by manager permissions.
6. Preserve explainability for any staffing recommendation.

---

## 11. Reliability and Operations

### 11.1 Reliability Targets

- Ingest pipeline success >= 99%
- Probe scheduling run success >= 99%
- Mean decision explain latency < 1s for cached reads

### 11.2 Retry Policy

- Transient upstream failures: exponential backoff with jitter.
- Poison messages: dead-letter queue + manual inspect command.

### 11.3 Observability

CLI and service metrics:
- events ingested by source
- contested concept count by team
- stale required concepts by role
- calibration distribution by engineer
- queue depth and retry count

---

## 12. Implementation Phases

### Phase 1: Local Pilot

Scope:
- `mos init`, `mos domain load`, `mos status`, `mos ready`, `mos why`
- SQLite store
- manual event ingest CSV/JSON
- no LLM required

Exit criteria:
- 1 repository modeled
- 1 role gate evaluated end to end

### Phase 2: External Ingest + Reviewer Recs

Scope:
- GitHub ingest worker
- `mos reviewers`
- role gate policy file support
- scheduled decay scan
- no LLM required

Exit criteria:
- reviewer recommendations include explain traces
- stale/contested alerts working daily

### Phase 3: Probe Loop + LLM Services

Scope:
- `generateVerification` and `interpretResponse`
- `mos challenge`
- notifier integration

Exit criteria:
- scheduled probes with recorded evidence
- calibration reports used in team rituals

### Phase 4: Incident Integration + Governance

Scope:
- incident ingest worker
- retraction governance workflows
- permissioned readiness views

Exit criteria:
- on-call readiness decisions can be fully explained from evidence

---

## 13. Testing Strategy

1. **Unit tests**: domain mapping, role gate evaluation, command output rendering.

2. **Integration tests**: ingest to event write to trust query loop. Probe generation to interpretation to verification write loop.

3. **Policy tests**: ensure no direct trust-state mutation, verify conservative behavior on ambiguous evidence.

4. **Golden tests**: fixed dataset snapshots for `mos ready` and `mos why`.

---

## 14. Example End-to-End Session

```bash
# Ingest yesterday's GitHub activity
mos ingest run --source github --since 24h

# Check Alice's trust map
mos status --person alice

# Evaluate readiness for release captain
mos ready --person alice --bundle release-captain
# Blocker found: migration-safety is contested

# Challenge Alice on the contested concept
mos challenge --person alice --concept migration-safety
# Response interpreted as demonstrated

# Re-evaluate readiness
mos ready --person alice --bundle release-captain
# Now passes

# Full evidence trail
mos why --person alice --concept migration-safety
```

---

## 15. Build Checklist

1. Define domain graph, concept-to-file mappings, and role gates
2. Implement CLI command skeleton and output formatters
3. Wire Lorraine core store and API adapters
4. Add ingest adapters and evidence policy mappers
5. Add scheduler, queue, and notifier
6. Add LLM worker integration for probes
7. Ship pilot with one team and one role gate

MaintainerOS keeps the trust model honest while letting each organization define what readiness means for its own codebase.
