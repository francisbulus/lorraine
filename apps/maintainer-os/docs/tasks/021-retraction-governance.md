# 021 — Retraction Governance (Phase 4)

## Goal

Extend retraction with governance workflows: approval chains, audit reporting, and bulk retraction support for identity mixups or consent erasure.

## Acceptance Criteria

- [ ] `mos retract --event-id <id> --reason consent_erasure --by <actor>` handles GDPR-style erasure: retracts all events for a person, recomputes all trust state
- [ ] `mos retract --person <id> --reason identity_mixup --by <actor>` retracts all events for a person (bulk)
- [ ] Retraction audit report: `mos retract --audit --since <duration>` lists all retractions with reason, actor, timestamp, affected concepts
- [ ] Retraction policy: configurable rules for who can retract what (e.g., only managers can retract for reason `fraudulent`)
- [ ] All retractions logged with full audit trail per Lorraine invariant 6
- [ ] Tests: bulk retraction, audit report, policy enforcement

## Files to Create

- `apps/maintainer-os/cli/src/lib/retraction-governance.ts`
- `apps/maintainer-os/cli/src/lib/retraction-governance.test.ts`

## Dependencies

- 009 (basic retraction command)
