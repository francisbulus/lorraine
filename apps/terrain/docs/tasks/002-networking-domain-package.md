# 002 — Networking Domain Package

## Goal

Create the first domain package — computer networking — with concepts, edges, and territory groupings. Load it into the engine via `loadConcepts`.

## Acceptance Criteria

- [ ] Domain JSON file created at `domains/networking.json` following domain-schema.md
- [ ] Concepts cover: TCP reliability, TCP handshake, sequence numbers, retransmission, flow control, congestion control, DNS resolution, HTTP fundamentals, TLS basics
- [ ] Edges define prerequisite, component_of, and related_to relationships with appropriate inference strengths
- [ ] Territory groupings defined: "TCP Reliability", "DNS Resolution", "HTTP Fundamentals", "TCP Advanced" (at minimum)
- [ ] Threshold definitions between territories with readiness criteria (which concepts, what trust levels)
- [ ] Domain loads successfully via engine `loadConcepts` with zero errors
- [ ] Utility function or script to load the domain into a store on app startup

## Files to Create

- `domains/networking.json`
- `apps/terrain/app/src/lib/domain-loader.ts`

## Dependencies

None — domain is independent data.
