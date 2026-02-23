# 020 — Incident Ingest Adapter (Phase 4)

## Goal

Implement `mos ingest run --source incidents` to consume incident management data and emit verification events for response quality.

## Acceptance Criteria

- [ ] `mos ingest run --source incidents --since <duration>` fetches incident data from configured provider
- [ ] Incident-to-concept mapping: incident metadata (severity, services affected, responder actions) maps to relevant concepts
- [ ] Responder actions produce verification events: correct mitigation path is `demonstrated`, slow or incorrect is `partial` or `failed`
- [ ] Postmortem quality: if postmortem data available, produces separate event for `postmortem-quality` concept
- [ ] Modality: `external:observed` for all incident events
- [ ] Context field includes incident ID, timeline summary, and specific responder actions
- [ ] Provider abstraction: PagerDuty adapter first, interface for others
- [ ] No event on absence: uneventful shifts produce no events
- [ ] Tests: mock incident API, verify events for various incident shapes; verify no event on quiet shift

## Files to Create

- `apps/maintainer-os/cli/src/lib/incident-ingest.ts`
- `apps/maintainer-os/cli/src/lib/incident-ingest.test.ts`
- `apps/maintainer-os/cli/src/lib/adapters/pagerduty.ts`

## Dependencies

- 004 (ingest command structure)
- 012 (evidence policy patterns)
