# Lorraine — Auditability & Introspection

**Version:** 0.2<br>
**Last Updated:** February 22, 2026

---

## What the Architecture Gives You

Lorraine is auditable and self-aware by construction. This is not a feature — it's a structural consequence of two engine invariants:

- **Invariant 6:** Trust state is derived from events, not stored directly. Every trust claim is recomputable from the event log.
- **Invariant 3:** Every trust claim is transparent and challengeable. The person being modeled can always ask "why" and get a traceable answer.

An event-sourced system with mandatory provenance, no manual overrides, and self-calibration produces three properties for free:

**Auditability** — every trust claim traces backward through evidence to the verification events that produced it. The event log is append-only. Corrections are retractions, not deletions. The trail is never incomplete.

**Introspection** — the engine watches itself via `calibrate`. It knows when its predictions are wrong, when its model is stale, when it's surprised by outcomes. It reports its own accuracy.

**Provenance** — every piece of trust state has a chain: this trust level came from these verification events, propagated through these edges, decayed over this time period, informed by these claim events. `explainDecision` exposes the full chain.

Applications build monitoring, dashboards, analytics, and compliance reporting on top of these properties. The raw material is in the data model itself.

---

## What You Can Answer

### About a person

| Question | How to answer it |
|----------|-----------------|
| What does this person know? | `getTrustState` / `getBulkTrustState` |
| Why does the system believe that? | `explainDecision` — traces any trust claim back through inference chains to verification events |
| What evidence supports a specific trust level? | Verification event history on `getTrustState` — every event with modality, result, context, timestamp |
| What did they claim vs. what was demonstrated? | Claim events vs. verification events — both returned by `getTrustState` |
| How well do they know what they don't know? | `calibrate` → `claimCalibration` — measures convergence between self-assessment and evidence |
| Is the model stale? | `calibrate` → `stalePercentage` — what fraction of trust is based on old evidence |
| Where are they stuck? | Contested concepts — demonstrated in one context, failed in another |
| How has their understanding changed over time? | Event log — append-only, ordered by timestamp, replayable |

### About the engine's model quality

| Question | How to answer it |
|----------|-----------------|
| Is the model accurate? | `calibrate` → `predictionAccuracy` — when the system predicted success/failure, how often was it right? |
| Does the system overestimate? | `calibrate` → `overconfidenceBias` |
| Does the system underestimate? | `calibrate` → `underconfidenceBias` |
| How often is the system surprised? | `calibrate` → `surpriseRate` — how often does performance differ from prediction |
| What should the system do to improve? | `calibrate` → `recommendation` |

### About a domain

| Question | How to answer it |
|----------|-----------------|
| Which concepts are most often contested? | Aggregate contested states across all people for a domain |
| Which territories have the highest failure rates? | Aggregate failed verification events per territory |
| Which thresholds are bottlenecks? | Aggregate readiness criteria shortfalls across people |
| Where do people get confused? | Aggregate confusion signals from `extractImplicitSignals` |
| Is a concept too coarse or too fine? | High contest rate on a concept suggests it should be split; consistently co-verified concepts suggest they could merge |

### About an application

| Question | How to answer it |
|----------|-----------------|
| Which verification modalities produce the strongest signals? | Compare trust state stability after different modality events |
| Are implicit signals reliable? | Compare trust updates from implicit signals vs. subsequent explicit verification — do they agree? |
| How fast do people reach verified trust? | Time from first event to verified level per concept |
| Do claims converge with evidence over time? | `claimCalibration` trend per person over sessions |
| What's the system's false positive rate for implicit extraction? | Implicit signals written vs. subsequent explicit verification disagreements |

---

## The Audit Trail

Every trust claim in the system traces backward to evidence:

```
Trust state (verified, 0.87)
  ← Verification event (grill:transfer, demonstrated, "derived reliability from first principles")
  ← Verification event (sandbox:execution, demonstrated, "implemented retransmission correctly")
  ← Verification event (integrated:use, demonstrated, "used acknowledgment concept in unrelated discussion")
  ← Propagation from tcp-handshake (inference strength 0.4)
    ← Verification event (grill:inference, demonstrated, "explained why three-way handshake needs three steps")
```

This trail is always available via `explainDecision`. It is not a feature that was added. It is a consequence of recording events with provenance and deriving trust state from them.

Retracted events remain in the trail, marked as retracted with reason. The trail is never incomplete.

---

## What This Enables

**For the person being modeled:** Full transparency. "Why do you think I know this?" has a real, traceable answer. They can challenge any trust claim and see the evidence chain. This is Invariant 3 made operational.

**For application developers:** Debugging. When the trust model behaves unexpectedly, you can trace exactly why — which events led to which state through which propagation path. No black box.

**For domain authors:** Feedback. Aggregate observability across people reveals where the domain graph is wrong — concepts that are always contested, thresholds that nobody passes, territories with uniform failure patterns.

**For the engine itself:** Self-improvement. `calibrate` is the engine watching itself. When its predictions diverge from outcomes, it knows, and it says so. This is Invariant 3 applied reflexively — the engine's reasoning about its own accuracy is also transparent.

---

## What This Is NOT

This is not a monitoring system. There are no dashboards, no alerts, no metrics pipelines. Those can be built by applications that need them.

This is the raw material. The engine produces a complete, provenance-rich, append-only event log with self-calibration. Applications decide how to surface it — as a timeline, as analytics, as a health dashboard, as a compliance audit, as a learner-facing self-calibration view.

The observability is in the data. Applications choose the lens.
