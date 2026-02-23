# 015 — Role Gate Policy Files (Phase 2)

## Goal

Support external YAML files for role gate definitions, separate from the domain pack. Teams can version-control their readiness policies independently.

## Acceptance Criteria

- [ ] `mos ready` reads role gates from a policy file in addition to the domain pack
- [ ] Policy file path configurable in `config.toml` or via `--policy <path>`
- [ ] Policy file format matches the YAML spec from SPEC.md section 7.2
- [ ] Policy file gates override domain pack gates for the same bundle name
- [ ] Validation: reject malformed YAML, unknown concept references, invalid trust levels
- [ ] `mos policy validate --file <path>` checks a policy file without applying it
- [ ] Tests: load policy file, evaluate readiness against it; override domain pack gate; reject invalid file

## Files to Create

- `apps/maintainer-os/cli/src/lib/policy.ts`
- `apps/maintainer-os/cli/src/lib/policy.test.ts`
- `apps/maintainer-os/cli/src/commands/policy.ts`
- `apps/maintainer-os/cli/fixtures/example-policy.yaml`

## Dependencies

- 006 (role gate evaluation)
