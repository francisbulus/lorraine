# Lorraine — Domain Schema

**Version:** 0.2
**Last Updated:** February 22, 2026

---

## What a Domain Is

A domain is a portable, application-agnostic package of knowledge structure. It describes what can be known about a subject — concepts, how they relate, how they cluster into territories, and where the boundaries between territories are.

A domain does NOT contain:

- What counts as "known" — the application decides
- Who is the claimant and who is the verifier — the application decides
- How verification happens — the engine core and services layer decide
- What approach should be taken — the person being assessed decides
- What trust level is required — the application decides
- Time constraints or deadlines — the application decides

The same domain schema works for learning, hiring, onboarding, certification, organizational competency mapping, and any other context where the question is "does this person actually understand this?"

Anyone can create a domain. The engine runs the same trust math on all of them.

---

## The Separation Principle

A domain is pure content. The verification context is the application's responsibility.

This separation is load-bearing. It's what makes the engine generalizable. The same distributed systems domain can power:

- A **learning OS** where the person explores at their own pace with full agency
- A **hiring process** where the organization defines minimum trust levels and time constraints
- An **onboarding program** where a manager tracks a new hire's progress against milestones
- A **certification system** where an external body defines what "competent" means
- A **team competency map** where leadership sees aggregate trust across an engineering organization

The domain doesn't change between these applications. The concepts are the same. The relationships are the same. The territories and thresholds are the same. What changes is who's asking the question, what trust level they require, and what they do with the answer.

The application layer sits on top of the engine and configures:

```typescript
interface VerificationContext {
  domain_id: string

  // Who
  claimant: string              // the person whose knowledge is being modeled
  verifier: string              // who is consuming the trust model
                                // in learning: claimant and verifier are the same person
                                // in hiring: the organization is the verifier
                                // in onboarding: both the person and their manager

  // Requirements
  required_trust_levels?: {
    concept_id: string
    min_level: "verified" | "inferred"
    min_confidence: number
    required_modalities?: string[]   // e.g. ["sandbox:execution", "grill:transfer"]
  }[]

  // Constraints
  time_boundary?: {
    deadline?: string            // ISO timestamp
    session_limit?: number       // max minutes per verification session
  }

  // Visibility
  visibility: "self"             // only the claimant sees results (learning)
            | "shared"           // claimant and verifier both see (onboarding)
            | "verifier_only"    // only the verifier sees (some hiring contexts)
            | "mutual"           // both see, both can challenge (mentorship)
}
```

This interface is NOT part of the domain schema. It belongs in the application layer. It is shown here to illustrate the separation.

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

  portability?: "portable"      // meaningful across contexts
              | "local"         // meaningful only within a specific organization
                                //   or context (e.g. "acme-deployment-pipeline")
                                // optional — helps with cross-domain linking
                                // does not affect engine behavior
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
                                // the person always decides (in contexts
                                // where they have agency)
  }[]
}
```

---

## Cross-Domain Concepts

Concepts have a canonical `id` that is globally unique. When the same concept appears in multiple domains, it uses the same id.

Example: TCP handshake (`tcp-handshake`) appears in both a networking domain and a security domain. Both reference the same canonical id. The engine sees one node with one trust state. If understanding of TCP handshake is verified during networking study, that trust carries over when the security domain is loaded.

This also works across application contexts. A candidate whose understanding of database replication was verified during a hiring process carries that trust into onboarding at the same company. They don't get re-assessed on something already demonstrated. The engine already knows.

Cross-domain trust is handled by convention, not by a central registry. Domain authors use the same id for the same concept. If two domains use different ids for what is actually the same concept, they'll be treated as separate nodes — suboptimal but not broken. A deduplication tool can merge them later.

### How to decide if two concepts are the same

If a person who demonstrates understanding of concept A in domain X would not need to re-demonstrate understanding of the same concept in domain Y — it's the same concept. Same id.

If the concept is the same idea but applied differently in each domain — it might be two related concepts rather than one shared concept. Use different ids with a `related_to` relationship.

---

## External Verification Events

Not all verification happens inside Lorraine. In many application contexts, understanding is demonstrated through real-world actions that external systems observe:

- A CI/CD pipeline confirms a new engineer deployed a PR successfully
- An HR system records that an employee handled an incident according to protocol
- A code review tool shows that a developer caught a security vulnerability
- A patient management system logs that a doctor followed the correct treatment protocol

These external systems can write verification events to the engine through the SDK's `recordVerification` API. The domain schema doesn't need to account for this — the engine's verification model already handles it. The source of a verification event can be a conversation, a grill question, a sandbox experiment, or Jenkins. The engine doesn't care. It just records the event and updates trust.

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
- **Organization-specific** — a company defines domains for its internal systems, processes, and culture. These mix local concepts with portable ones.
- **Hybrid** — LLM generates a first draft, experts refine it, community or organization contributes improvements.

The engine validates domains against this schema on load. Invalid domains are rejected. Valid domains are loaded and ready for the trust engine to operate on.

---

## Examples

### Example 1: Learning — TCP Basics

A minimal domain for someone learning networking fundamentals.

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
      "description": "How TCP establishes a connection via SYN, SYN-ACK, ACK",
      "portability": "portable"
    },
    {
      "id": "tcp-sequence-numbers",
      "name": "TCP Sequence Numbers",
      "description": "How TCP tracks byte ordering using sequence numbers",
      "portability": "portable"
    },
    {
      "id": "tcp-retransmission",
      "name": "TCP Retransmission",
      "description": "How TCP detects and recovers from lost packets",
      "portability": "portable"
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

Application context: the person is both claimant and verifier. No time constraints. No required trust levels. Full agency. The map is theirs.

### Example 2: Hiring — Distributed Systems

An organization assessing whether a candidate understands distributed systems.

```json
{
  "id": "distributed-systems-backend",
  "name": "Distributed Systems for Backend Engineers",
  "description": "Core distributed systems concepts expected of a senior backend engineer",
  "version": "0.1",
  "concepts": [
    {
      "id": "cap-theorem",
      "name": "CAP Theorem",
      "description": "The tradeoff between consistency, availability, and partition tolerance",
      "portability": "portable"
    },
    {
      "id": "eventual-consistency",
      "name": "Eventual Consistency",
      "description": "Systems that guarantee all replicas converge given enough time",
      "portability": "portable"
    },
    {
      "id": "distributed-consensus",
      "name": "Distributed Consensus",
      "description": "How nodes agree on a value (Paxos, Raft)",
      "portability": "portable"
    },
    {
      "id": "database-replication",
      "name": "Database Replication",
      "description": "Strategies for copying data across nodes",
      "portability": "portable"
    },
    {
      "id": "load-balancing",
      "name": "Load Balancing",
      "description": "Distributing work across multiple servers",
      "portability": "portable"
    }
  ],
  "relationships": [
    {
      "from": "cap-theorem",
      "to": "eventual-consistency",
      "type": "prerequisite",
      "inference_strength": 0.4
    },
    {
      "from": "cap-theorem",
      "to": "distributed-consensus",
      "type": "prerequisite",
      "inference_strength": 0.3
    },
    {
      "from": "eventual-consistency",
      "to": "database-replication",
      "type": "prerequisite",
      "inference_strength": 0.5
    }
  ],
  "territories": [
    {
      "id": "consistency-models",
      "name": "Consistency Models",
      "description": "Understanding the tradeoffs in distributed data consistency",
      "concepts": ["cap-theorem", "eventual-consistency", "distributed-consensus"]
    },
    {
      "id": "data-infrastructure",
      "name": "Data Infrastructure",
      "description": "Practical systems for data distribution and availability",
      "concepts": ["database-replication", "load-balancing"]
    }
  ],
  "thresholds": [
    {
      "from_territory": "consistency-models",
      "to_territory": "data-infrastructure",
      "readiness_criteria": [
        { "concept_id": "cap-theorem", "min_trust_level": "verified" },
        { "concept_id": "eventual-consistency", "min_trust_level": "verified" }
      ]
    }
  ]
}
```

Application context: the candidate is the claimant, the organization is the verifier. The organization requires verified trust (not just inferred) on specific concepts, possibly through specific modalities ("show us in code, not just in conversation"). Time-bounded to an interview session. Results visible to the hiring team.

The domain itself is identical in structure to the learning example. The difference is entirely in the application layer.

### Example 3: Onboarding — Fintech Company

A new engineer joining a fintech company. Mixes portable industry concepts with local company-specific knowledge.

```json
{
  "id": "acme-fintech-onboarding",
  "name": "Acme Fintech Engineering Onboarding",
  "description": "What a new Acme engineer needs to understand",
  "version": "0.1",
  "concepts": [
    {
      "id": "acme-service-architecture",
      "name": "Acme Service Architecture",
      "description": "How Acme's microservices are organized and communicate",
      "portability": "local"
    },
    {
      "id": "acme-deployment-pipeline",
      "name": "Acme Deployment Pipeline",
      "description": "How code goes from PR to production at Acme",
      "portability": "local"
    },
    {
      "id": "acme-incident-response",
      "name": "Acme Incident Response",
      "description": "What to do when something breaks in production at Acme",
      "portability": "local"
    },
    {
      "id": "pci-compliance-basics",
      "name": "PCI Compliance Basics",
      "description": "Payment card data handling requirements",
      "portability": "portable"
    },
    {
      "id": "acme-auth-system",
      "name": "Acme Auth System",
      "description": "How authentication and authorization work at Acme",
      "portability": "local"
    },
    {
      "id": "database-replication",
      "name": "Database Replication",
      "description": "Strategies for copying data across nodes",
      "portability": "portable"
    }
  ],
  "relationships": [
    {
      "from": "acme-service-architecture",
      "to": "acme-deployment-pipeline",
      "type": "prerequisite",
      "inference_strength": 0.4
    },
    {
      "from": "acme-service-architecture",
      "to": "acme-incident-response",
      "type": "prerequisite",
      "inference_strength": 0.5
    },
    {
      "from": "pci-compliance-basics",
      "to": "acme-auth-system",
      "type": "prerequisite",
      "inference_strength": 0.3
    },
    {
      "from": "acme-service-architecture",
      "to": "acme-auth-system",
      "type": "prerequisite",
      "inference_strength": 0.4
    }
  ],
  "territories": [
    {
      "id": "acme-core-systems",
      "name": "Core Systems",
      "description": "Understanding Acme's fundamental architecture and workflows",
      "concepts": ["acme-service-architecture", "acme-deployment-pipeline", "acme-auth-system"]
    },
    {
      "id": "acme-operations",
      "name": "Operations & Compliance",
      "description": "Keeping Acme running and compliant",
      "concepts": ["acme-incident-response", "pci-compliance-basics"]
    }
  ],
  "thresholds": [
    {
      "from_territory": "acme-core-systems",
      "to_territory": "acme-operations",
      "readiness_criteria": [
        { "concept_id": "acme-service-architecture", "min_trust_level": "verified" }
      ]
    }
  ]
}
```

Application context: the new engineer and their manager both see the trust model. Some verification happens through conversation with the agent, some through real-world actions observed by external systems (deploying a PR, handling a page). Timeline milestones at 30/60/90 days. The manager sees where the engineer is on the map without having to ask "how's onboarding going?"

Note: `database-replication` has the same canonical id as in the hiring domain. If this engineer's understanding was already verified during the hiring process, that trust carries over. They don't get re-assessed on what's already demonstrated.

Note: `pci-compliance-basics` is portable. If the engineer leaves Acme and joins another fintech, their verified understanding of PCI compliance carries with them. Their understanding of `acme-service-architecture` does not — it's local.
