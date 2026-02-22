# 022 — Provision Mode (Phase 3)

## Goal

Implement provision mode — spin up real environments (Docker containers, VMs, cloud sandboxes) for the learner to deploy, configure, break, and rebuild.

## Acceptance Criteria

- [ ] Provision mode renders inline in conversation — environment status and terminal access
- [ ] Environment provisioning: create disposable environments (Docker containers at minimum)
- [ ] Learner can deploy, configure, break, and rebuild — cost of failure is zero
- [ ] Agent annotates what's happening in the environment when asked
- [ ] Agent steps back during experimentation
- [ ] Trust signals: configuring from scratch → strong verification, debugging broken environment → very strong, rebuilding after destroying → terrain ownership test
- [ ] Mode transition trigger: "I need a real environment" / "Can I set this up myself?"
- [ ] Signals written to core via `recordVerification` with `sandbox:execution` or `sandbox:debugging` modality
- [ ] Environments are disposable — cleaned up after session or on learner request

## Files to Create

- `apps/terrain/app/src/components/ProvisionMode.tsx`
- `apps/terrain/app/src/lib/provision-engine.ts`
- `apps/terrain/app/src/lib/environment-manager.ts`

## Dependencies

- 005 (conversation loop)
- 012 (sandbox mode — provision extends sandbox concept)
- 015 (mode transitions)
