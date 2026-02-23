# Lorraine: Example Application Pattern

**Version:** 0.1<br>
**Last Updated:** February 23, 2026

This document shows how an application is built on the Lorraine framework. The example is an SRE incident-readiness
tool, but the pattern generalizes to any domain. To build a different app, you change the concept graph and the
verification policy. The trust math stays the same.

---

## The Pattern

Every Lorraine application follows the same structure:

1. Load a domain graph (concepts and edges)
2. Present trust state to the user
3. Generate and deliver verification prompts
4. Record evidence from responses and external systems
5. Surface readiness against requirements

The framework handles steps 3-5 through the same APIs regardless of domain. The application handles steps 1-2 and
decides what "ready" means.

---

## Example: OnCall Ready

An SRE team needs to answer: is this engineer ready for primary on-call? Not "did they complete the training." Not
"did their manager sign off." Ready, with evidence.

### 1. Load the domain

The application defines what there is to know about incident readiness and loads it via `loadConcepts`:

```json
{
  "concepts": [
    { "id": "incident-triage", "name": "Incident Triage", "description": "Prioritize scope before root cause. Assess severity, identify affected systems, communicate status." },
    { "id": "log-analysis", "name": "Log Analysis", "description": "Navigate log systems, construct queries, identify patterns, correlate across services." },
    { "id": "rollback-strategy", "name": "Rollback Strategy", "description": "Know when to roll back vs. roll forward. Execute rollbacks safely under pressure." },
    { "id": "rate-limiting", "name": "Rate Limiting", "description": "Understand rate limiting as a mitigation tool. Configure and apply during incidents." },
    { "id": "postmortem-quality", "name": "Postmortem Quality", "description": "Write postmortems with clear timelines, root cause analysis, and specific action items." },
    { "id": "blast-radius-scoping", "name": "Blast Radius Scoping", "description": "Determine what is affected and what is not. Contain impact before investigating cause." },
    { "id": "alerting-config", "name": "Alerting Configuration", "description": "Set up, tune, and respond to alerts. Reduce noise without missing signal." },
    { "id": "runbook-execution", "name": "Runbook Execution", "description": "Follow and adapt runbooks under pressure. Know when to deviate." }
  ],
  "edges": [
    { "from": "log-analysis", "to": "incident-triage", "type": "prerequisite", "inferenceStrength": 0.6 },
    { "from": "blast-radius-scoping", "to": "incident-triage", "type": "component_of", "inferenceStrength": 0.7 },
    { "from": "rollback-strategy", "to": "incident-triage", "type": "related_to", "inferenceStrength": 0.4 },
    { "from": "alerting-config", "to": "log-analysis", "type": "related_to", "inferenceStrength": 0.3 },
    { "from": "incident-triage", "to": "postmortem-quality", "type": "prerequisite", "inferenceStrength": 0.5 },
    { "from": "runbook-execution", "to": "rollback-strategy", "type": "related_to", "inferenceStrength": 0.4 }
  ]
}
```

The application also defines readiness requirements (at the application layer, not in the framework):

```
Primary on-call requires verified trust on:
  - incident-triage (transfer-level minimum)
  - rollback-strategy (any modality)
  - log-analysis (any modality)
  - blast-radius-scoping (any modality)
```

### 2. Present trust state

The engineer sees a readiness dashboard. The application calls:

- `getGraph({ personId: "eng-42" })` to render a map of all concepts with trust overlay
- `getTrustState({ personId: "eng-42", conceptId: "incident-triage" })` to show detailed trust cards per concept
- A "Challenge me" button that triggers `requestSelfVerification({ personId: "eng-42", reason: "person_claims_knowledge" })`

The dashboard shows: which concepts are verified, which are inferred, which are untested, which are contested. The
readiness bar is visible: 2 of 4 required concepts verified, 1 inferred, 1 untested.

### 3. Daily verification loop

A background service runs each morning:

```
for each engineer on the rotation:
  trustStates = getBulkTrustState({ personId: engineer })
  calibration = calibrate({ personId: engineer })

  for each required concept:
    if stale (decayedConfidence below threshold)
    or contested
    or untested:
      prompt = generateVerification({
        personId: engineer,
        conceptId: concept,
        difficultyAxis: "transfer",
        reason: "scheduled",
        applicationContext: "onboarding"
      })
      sendToSlack(engineer, prompt)
```

The engineer receives a Slack message: "A downstream service is returning 504s but only from one availability zone.
You have access to the service dashboard and logs. Walk through your first five minutes of triage."

That prompt was generated, not pre-written. The services layer knew the engineer has demonstrated log-analysis but
hasn't been tested on incident-triage at transfer level. The question targets the gap.

### 4. Record evidence from responses

The engineer responds in Slack. The application sends the response through the services layer:

```
interpretation = interpretResponse({
  verificationId: prompt.id,
  personId: "eng-42",
  response: engineerMessage,
  responseModality: "grill:transfer"
})

// A single response can touch multiple concepts with different results.
for each trustUpdate in interpretation.trustUpdates:
  event = recordVerification({
    conceptId: trustUpdate.conceptId,
    personId: "eng-42",
    modality: "grill:transfer",
    result: trustUpdate.result,
    context: trustUpdate.evidence,
    source: "internal"
  })

  propagateTrust({
    sourceConceptId: trustUpdate.conceptId,
    personId: "eng-42",
    verificationEvent: event
  })
```

The engineer demonstrated incident-triage (correctly prioritized scope before root cause). Partial on log-analysis
(mentioned logs but didn't specify which log streams). Both events are recorded with full context. Propagation runs:
the demonstrated result on incident-triage strengthens inferred trust on blast-radius-scoping through the component_of
edge.

### 5. Ingest external evidence

Real incidents produce the strongest evidence. The incident management tooling submits events via the framework API:

**Successful rollback during a real incident:**
```
recordVerification({
  conceptId: "rollback-strategy",
  personId: "eng-42",
  modality: "external:observed",
  result: "demonstrated",
  context: "Rolled back deployment v2.4.7 during INC-4821, restored service within SLA",
  source: "external"
})
```

**Postmortem reviewed by peers:**
```
recordVerification({
  conceptId: "postmortem-quality",
  personId: "eng-42",
  modality: "external:observed",
  result: "partial",
  context: "Postmortem for INC-4821 peer-reviewed, action items flagged as insufficiently specific",
  source: "external"
})
```

**Quiet on-call shift:**
No events recorded. The framework doesn't fabricate evidence from absence. An uneventful shift is not a verification
event.

### 6. Manager and engineer dashboard

The manager opens the team readiness view:

```
for each engineer:
  states = getBulkTrustState({ personId: engineer, conceptIds: requiredConcepts })
  compare states against readiness requirements
  display: green (verified), yellow (inferred), red (untested/contested)
```

The manager asks "why is log-analysis contested for eng-42?"

```
explainDecision({
  decisionType: "contested_detection",
  decisionContext: { personId: "eng-42", conceptId: "log-analysis" }
})
```

Returns: "Demonstrated via grill:transfer on Feb 12 (correctly described triage approach including log analysis).
Partial via external:observed on Feb 18 (postmortem review noted insufficient log analysis depth). Conflicting
evidence across modalities."

The manager asks the engineer: "The model shows you're strong on triage and rollbacks but contested on log analysis.
The evidence is from your last postmortem. What do you think?"

The engineer says "yeah, I rushed that section." The application records the claim:

```
recordClaim({
  conceptId: "log-analysis",
  personId: "eng-42",
  selfReportedConfidence: 0.4,
  context: "Acknowledged weakness in log analysis depth during readiness review"
})
```

The calibration gap narrows. The claim aligns with the evidence.

---

## The Generalization

To build a different application on Lorraine, you change:

- **The domain graph.** A compliance readiness app loads KYC procedures, transaction monitoring, regulatory reporting. A security readiness app loads threat modeling, vulnerability assessment, incident response. Different concepts, different edges.
- **The readiness requirements.** What "ready" means is application-specific. The framework provides trust state. The application defines the bar.
- **The verification policy.** How often to prompt, what difficulty level, which modalities, where to deliver prompts. Application decisions.
- **The external event sources.** What systems submit verification events. CI/CD pipelines, code review tools, incident management, compliance systems, exam platforms.

You don't change:

- **The trust math.** Propagation, decay, derivation, calibration. Same rules, same invariants.
- **The schema.** Concepts, edges, verification events, claim events, trust state, retraction events. Same primitives.
- **The query layer.** Same APIs, same derived reads.

The framework is the constant. The application is the variable.
