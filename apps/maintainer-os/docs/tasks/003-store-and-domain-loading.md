# 003 — Store Adapter + Domain Loading (Phase 1)

## Goal

Wire the Lorraine SQLite store and implement `mos domain load`. A domain pack (JSON) includes concepts, edges, concept-to-file mappings, and optional capability bundles and role gates.

## Acceptance Criteria

- [ ] SQLite store initialized from config db path on first use
- [ ] Store adapter exposes engine store interface for all commands to use
- [ ] `mos domain load --file <path>` reads domain JSON and calls `loadConcepts`
- [ ] Domain JSON schema supports standard Lorraine fields (concepts, edges) plus MaintainerOS extensions: concept-to-file mappings, capability bundles, role gates
- [ ] Domain validation: rejects malformed JSON, missing required fields, dangling edge references
- [ ] Loaded domain metadata stored locally (domain id, version, load timestamp)
- [ ] `mos domain list` shows loaded domains
- [ ] Tests: load valid domain, reject invalid domain, verify concepts and edges in store
- [ ] Example domain pack created: `apps/maintainer-os/cli/fixtures/example-domain.json` with 6-8 concepts, edges, mappings, one bundle, one role gate

## Files to Create

- `apps/maintainer-os/cli/src/lib/store.ts`
- `apps/maintainer-os/cli/src/lib/domain.ts`
- `apps/maintainer-os/cli/src/lib/domain.test.ts`
- `apps/maintainer-os/cli/src/commands/domain.ts`
- `apps/maintainer-os/cli/fixtures/example-domain.json`

## Dependencies

- 002 (config, for db path)
