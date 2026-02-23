# 011 — Concept-to-File Mapper (Phase 2)

## Goal

Build the mapping engine that resolves changed file paths to concept IDs. This is the foundation for GitHub ingest and reviewer recommendation.

## Acceptance Criteria

- [ ] Mapper takes a list of file paths and returns matched concept IDs with match details
- [ ] Glob patterns from domain pack concept-to-file mappings are matched against file paths
- [ ] A single file can match multiple concepts
- [ ] A concept can match multiple files
- [ ] Match results include: conceptId, matched paths, pattern that matched
- [ ] Performance: handles 500+ files against 50+ concepts without noticeable delay
- [ ] Tests: exact matches, glob wildcards, double-star recursion, multi-concept file, no-match files, empty inputs

## Files to Create

- `apps/maintainer-os/cli/src/lib/file-mapper.ts`
- `apps/maintainer-os/cli/src/lib/file-mapper.test.ts`

## Dependencies

- 003 (domain with concept-to-file mappings loaded)
