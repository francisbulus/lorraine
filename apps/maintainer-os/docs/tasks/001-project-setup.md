# 001 — Project Setup + CLI Skeleton (Phase 1)

## Goal

Initialize the MaintainerOS TypeScript project with commander, vitest, and the directory structure for a CLI application. Wire the Lorraine engine as a local dependency. `mos --help` works.

## Acceptance Criteria

- [ ] TypeScript project created in `apps/maintainer-os/cli/`
- [ ] `package.json` with commander, vitest, and engine path dependencies
- [ ] `tsconfig.json` with strict mode, ES modules, path aliases for engine
- [ ] Entry point: `src/cli.ts` with commander program definition
- [ ] Command directory: `src/commands/` with stub files for all Phase 1 commands
- [ ] `mos --help` prints usage with command list
- [ ] `mos --version` prints version from package.json
- [ ] Engine core importable from the CLI (`engine/`, `engine/store/`, `engine/trust/`)
- [ ] Engine services importable from the CLI (`engine/services/`)
- [ ] Vitest configured and runs with zero tests passing (or a smoke test)
- [ ] `npx tsx src/cli.ts --help` works without errors

## Files to Create

- `apps/maintainer-os/cli/package.json`
- `apps/maintainer-os/cli/tsconfig.json`
- `apps/maintainer-os/cli/vitest.config.ts`
- `apps/maintainer-os/cli/src/cli.ts`
- `apps/maintainer-os/cli/src/commands/init.ts` (stub)
- `apps/maintainer-os/cli/src/commands/domain.ts` (stub)
- `apps/maintainer-os/cli/src/commands/status.ts` (stub)
- `apps/maintainer-os/cli/src/commands/ready.ts` (stub)
- `apps/maintainer-os/cli/src/commands/why.ts` (stub)
- `apps/maintainer-os/cli/src/commands/ingest.ts` (stub)
- `apps/maintainer-os/cli/src/commands/calibrate.ts` (stub)
- `apps/maintainer-os/cli/src/commands/retract.ts` (stub)

## Dependencies

None. First task.
