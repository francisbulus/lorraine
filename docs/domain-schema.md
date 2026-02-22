# Lorraine — Domain Schema

**Version:** 0.1
**Last Updated:** February 22, 2026

---

## What a Domain Is

A domain is a portable, application-agnostic package of knowledge structure. It describes what can be known about a subject — concepts, how they relate, how they cluster into territories, and where the boundaries between territories are.

A domain does NOT contain:

- What counts as "learned" — the application decides
- Who is verifying — the application decides
- How verification happens — the engine and LLM layer decide
- What approach the learner should take — the learner decides
- What trust level is required — the application decides

Anyone can create a domain. The engine runs the same trust math on all of them.

---

## Schema

```typescript
interface Domain {
  id: string                    // unique identifier, e.g. "networking"
  name: string                  // human-readable, e.g. "Computer Networking"
  description: string           // what this domain covers
  version: string               // schema version for this domain

  concepts: Concept[]
  relationships: Relationship[]
  territories: Territory[]
  thresholds: Threshold[]
}

interface Concept {
  id: string                    // canonical, globally unique
                                // e.g. "tcp-handshake"
                                // if this concept appears in multiple domains,
                                // the same id is used — this is how cross-domain
                                // trust carries over

  name: string                  // human-readable
  description: string           // what this concept is, briefly

  depth_layers?: {              // optional — not all concepts need all four
    intuition?: string          // plain language, analogies
    abstraction?: string        // formal components and relationships
    mechanism?: string          // how it works step by step
    implementation?: string     // what it looks like in practice
  }

  misconceptions?: string[]     // common things people get wrong about this

  principles?: string[]         // references to cross-domain principle IDs
                                // empty for now, populated as principles
                                // layer is built
}

interface Relationship {
  from: string                  // concept id
  to: string                    // concept id
  type: "prerequisite"          // must understand `from` before `to`
       | "component_of"         // `from` is a part of `to`
       | "related_to"           // illuminates but doesn't block

  inference_strength: number    // 0.0 – 1.0
                                // how strongly does verified trust in `from`
                                // imply trust in `to`?
                                // prerequisite: typically 0.3 – 0.5
                                //   (knowing the prereq doesn't mean you know
                                //   the thing, but failing the prereq means
                                //   you probably don't)
                                // component_of: typically 0.6 – 0.8
                                //   (knowing the whole implies knowing parts)
                                // related_to: typically 0.1 – 0.3
                                //   (weak inference)
}

interface Territory {
  id: string
  name: string                  // human-readable, e.g. "TCP Reliability"
  description: string           // what this area of knowledge covers
  concepts: string[]            // concept ids that belong to this territory
}

interface Threshold {
  from_territory: string        // territory id
  to_territory: string          // territory id

  readiness_criteria: {
    concept_id: string
    min_trust_level: "verified" | "inferred"
                                // what level of trust is recommended
                                // before crossing
                                // note: recommended, not required
                                // the learner always decides
  }[]
}
```

---

## Cross-Domain Concepts

Concepts have a canonical `id` that is globally unique. When the same concept appears in multiple domains, it uses the same id.

Example: TCP handshake (`tcp-handshake`) appears in both the networking domain and the security domain. Both reference the same canonical id. The engine sees one node with one trust state. If you verify understanding of TCP handshake while learning networking, that trust carries over when you enter the security domain.

This is handled by convention, not by a central registry. Domain authors use the same id for the same concept. If two domains use different ids for what is actually the same concept, they'll be treated as separate nodes — suboptimal but not broken. A deduplication tool can merge them later.

### How to decide if two concepts are the same:

If a learner who demonstrates understanding of concept A in domain X would not need to re-demonstrate understanding of the same concept in domain Y — it's the same concept. Same id.

If the concept is the same idea but applied differently in each domain — it might be two related concepts rather than one shared concept. Use different ids with a `related_to` relationship.

---

## The Principles Layer (Future)

Cross-domain principles — abstract ideas that manifest as different concepts in different domains — are not yet part of the schema. When built, they will look approximately like:

```typescript
interface Principle {
  id: string                    // e.g. "acknowledgment-based-reliability"
  name: string
  description: string           // the abstract idea

  manifestations: {
    domain_id: string
    concept_id: string
    how: string                 // how this principle shows up in this concept
  }[]
}
```

Principles enable cross-domain inference at a deeper level than shared concepts. Demonstrating understanding of acknowledgment-based reliability in TCP (networking) creates an inferred trust signal for write-ahead logging (databases) — not because they're the same concept, but because they're the same principle.

This is not built yet. The schema reserves space for it via the `principles` field on concepts.

---

## Domain Creation

Domains can be created by:

- **Expert curation** — a person who knows the subject defines the concepts, relationships, territories, and thresholds. Highest quality. Slowest.
- **LLM generation** — an LLM reads documentation, textbooks, or curricula and produces a domain graph. Fast. Requires human review.
- **Community contribution** — open-source model where anyone can submit or refine domains. Scalable. Requires quality control.
- **Hybrid** — LLM generates a first draft, experts refine it, community contributes improvements.

The engine validates domains against this schema on load. Invalid domains are rejected. Valid domains are loaded and ready for the trust engine to operate on.

---

## Examples

### Minimal domain (3 concepts)

```json
{
  "id": "tcp-basics",
  "name": "TCP Basics",
  "description": "Fundamental TCP concepts",
  "version": "0.1",
  "concepts": [
    {
      "id": "tcp-handshake",
      "name": "TCP Three-Way Handshake",
      "description": "How TCP establishes a connection via SYN, SYN-ACK, ACK"
    },
    {
      "id": "tcp-sequence-numbers",
      "name": "TCP Sequence Numbers",
      "description": "How TCP tracks byte ordering using sequence numbers"
    },
    {
      "id": "tcp-retransmission",
      "name": "TCP Retransmission",
      "description": "How TCP detects and recovers from lost packets"
    }
  ],
  "relationships": [
    {
      "from": "tcp-handshake",
      "to": "tcp-sequence-numbers",
      "type": "prerequisite",
      "inference_strength": 0.4
    },
    {
      "from": "tcp-sequence-numbers",
      "to": "tcp-retransmission",
      "type": "prerequisite",
      "inference_strength": 0.5
    }
  ],
  "territories": [
    {
      "id": "tcp-reliability",
      "name": "TCP Reliability",
      "description": "How TCP guarantees reliable, ordered delivery",
      "concepts": ["tcp-handshake", "tcp-sequence-numbers", "tcp-retransmission"]
    }
  ],
  "thresholds": []
}
```

### Cross-domain reference

The security domain might include:

```json
{
  "id": "tls-handshake",
  "name": "TLS Handshake",
  "description": "How TLS negotiates encryption on top of a TCP connection"
}
```

With a relationship:

```json
{
  "from": "tcp-handshake",
  "to": "tls-handshake",
  "type": "prerequisite",
  "inference_strength": 0.5
}
```

Note that `tcp-handshake` uses the same canonical id as in the networking domain. The engine sees one concept node. Trust earned in networking carries over.
