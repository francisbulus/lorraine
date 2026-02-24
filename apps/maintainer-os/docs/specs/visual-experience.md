# MaintainerOS: CLI Visual Experience

> This is not a safe CLI. This is a CLI that makes engineers lean forward.

---

## Philosophy: The War Room Console, Not The Log Dump

Most CLI tools dump text. They print lines. They use color like syntax highlighting: mechanically, without intent. The output looks like a log file someone colorized.

MaintainerOS should feel like the main console in a mission control room. Every screen is a briefing. Every output is a situation report. When an engineer runs `mos status`, they should feel like they just pulled up a tactical display: dense, precise, but composed with the care of a designer who happens to work in monospace.

Think: if an engineer runs this in front of their team during an incident review, it should look like the tool knows exactly what it's doing. Not a developer's side project. A system with authority.

**Core tension to hold:** Information density x visual breathing room. Every character matters but the output never feels cramped. Like a well-designed cockpit: 200 instruments, but you can find the one you need in under a second because the spatial hierarchy is perfect.

---

## The Terminal Is Your Canvas

Stop thinking of the terminal as a limitation. It's a 80-120 character wide canvas that refreshes instantly, supports 256 colors, Unicode, box-drawing characters, and full ANSI formatting. That's more than enough to build something beautiful.

The constraints ARE the aesthetic:
- Monospace alignment is free: use it obsessively
- Box-drawing characters (─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼) create structure without images
- Unicode symbols (● ◐ ◌ ▲ ▼ ⚡ ✓ ✗ → ·) are your icon library
- Negative space (blank lines, indentation) is your layout tool
- Color is semantic: it means something or it doesn't exist

---

## Color System

### The Rule: Color Is Trust

Color in MaintainerOS is never decorative. Every color maps to one meaning. If something is colored, the engineer knows why without reading the legend.

```
VERIFIED          - green (chalk.green / chalk.greenBright)
INFERRED          - amber/yellow (chalk.yellow / chalk.yellowBright)
CONTESTED         - red-orange (chalk.redBright)
UNTESTED          - dim grey (chalk.dim)
DECAYED           - fading version of its base color
BLOCKER           - red (chalk.red) - the only "danger" color
LAMP (active)     - cyan (chalk.cyan) - "you are here" / "this matters now"
STRUCTURAL        - white/default - borders, labels, framing
```

### The Gradient Principle

A concept's confidence maps to visual intensity. This is the key innovation: you don't just color by trust level, you express confidence through brightness:

```
VERIFIED at 0.90:  ████████░░  <- bright green, nearly full
VERIFIED at 0.55:  █████░░░░░  <- muted green, half-faded
VERIFIED at 0.35:  ███░░░░░░░  <- barely green, almost grey

The green FADES as confidence drops. High confidence is vivid.
Low confidence is ghostly. The engineer reads intensity before
they read numbers.
```

This applies uniformly: icon, concept name, and bar on the same row share the same intensity. A row is one visual unit. You see its health at a glance.

---

## Layout Architecture

### The Frame

Every command output is framed. Not with decorative ASCII art: with structural box-drawing that communicates hierarchy.

```
  ┌─ Trust Map ──────────────────────────── alice ─┐
  │                                                │
  │  content here                                  │
  │                                                │
  └─────────────────── Last updated: just now ─────┘
```

The top-left has the view name. The top-right has the subject. The bottom has the timestamp or summary. The frame IS the header and footer: they're not separate elements.

### The Double-Line Emphasis

For critical boundaries: between sections that represent different trust levels, or before a verdict. Use double-line box-drawing:

```
  ╔══ BLOCKERS ════════════════════════════════════╗
  ║                                                ║
  ║  ✗ event-bus-semantics    ░░░░░░░░░░  BLOCK    ║
  ║  ✗ deploy-sequencing      █████░░░░░  BLOCK    ║
  ║                                                ║
  ╚════════════════════════════════════════════════╝
```

Double lines say: pay attention. This section has consequences. Use sparingly: only for blockers, failures, and final verdicts.

### Breathing Room

The output breathes. It is NOT a wall of text.

Rules:
- Blank line after every frame border
- Blank line between trust level sections
- Blank line between evidence entries in `mos why`
- 2-space indent for all content inside frames
- 4-space indent for sub-details
- Content never touches the frame border: minimum 1 space padding

---

## Command Output Designs

### 1. `mos status --person alice`

The flagship view. This is the trust map: the most-used command.

```
  ┌─ Trust Map ──────────────────────────── alice ─┐
  │                                                │
  │  VERIFIED                                      │
  │                                                │
  │    ✓ rollback-strategy      ████████░░  0.75   │
  │      2d ago · external:observed                │
  │                                                │
  │    ✓ migration-safety       ██████░░░░  0.60   │
  │      5d ago · grill:transfer                   │
  │                                                │
  │  ─────────────────────────────────────────     │
  │                                                │
  │  INFERRED                                      │
  │                                                │
  │    ~ cache-coherency        ███░░░░░░░  0.32   │
  │      from rollback-strategy                    │
  │                                                │
  │  ─────────────────────────────────────────     │
  │                                                │
  │  CONTESTED                                     │
  │                                                │
  │    ⚡ deploy-sequencing      █████░░░░░  0.50   │
  │      demonstrated + failed (conflicting)       │
  │                                                │
  │  ─────────────────────────────────────────     │
  │                                                │
  │  UNTESTED                                      │
  │                                                │
  │    · postmortem-quality     ░░░░░░░░░░         │
  │                                                │
  └──────────────── Calibration: 72% · 15% stale ─┘
```

Each concept gets TWO lines: the data line and a dim detail line below it (time + modality). Section dividers are lighter than the frame (single thin line). The calibration summary lives in the bottom border: it's metadata about the view, not content in the view.

### 2. `mos ready --person alice --bundle release-captain`

The readiness verdict. This is high-stakes: it determines if someone can ship.

```
  ┌─ Readiness ───────────────── alice → release-captain ─┐
  │                                                       │
  │  GATES                                                │
  │                                                       │
  │    ✓ rollback-strategy      ████████░░  0.75   PASS   │
  │      hard gate · verified                             │
  │                                                       │
  │    ✓ migration-safety       ██████░░░░  0.60   PASS   │
  │      soft gate · verified                             │
  │                                                       │
  │  ─────────────────────────────────────────────────    │
  │                                                       │
  ╔══ BLOCKERS ═══════════════════════════════════════════╗
  ║                                                       ║
  ║    ✗ event-bus-semantics    ░░░░░░░░░░  0.00   BLOCK  ║
  ║      hard gate · untested                             ║
  ║                                                       ║
  ║    ✗ deploy-sequencing      █████░░░░░  0.50   BLOCK  ║
  ║      soft gate · contested                            ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  │                                                       │
  │  ══════════════════════════════════════════════════   │
  │  VERDICT: NOT READY                    2 / 4 met      │
  │  ══════════════════════════════════════════════════   │
  │                                                       │
  │  Next:                                                │
  │    → mos challenge --person alice                      │
  │          --concept event-bus-semantics                 │
  │    → mos challenge --person alice                      │
  │          --concept deploy-sequencing                   │
  │                                                       │
  └───────────────────────────────────────────────────────┘
```

The BLOCKERS section uses double-line framing (╔═╗ ║ ╚═╝). It visually BREAKS the normal frame. Blockers interrupt the structure, just like they interrupt the deployment plan. VERDICT gets its own double-line emphasis band.

### 3. `mos reviewers --concepts auth-boundaries,cache-coherency --top 3`

Reviewer recommendations. This is the team-facing view.

```
  ┌─ Reviewers ────── auth-boundaries, cache-coherency ─┐
  │                                                     │
  │  1 ─── bob ──────────────────────── 2/2 verified    │
  │                                                     │
  │    auth-boundaries        ████████░░  0.73          │
  │      verified · 4d ago                              │
  │                                                     │
  │    cache-coherency        ███████░░░  0.68          │
  │      verified · 7d ago                              │
  │                                                     │
  │  ─────────────────────────────────────────────      │
  │                                                     │
  │  2 ─── carol ────────────────────── 1v / 1i         │
  │                                                     │
  │    auth-boundaries        ██████░░░░  0.55          │
  │      verified · 12d ago                             │
  │                                                     │
  │    cache-coherency        ██░░░░░░░░  0.20          │
  │      inferred                                       │
  │                                                     │
  └─── Detail: mos why --person <name> --concept <c> ──┘
```

Each reviewer gets a horizontal rule header with rank, name, and coverage summary. Stale concepts show (stale) callout. Contested concepts show ⚡.

### 4. `mos why --person bob --concept cache-coherency`

The evidence chain. This is the audit trail.

```
  ┌─ Explanation ──────── bob → cache-coherency ───────┐
  │                                                    │
  │  Level: verified                                   │
  │  Confidence: 0.80 → 0.68 (after decay)             │
  │                                                    │
  │  ════════════════════════════════════════════════   │
  │                                                    │
  │  EVIDENCE                                          │
  │                                                    │
  │    1 │ 2026-02-15 │ external:observed               │
  │      │            │ demonstrated                    │
  │      │                                              │
  │      │  "PR #298: cache invalidation refactor"      │
  │                                                    │
  │    2 │ 2026-02-12 │ grill:transfer                  │
  │      │            │ demonstrated                    │
  │      │                                              │
  │      │  "Correctly explained cache coherency        │
  │      │   protocol from first principles"            │
  │                                                    │
  │  ─────────────────────────────────────────────     │
  │                                                    │
  │  CLAIMS                                            │
  │                                                    │
  │    2026-02-10 │ self-reported: 0.70                 │
  │               │ "I know this well"                  │
  │                                                    │
  │  ─────────────────────────────────────────────     │
  │                                                    │
  │  DOWNSTREAM                                        │
  │                                                    │
  │    → event-bus-semantics    ███░░░░░░░  0.32       │
  │      inferred via related_to (weight: 0.4)         │
  │                                                    │
  │  ─────────────────────────────────────────────     │
  │                                                    │
  │  CALIBRATION                                       │
  │                                                    │
  │    Claim: 0.70                                     │
  │    Evidence: 0.80                                  │
  │    Gap: -0.10 (underclaiming)                      │
  │         ◄──────●─────────►                         │
  │         0    claim  evidence   1                   │
  │                                                    │
  └────────────────────────────────────────────────────┘
```

Evidence entries use a vertical pipe │ timeline. Calibration gap gets an inline number line visualization.

### 5. `mos calibrate --person bob`

The model quality report.

```
  ┌─ Calibration ───────────────────────────── bob ────┐
  │                                                    │
  │  Prediction accuracy                               │
  │  ████████░░  80%                                   │
  │  How often the model correctly predicted            │
  │  verification outcomes                              │
  │                                                    │
  │  ─────────────────────────────────────────────     │
  │                                                    │
  │  Overconfidence         0.12                       │
  │  ░░░░░░░░░░░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
  │  ▲ avg magnitude of unexpectedly poor outcomes     │
  │                                                    │
  │  Underconfidence        0.05                       │
  │  ░░░░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
  │  ▲ avg magnitude of unexpectedly strong outcomes   │
  │                                                    │
  │  ─────────────────────────────────────────────     │
  │                                                    │
  │  Stale coverage                                    │
  │  █████░░░░░  50%                                   │
  │  2 inferred concepts never directly verified       │
  │                                                    │
  │  Surprise rate          15%                        │
  │  Outcomes that contradicted model expectations     │
  │                                                    │
  │  ─────────────────────────────────────────────     │
  │                                                    │
  │  Claim calibration      0.85                       │
  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░●░░░░░     │
  │  Self-assessments vs evidence (1.0 = perfect)      │
  │                                                    │
  │  ════════════════════════════════════════════════   │
  │                                                    │
  │  i Insufficient data for reliable calibration.     │
  │    Continue building evidence.                     │
  │                                                    │
  └────────────────────────────────────────────────────┘
```

Overconfidence/underconfidence use POSITION markers on a number line. Prediction accuracy and stale coverage use standard fill bars. Recommendation separated by double-line divider, prefixed with i.

---

## Design Principles

1. **Color is trust.** If it's colored, it means something about trust state or confidence. No decorative color. Ever.
2. **Gradient coherence.** A concept row is one visual unit. Icon, name, bar, and metadata share the same intensity.
3. **Frames, not dumps.** Every output is framed. The frame carries metadata.
4. **Double lines for consequences.** Single-line dividers separate sections. Double-line dividers and frames signal consequences.
5. **Two-line concepts.** Every concept gets a data line and a detail line.
6. **Copy-paste commands.** Any "next step" suggestion is a complete, runnable command.
7. **Progressive disclosure.** Each command is self-contained but links to the next level of detail.
8. **The terminal is a canvas.** Use the full vocabulary of the terminal.

## Anti-Patterns

| Never | Why |
|---|---|
| Emoji | This isn't Slack. Unicode glyphs only |
| Colors without meaning | Every color maps to a trust concept |
| Walls of unstructured text | Frame everything. Breathe between sections |
| Truncated concept names | Dynamic column width. Names are never cut |
| "Success!" or "Error!" labels | Show what happened, not how to feel about it |
| Raw JSON in default output | `--format json` exists for machines |
| Hardcoded widths that break on narrow terminals | Detect terminal width. Degrade gracefully |
| Color as the ONLY differentiator | Always pair color with a symbol. Accessibility |
