# VR-002: CLI Visual Polish Pass

**Status:** In Progress
**Priority:** P1
**Scope:** Consistency and alignment pass across all CLI display commands

## Goal

Tighten the visual details from VR-001: bars on every concept, dynamic column alignment, confidence-aware color gradients on icons/names/bars, blocker emphasis in ready command, and section spacing.

## Acceptance Criteria

- [ ] Every concept in every command gets a bar (including untested: `░░░░░░░░░░`)
- [ ] Fixed-width concept names via dynamic `computeConceptWidth` + `padName`
- [ ] Color gradients applied to icon, concept name, AND bar fill
- [ ] Verified gradient: >0.7 green, 0.5-0.7 dim green, <0.5 almost grey
- [ ] Inferred gradient: >0.5 bright yellow, 0.25-0.5 dim yellow, <0.25 almost grey
- [ ] Contested: always bright red. Untested: always dim grey
- [ ] Sort by decayed confidence descending within sections
- [ ] Section spacing: blank line between separator and first section header
- [ ] Ready command: red icon + name + bar for blockers, Next steps section restored
- [ ] Reviewers: bar colors match trust level, concept names gradient-colored
- [ ] All JSON output paths unchanged
- [ ] All tests pass
