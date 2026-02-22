# 002 — Networking Domain Package

## Goal

Create the first domain package — computer networking — with concepts, edges, and territory groupings. Load it into the engine via `loadConcepts`.

## Acceptance Criteria

- [x] Domain JSON file created at `domains/networking.json` following domain-schema.md
- [x] Concepts cover: TCP reliability, TCP handshake, sequence numbers, retransmission, flow control, congestion control, DNS resolution, HTTP fundamentals, TLS basics
- [x] Edges define prerequisite, component_of, and related_to relationships with appropriate inference strengths
- [x] Territory groupings defined: "TCP Reliability", "DNS Resolution", "HTTP Fundamentals", "TCP Advanced" (at minimum)
- [x] Threshold definitions between territories with readiness criteria (which concepts, what trust levels)
- [x] Domain loads successfully via engine `loadConcepts` with zero errors
- [x] Utility function or script to load the domain into a store on app startup

## Files to Create

- `domains/networking.json`
- `apps/terrain/app/src/lib/domain-loader.ts`

## Dependencies

None — domain is independent data.

## Completion Log

- 19 concepts across 5 territories (TCP Reliability, TCP Advanced, DNS Resolution, HTTP Fundamentals, TLS Basics)
- 26 edges with prerequisite, component_of, and related_to relationships
- 4 thresholds with readiness criteria (verified or inferred minimums)
- Domain loader with typed DomainPackage interface including territories and thresholds
- 17 tests covering loading, concept/edge validation, territory coverage, threshold integrity, graph queries
