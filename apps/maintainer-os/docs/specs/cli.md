# MaintainerOS: CLI Specification

**Version:** 0.1<br>
**Last Updated:** February 23, 2026<br>
**Scope:** Phase 1 (local pilot). Covers CLI UX principles, command specifications, data formats, project structure, and testing requirements.

You are building MaintainerOS, a CLI tool for engineering teams that answers "who actually understands this codebase?" with evidence.

## What You're Building

A TypeScript CLI called `mos` that wraps the Lorraine trust engine. Phase 1 is local-only: SQLite store, manual event ingest, no LLM, no external integrations. One binary, one process.

## Tech Stack

- TypeScript (strict mode)
- Commander.js for CLI framework
- chalk for colored output
- cli-table3 for table rendering
- better-sqlite3 for local storage
- The Lorraine engine in `engine/` (already exists, import it directly)

## CLI UX Principles

Read https://clig.dev before making design decisions. These rules are non-negotiable:

**1. Human-first output by default, machine output by flag.**
Every command outputs readable, colored tables for humans. `--format json` and `--format yaml` output structured data for scripts. Never dump raw data structures as the default.

**2. Color communicates trust level.**
- Green: verified
- Yellow: inferred or contested
- Red: untested (for required concepts) or failed
- Grey/dim: untested (for non-required concepts)
- Bold: concept names
- Dim: timestamps and metadata

**3. Be quiet when things work, loud when they don't.**
`mos ingest run` prints a one-line summary on success ("12 events ingested, 3 new verifications"). On failure, print the error with context. Never log every API call by default. Support `--verbose` for debugging.

**4. Always suggest the next action.**
If `mos ready` returns BLOCKED, print which concepts are blocking AND the command to fix it: "Run `mos challenge --person alice --concept migration-safety` to verify." If `mos status` shows stale concepts, suggest `mos challenge`.

**5. Exit codes are semantic.**
- 0: success
- 2: policy/readiness unmet (not an error, just a "no")
- 3: configuration error
- 4: upstream ingest error
- 5: storage error
- 6: LLM interpretation/generation failure (Phase 3+)

**6. Help text is documentation.**
Every command has a one-line description, a usage example, and flag documentation. A user who types `mos ready --help` should understand what the command does without reading any other docs.

**7. Errors are sentences, not stack traces.**
"Could not find person 'alice'. Run `mos status` to see known people." Not "TypeError: Cannot read property 'trustState' of undefined."

**8. Progressive disclosure.**
`mos status --person alice` shows a summary. `mos status --person alice --verbose` shows full detail. `mos why --person alice --concept X` shows the evidence chain. Each level goes deeper. Don't dump everything at once.

## Commands to Implement (Phase 1)

### mos init
Initialize workspace. Create config file and SQLite database.
```
mos init --repo acme/payments --db ~/.maintaineros/mos.db
```

### mos domain load
Load a domain graph from JSON file. Calls `loadConcepts`.
```
mos domain load --file ./domains/payments.json
```
Validate the graph on load. Report: concepts loaded, edges created, errors found.

### mos ingest run
Ingest events from a CSV or JSON file. Each row becomes a `recordVerification` or `recordClaim` call.
```
mos ingest run --source file --file ./events/february.json
```
The `--source` flag identifies the ingest adapter. Phase 1 supports `file` only. Phase 2 adds `github`, Phase 4 adds `incidents`. The flag exists from the start for forward compatibility.

Print summary: events processed, verifications recorded, claims recorded, errors.

### mos status
Show trust map for a person.
```
mos status --person alice
```
Output layout:
```
Trust Map: alice
Last updated: 2026-02-23

VERIFIED (3)
  ✓ rollback-strategy      0.87  verified 3d ago  external:observed
  ✓ incident-triage         0.82  verified 5d ago  grill:transfer
  ✓ deployment-basics        0.79  verified 12d ago external:observed

INFERRED (2)
  ~ blast-radius-scoping    0.58  inferred from incident-triage
  ~ event-bus-semantics      0.41  inferred from cache-coherency

CONTESTED (1)
  ⚡ log-analysis             0.63  demonstrated + partial (conflicting evidence)

UNTESTED (2)
  · postmortem-quality
  · rate-limiting

Calibration: 72% prediction accuracy, 15% stale
```

### mos ready
Evaluate readiness against a capability bundle.
```
mos ready --person alice --bundle release-captain
```
Output layout:
```
Readiness: alice → release-captain

  ✓ migration-safety     verified (0.87)    MEETS REQUIREMENT
  ✓ rollback-strategy    verified (0.82)    MEETS REQUIREMENT
  ⚡ log-analysis          contested (0.63)   DOES NOT MEET (requires verified)
  · incident-triage       untested            DOES NOT MEET (requires verified)

Result: NOT READY (2 of 4 requirements met)

Next steps:
  mos challenge --person alice --concept log-analysis
  mos challenge --person alice --concept incident-triage
```
Exit code 2 when not ready. Exit code 0 when ready.

### mos why
Explain a trust state with full evidence chain. Calls `explainDecision`.
```
mos why --person alice --concept log-analysis
```
Output layout:
```
Trust Explanation: alice → log-analysis
Level: contested | Confidence: 0.63

Evidence chain:
  1. [Feb 12] grill:transfer → demonstrated
     "Correctly described log query strategy for cross-service correlation"
  2. [Feb 18] external:observed → partial
     "Postmortem for INC-4821: log analysis section flagged as insufficient"

Conflicting evidence across modalities produces CONTESTED state.

Inferences from this concept:
  → incident-triage: inferred at 0.38 (prerequisite edge, strength 0.6)
```

### mos reviewers
Recommend reviewers for a set of concepts. Phase 1 takes concept IDs directly. Phase 2 adds `--pr <number>` which resolves to concepts via the file mapper.
```
mos reviewers --concepts auth-boundaries,cache-coherency --top 3
```
Output layout:
```
Recommended Reviewers: auth-boundaries, cache-coherency

  1. bob
     auth-boundaries: verified (0.91, 3d ago)
     cache-coherency: verified (0.84, 7d ago)
     Coverage: 2/2 verified

  2. sarah
     auth-boundaries: verified (0.78, 14d ago)
     cache-coherency: inferred (0.52)
     Coverage: 1/2 verified, 1/2 inferred

  3. alice
     auth-boundaries: inferred (0.45)
     cache-coherency: untested
     Coverage: 0/2 verified, 1/2 inferred

Details: mos why --person bob --concept auth-boundaries
```

### mos calibrate
Show model quality and person calibration. Calls `calibrate`.
```
mos calibrate --person alice
```

### mos retract
Retract an event with reason. Calls `retractEvent`.
```
mos retract --event-id evt-123 --reason duplicate --retracted-by admin
```

## Data Formats

### Domain pack (JSON input for `mos domain load`)
```json
{
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
        { "concept": "rollback-strategy", "minLevel": "verified" }
      ]
    }
  }
}
```

### Event ingest (JSON input for `mos ingest run`)
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

## Project Structure

```
apps/maintainer-os/cli/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── cli.ts                  # Entry point, Commander program setup
│   ├── commands/
│   │   ├── init.ts
│   │   ├── domain.ts
│   │   ├── ingest.ts
│   │   ├── status.ts
│   │   ├── ready.ts
│   │   ├── why.ts
│   │   ├── reviewers.ts
│   │   ├── calibrate.ts
│   │   └── retract.ts
│   ├── lib/
│   │   ├── config.ts           # Read/write config.toml
│   │   ├── store.ts            # Engine store adapter
│   │   ├── domain.ts           # Domain loading and validation
│   │   ├── ingest.ts           # File parsing for manual ingest
│   │   ├── role-gates.ts       # Bundle and gate evaluation
│   │   ├── explain.ts          # Evidence chain formatting
│   │   ├── reviewer-scoring.ts # Reviewer ranking logic
│   │   ├── formatters.ts       # Table rendering, color mapping
│   │   ├── output.ts           # Format switching (table/json/yaml)
│   │   └── suggestions.ts      # "Next steps" generation
│   └── types.ts
├── fixtures/
│   ├── example-domain.json     # Example domain pack
│   └── example-events.json     # Example ingest file
└── tests/
    ├── commands/
    ├── lib/
    └── fixtures/               # Golden test snapshots
```

## What NOT to Build in Phase 1

- No web UI
- No GitHub integration (Phase 2)
- No incident tool integration (Phase 4)
- No LLM calls (Phase 3)
- No `mos challenge` (requires LLM, Phase 3)
- No `mos daemon` (requires ingest workers, Phase 4)
- No Slack/email notifications (Phase 3)
- No Postgres support (SQLite only)
- No authentication or permissions (Phase 4)

## Testing Requirements

- Every command has at least one golden test: fixed input, expected output snapshot.
- `mos ready` tests include both passing and failing cases with correct exit codes.
- `mos why` tests verify the full evidence chain renders correctly.
- `mos reviewers` tests verify ranking logic with multiple people and mixed trust states.
- All display tests run against both `--format table` and `--format json` to ensure parity.

## Definition of Done (Phase 1)

Phase 1 is done when:
1. `mos init` creates a working local workspace
2. `mos domain load` ingests a domain graph and reports results
3. `mos ingest run --source file` processes a JSON event file and writes to the engine
4. `mos status --person X` shows a colored trust map
5. `mos ready --person X --bundle Y` evaluates readiness with correct exit codes
6. `mos why --person X --concept Y` shows a full evidence chain
7. `mos reviewers --concepts X,Y --top N` ranks people by trust coverage
8. All commands support `--format json` for scriptability
9. All golden tests pass
10. A complete end-to-end test runs: init, load domain, ingest events, status, ready, why
