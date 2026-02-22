# Terrain — Design System & Visual Philosophy

> This is a product design instruction file. Follow it as law when building any Terrain UI component. Read it fully before writing a single line of CSS.

---

## Philosophy: The Thinking Room, Not the Learning Platform

Terrain should feel like sitting alone in a well-lit room with a large table, good paper, and all the time in the world. There is a window. It is dark outside. The room is warm but not cozy — it is a room for work, not comfort. There are no posters on the walls saying "You can do it!" There is no music. There is a map pinned to the wall with your handwriting on it.

It should NOT feel like Duolingo, not like Coursera, not like a code academy with progress bars and achievement unlocks. It should not feel like school.

Think: if someone deep in thought — really wrestling with an idea, failing, trying again, arriving at understanding — looked up at this interface, it should feel like the room they're already in mentally. Quiet. Honest. Present. Not performing. Not cheerleading. Just there, holding the space.

**Core tension to hold:** Warmth × austerity. The comfort of a space that's yours × the discipline of a space that takes you seriously. A wool blanket on a wooden chair. Nothing soft about the work. Everything soft about the environment.

---

## The Identity

The name is **Terrain**. Geography. Ground beneath your feet. Territory you own or don't. Fog you haven't entered yet. Solid ground you've earned. The name is the metaphor is the interface.

The product serves one function through many modes: it helps you know what you know, see what you don't, and close the gap on your own terms. Everything — the map, the conversation, the modes — is in service of this.

---

## Color System

No gamification colors. No achievement gold. No progress-bar green. No danger red for wrong answers. The palette comes from the metaphor: terrain. Earth, fog, stone, ink on paper, the warmth of lamplight.

### Palette

```css
:root {
  /* -- GROUND: the base. Not black, not white. The color of good paper
       in warm light. A surface you write on. A desk you work at.
       Slightly warm, slightly dark — like parchment in a dim room -- */
  --ground: #1C1B18;
  --ground-soft: #242320;
  --ground-mid: #2E2D28;
  --ground-raised: #3A3832;

  /* -- CHALK: the color of your handwriting. Not pure white — that's
       a screen, not a page. This is chalk on slate, ink fading on
       good paper, pencil on kraft. Warm, readable, alive -- */
  --chalk: #E8E4D9;
  --chalk-dim: #C8C3B5;
  --chalk-faint: #9B9788;

  /* -- STONE: the color of things that don't need your attention yet.
       Borders, inactive elements, metadata. The walls of the room —
       present but not demanding. Like limestone, like concrete,
       like the grey of a pencil margin note -- */
  --stone: #7A766B;
  --stone-dim: #565349;
  --stone-faint: #3E3B35;

  /* -- VERIFIED: the color of ground you own. Not celebration green —
       this is the green of moss on stone. Something that grew there
       because you tended it. Quiet, earned, alive -- */
  --verified: #5A8A6A;
  --verified-dim: #3D6349;
  --verified-faint: #2A4433;

  /* -- INFERRED: the color of ground the system thinks you probably
       own but hasn't confirmed. Amber. A maybe. The warmth of
       lamplight falling on territory you haven't walked yet -- */
  --inferred: #C4A24E;
  --inferred-dim: #8B7435;
  --inferred-faint: #5C4D24;

  /* -- CONTESTED: the color of ground that's uncertain. You demonstrated
       understanding in one context, failed in another. This is not
       failure — this is the frontier where learning happens. A muted
       warm terracotta. Like turned earth -- */
  --contested: #B07055;
  --contested-dim: #7D4E3B;
  --contested-faint: #4A3028;

  /* -- FOG: the color of territory you haven't entered. Not invisible —
       present, but obscured. You know it's there. You can see its
       shape. You just haven't been there yet. A blue-grey haze -- */
  --fog: #5B6370;
  --fog-dim: #3E4550;
  --fog-faint: #2A2F38;

  /* -- LAMP: the single accent color. Used only for the learner's
       active focus — the concept they're exploring right now, the
       current conversation topic, their cursor on the map. Like
       the warm cone of a desk lamp falling on the page you're
       reading -- */
  --lamp: #E0B060;
  --lamp-dim: #A07830;
  --lamp-glow: rgba(224, 176, 96, 0.08);

  /* -- STATES (mapped to trust levels) -- */
  --trust-verified: var(--verified);
  --trust-inferred: var(--inferred);
  --trust-contested: var(--contested);
  --trust-untested: var(--fog);
  --trust-decayed: var(--stone);
}
```

### Application Rules

- **Dark by default but not pitch black.** The background is `--ground` — warm, papery, like a desk surface in dim light. Not void. Not terminal. A surface you'd put a book on.
- **No color means anything about the learner's worth.** Red does not mean "wrong." Green does not mean "right." Colors indicate trust states — verified, inferred, contested, untested. These are epistemic descriptions, not judgments.
- **`--lamp` is the only attention color.** It means: you are here. This is what you're looking at right now. It's the desk lamp, not a spotlight. Warm, focused, personal. Used for: current concept highlight, active conversation indicator, the learner's position on the map.
- **`--contested` is not a failure color.** It's the most interesting color on the map. It means the frontier — where understanding is forming but not yet solid. The UI should make contested territory feel like the most productive place to be, not a problem to fix.
- **Most of the interface is `--stone` and `--chalk`.** The room itself is neutral. The terrain data (trust states) provides the color. When no terrain data is present (empty states, settings, onboarding), the palette is almost monochrome — ground, stone, chalk. Quiet.

---

## Typography

**Do NOT use:** Inter (every SaaS), Fira Code alone (developer aesthetic), any font that makes this feel like a coding tutorial or an e-learning platform. No Comic Sans, no handwriting fonts, no "friendly" rounded typefaces.

### Font Stack

```css
/* -- VOICE: the agent's voice and the learner's environment.
     For headings, territory names, the map labels, questions
     the agent asks. Should feel like quality typesetting in
     a textbook you actually want to read. Authoritative but
     not cold. A professor who respects you -- */
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,300;1,8..60,400;1,8..60,500&display=swap');

/* -- HAND: the learner's voice. For input text, the learner's
     messages in conversation, their annotations, their claims.
     Should feel like neat handwriting — personal, direct,
     human. Distinguished from the agent's voice typographically
     so the conversation has two distinct speakers -- */
@import url('https://fonts.googleapis.com/css2?family=iA+Writer+Quattro:ital,wght@0,400;0,700;1,400&display=swap');

/* -- SYSTEM: for UI chrome, navigation, buttons, metadata,
     timestamps. Should disappear. Functional. The frame around
     the painting, not the painting -- */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap');

/* -- DATA: for trust percentages, concept counts, timestamps
     in the map, technical identifiers. Monospace for alignment.
     Should feel like marginalia — small, precise, annotative -- */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap');

:root {
  --font-voice: 'Source Serif 4', Georgia, serif;
  --font-hand: 'iA Writer Quattro', 'Courier New', monospace;
  --font-system: 'Geist', system-ui, sans-serif;
  --font-data: 'IBM Plex Mono', 'Courier New', monospace;
}
```

### Usage Rules — Four Fonts, Four Speakers

- **Source Serif 4** (`--font-voice`) — the agent's words, territory names, concept labels on the map, threshold questions ("Do you feel like you own this ground?"), section headings, the depth ladder labels. It's a variable optical-size serif that reads beautifully at both 12px map labels and 24px headings. It carries authority without intimidation. The professor's voice.
- **iA Writer Quattro** (`--font-hand`) — the learner's typed input, their messages in conversation, their claim statements, their explanations in write mode, their annotations. It's a proportional monospace — has the personality of typewritten text without the rigidity of pure monospace. When the learner sees their words on screen, it should feel like their own handwriting, distinct from the system's voice.
- **Geist** (`--font-system`) — navigation labels, button text, settings, mode indicators, timestamps, "Press Enter" hints, toast notifications. Invisible infrastructure. You read through it without noticing the font.
- **IBM Plex Mono** (`--font-data`) — trust percentages (80% verified), concept counts (12/15), session durations (47 min), technical identifiers. Always small, always in the margins, always supporting the main content. Like the numbers in the margin of a well-typeset book.

### The Two-Voice Conversation

The most important typographic decision in Terrain is distinguishing the agent's voice from the learner's voice in conversation. This is not a chat UI with speech bubbles. It's a dialogue with two distinct typographic identities:

```
AGENT (--font-voice, serif):
You've seen a problem structured like this before.
What in your owned territory feels similar?

LEARNER (--font-hand, quasi-monospace):
It reminds me of the TCP acknowledgment pattern —
you need confirmation that the message arrived
before you send the next one.

AGENT:
You just connected database write-ahead logging to
TCP's reliability guarantee. Same principle: don't
assume delivery, verify it.
```

The agent speaks in serif. The learner speaks in their hand. The distinction is immediate and doesn't need speech bubbles, colors, or labels to parse.

### Scale

```css
--text-xs: 0.7rem;     /* map annotations, trust percentages */
--text-sm: 0.8rem;     /* metadata, timestamps, secondary info */
--text-base: 0.95rem;  /* conversation text, body copy */
--text-lg: 1.15rem;    /* territory names, threshold questions */
--text-xl: 1.5rem;     /* section headings, mode labels */
--text-2xl: 2.0rem;    /* the map title, "Your Terrain" */
--text-3xl: 2.8rem;    /* empty state text, onboarding */
```

Readable, not dense. This isn't a trading terminal. The learner needs room to think. Generous line-height (1.6 for body, 1.4 for headings). Paragraphs have breathing room. The conversation should feel like reading, not scanning.

---

## Layout & Spatial Design

### The Room Metaphor

The layout has three zones, like a room:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                    THE MAP                        │
│              (pinned to the wall)                 │
│                                                  │
│         Territory overview, trust states,         │
│         the learner's position, fog of war        │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│               THE DESK                           │
│          (the conversation)                       │
│                                                  │
│    Where the learner and agent talk, where        │
│    modes happen, where thinking occurs            │
│                                                  │
├───────────────────┬──────────────────────────────┤
│                   │                              │
│    THE MARGIN     │     THE DESK (continued)     │
│   (annotations)   │                              │
│                   │                              │
│  Trust state of   │                              │
│  current concept  │                              │
│  Self-calibration │                              │
│  Session info     │                              │
│                   │                              │
└───────────────────┴──────────────────────────────┘
```

### Desktop Layout (Primary)

```
┌─────────────────────────────────────────────────────────────┐
│  terrain                                    session: 47min  │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                  │               │
│  MAP     │     CONVERSATION                 │   MARGIN      │
│  panel   │                                  │               │
│          │  Agent: You've seen a problem     │  TCP          │
│  [terr-  │  structured like this before.     │  Reliability  │
│   itory  │  What in your owned territory     │  ████████░░   │
│   list   │  feels similar?                   │  80% verified │
│   or     │                                  │               │
│   visual │  You: It reminds me of the TCP   │  Related:     │
│   map]   │  acknowledgment pattern...        │  · Flow Ctrl  │
│          │                                  │  · Congestion  │
│          │  Agent: You just connected        │               │
│          │  database WAL to TCP's            │  Claims:      │
│          │  reliability guarantee.            │  "I know      │
│          │                                  │   this" — you  │
│          │  ___________________________      │               │
│          │  |  Type here...            |     │               │
│          │                                  │               │
├──────────┴──────────────────────────────────┴───────────────┤
│  [Map]    [Conversation]    [Modes]    [Calibration]        │
└─────────────────────────────────────────────────────────────┘
```

- **Left panel (map):** 260px, collapsible. Shows territory list or visual graph. Always accessible.
- **Center (conversation):** Flexible width, 600-800px. The primary workspace. The desk.
- **Right panel (margin):** 240px, collapsible. Contextual annotations — trust state of whatever concept is being discussed, related concepts, self-calibration data. Updates automatically as the conversation moves between topics.
- **Bottom bar:** Minimal navigation. Not tabs — zone indicators. Clicking "Map" expands the left panel. Clicking "Calibration" expands the right panel with self-calibration view.

### Mobile Layout

```
┌───────────────────────┐
│  terrain        [map] │
├───────────────────────┤
│                       │
│   CONVERSATION        │
│   (full screen)       │
│                       │
│   Swipe right: map    │
│   Swipe left: margin  │
│                       │
│   ___________________  │
│   | Type here...    |  │
│                       │
├───────────────────────┤
│  Chat   Map   Self    │
└───────────────────────┘
```

The conversation is the primary view. Map and margin are accessible via swipe or bottom tabs. On mobile, the experience is conversation-first. The map is a view you visit, not a persistent panel.

### Rules

- **The conversation is always the largest element.** It is the desk. Everything else is the room around it.
- **The map is always one gesture away.** It is pinned to the wall. You glance up at it. On desktop: always visible in the left panel. On mobile: one tap or swipe.
- **The margin is contextual.** It shows information about whatever the conversation is currently about. It updates silently. It never demands attention. It's there when you glance at it.
- **No modals.** Nothing overlays the conversation. Thresholds, mode transitions, trust updates — all happen inline, in the conversation flow or in the margin. The conversation is sacred space. Nothing interrupts it.
- **Border radius: 4px maximum.** Slightly softer than InkRemind's 2px (this is a warmer environment) but still restrained. Not rounded. Not pill-shaped. The edges of paper.
- **Borders: 1px, `--stone-faint`.** Panels are divided by thin lines, not shadows. Like the ruled lines on paper — structural, not decorative.

---

## Components

### The Conversation

The most important component. This is where learning happens.

```
AGENT MESSAGE:
┌─────────────────────────────────────────┐
│  You've seen a problem structured like  │  ← --font-voice (serif)
│  this before. What in your owned        │     --chalk color
│  territory feels similar?               │     No avatar, no name label.
│                                         │     The serif IS the identity.
└─────────────────────────────────────────┘

LEARNER MESSAGE:
┌─────────────────────────────────────────┐
│  It reminds me of the TCP               │  ← --font-hand (quasi-mono)
│  acknowledgment pattern — you need      │     --chalk color
│  confirmation that the message arrived   │     Slightly indented or
│  before you send the next one.           │     left-aligned differently
└─────────────────────────────────────────┘
```

**No chat bubbles.** No colored backgrounds per speaker. No avatars. The typographic distinction between serif (agent) and quasi-monospace (learner) is the only differentiation needed. This is a dialogue, not a chat.

**Spacing:** 24px between messages. 32px between speaker changes. The conversation breathes. Ideas need room.

**Inline trust updates:** When a verification event occurs during conversation, a subtle annotation appears between messages:

```
  ─── tcp-retransmission → verified (from your explanation) ───
```

`--font-data`, `--text-xs`, `--stone`, centered. A quiet system note, not a celebration. The learner sees it, absorbs it, moves on. No confetti. No badge. Just a fact.

**Inline mode transitions:** When the agent suggests a mode change, it happens in the conversation:

```
AGENT:
Want to see this in code?

  ┌─ sandbox ─────────────────────────────┐
  │                                       │
  │  // TCP retransmission simulation     │
  │  const socket = net.createConnection  │
  │  ...                                  │
  │                                       │
  │  [Run]                                │
  │                                       │
  └───────────────────────────────────────┘

AGENT:
Try setting the timeout to 0. What do you
think happens?
```

The sandbox opens inside the conversation. The conversation doesn't leave. Modes are things the conversation *becomes*, not places the conversation goes.

### The Input

```
┌───────────────────────────────────────────────┐
│  │                                            │  ← --font-hand
│                                               │     --chalk color
│                                               │     1px bottom border --stone
│                                               │     Min height: 48px
│                                               │     Expands with content
└───────────────────────────────────────────────┘
```

- No border on top or sides. Just the bottom line. Like writing on ruled paper.
- Font: `--font-hand` — the learner's voice.
- Placeholder: none. Just the cursor. The conversation provides context.
- On focus: bottom border transitions to `--chalk-dim`, 200ms. Barely perceptible. The line warms up.
- Multiline by default. The learner may write paragraphs (especially in write mode). Let them.

### Territory Card (Map Panel)

```
┌─────────────────────────────────────────┐
│  TCP Reliability                        │  ← --font-voice, --text-lg
│                                         │
│  ████████░░  80%                        │  ← Progress bar + percentage
│  verified                               │     Bar: --verified fill
│                                         │     on --stone-faint track
│  ◐ 2 contested   ○ 1 untested           │  ← Concept breakdown
│                                         │
│  → Threshold: Flow Control              │  ← Next threshold, if any
│    Ready: 2/3 concepts                  │     --font-data, --text-xs
└─────────────────────────────────────────┘
```

**Visual treatment:**
- Background: `--ground-soft`
- Border: 1px `--stone-faint`
- The progress bar is the territory's signature. Simple: filled portion in the trust color, unfilled in `--stone-faint`. The percentage is right-aligned, `--font-data`.
- Territory name: `--font-voice`, `--chalk`
- Metadata: `--font-data`, `--text-xs`, `--stone`
- Active territory (currently being explored): left border 2px `--lamp`. The desk lamp is on this territory.
- Hover: background shifts to `--ground-mid`. Subtle.

### Trust State Indicators

Used on the map, in the margin, on concept labels:

```
● VERIFIED   — solid circle, --verified
◐ CONTESTED  — half circle, --contested
○ INFERRED   — open circle, --inferred
◌ UNTESTED   — dotted circle, --fog
◦ DECAYED    — faint circle, --stone
```

Typographic glyphs, not icons. Consistent everywhere. The learner learns these five symbols once and reads them everywhere in the UI.

### Threshold Moment

When the learner reaches a threshold, it appears in the conversation:

```
AGENT:
You've been working through TCP reliability.
Before moving to flow control, here's where
you stand.

  ┌─ threshold ───────────────────────────┐
  │                                       │
  │  TCP Reliability → Flow Control       │
  │                                       │
  │  ● tcp-basics         verified        │
  │  ● tcp-acknowledgment verified        │
  │  ◐ tcp-retransmission contested       │
  │                                       │
  │  Do you feel like you own this        │
  │  ground?                              │
  │                                       │
  │  [ Yes, let's move on ]               │
  │  [ Not yet, I want to review ]        │
  │                                       │
  └───────────────────────────────────────┘
```

**Visual treatment:**
- Background: `--ground-mid`
- Border: 1px `--stone`
- The question is `--font-voice`, italic. It's the most personal question in the UI.
- Buttons: text links, not boxes. `--chalk` for primary, `--stone` for secondary. The learner is making a decision, not clicking a button.
- The contested concept is highlighted — this is the thing to address if they choose to stay.

### Self-Calibration View

```
┌─────────────────────────────────────────────────┐
│  Your Calibration                               │
│                                                 │
│  When you say you know something,               │
│  the evidence agrees 73% of the time.           │  ← The key metric
│                                                 │
│  ALIGNED                                        │
│  ● TCP basics — you said confident,             │
│    evidence confirms                            │
│                                                 │
│  OVERCLAIMED                                    │
│  ◐ Congestion control — you said                │
│    confident, but only recall-level              │
│    evidence exists                              │
│                                                 │
│  UNDERCLAIMED                                   │
│  ● HTTP caching — you said uncertain,           │
│    but you've demonstrated through               │
│    three modalities                             │
│                                                 │
│  Your calibration is improving.                 │
│  Last month: 61%. This month: 73%.              │
└─────────────────────────────────────────────────┘
```

**Visual treatment:**
- This is not a dashboard. It's a mirror. The language is reflective, not evaluative.
- "Your calibration is improving" — stated as fact, not praise. No "Great job!"
- The overclaimed section uses `--inferred` color (amber). Not red. Overclaiming isn't wrong. It's information.
- The underclaimed section uses `--verified` color (green). Underclaiming means you're better than you think. That's interesting, not a problem.
- Numbers: `--font-data`. Descriptions: `--font-voice`.

### Level-Change Notification

```
  ─── tcp-retransmission → verified ───
  based on your explanation just now
  [see reasoning]
```

Appears inline in the conversation or as a quiet toast at the bottom of the viewport. Never a modal. Never blocking. `--font-data`, `--text-xs`, `--stone`. The "[see reasoning]" link opens the `explainDecision` view in the margin panel.

Transitions up from below (translateY 8→0, opacity 0→1, 300ms). Auto-dismisses after 5 seconds. Or stays if the learner interacts with it.

---

## Animation & Motion

### Philosophy: Stillness, Not Stiffness

The room is calm. Things move when they need to and are still when they don't. Motion serves orientation (this thing moved here), feedback (you did that), and revelation (this appeared because of what you said). Motion never serves excitement. There is nothing to be excited about. There is only the work.

### Timing

```css
:root {
  --ease-appear: cubic-bezier(0, 0, 0.3, 1);     /* things fading in: gentle arrival */
  --ease-settle: cubic-bezier(0.2, 0, 0, 1);      /* things finding their place */
  --ease-retreat: cubic-bezier(0.5, 0, 1, 1);     /* things leaving: quick, no lingering */
}
```

### Specific Animations

- **New message in conversation:** Fades in with slight rise (translateY 6→0, opacity 0→1, 300ms, `--ease-appear`). Not fast. A thought arriving, not a notification popping.

- **Trust state change on map:** The territory bar width transitions smoothly (400ms, `--ease-settle`). The trust glyph (● ◐ ○ ◌) crossfades (200ms). Quiet. The map updating in the background while you work.

- **Mode opening (sandbox, sketch):** The mode container expands in height within the conversation (300ms, `--ease-settle`). Content inside fades in after height settles (200ms, 100ms delay). Like opening a book to a specific page — the page appears, then you read.

- **Threshold appearance:** The threshold card fades in with a slightly longer duration than normal messages (500ms). It's a moment. The conversation pauses for it. But it doesn't announce itself loudly.

- **Margin panel update:** Content crossfades when the context changes (150ms out, 200ms in). No slide. The margin is always there; its content simply changes.

- **Map territory hover:** Background shift (100ms). No scale, no border change, no shadow. The subtlest possible acknowledgment.

### Forbidden Motions

- No celebration animations of any kind (confetti, particles, sparkles, bouncing)
- No progress bar fill animations on first load (show the current state immediately)
- No number counting animations (the number is the number)
- No shake or wiggle on error (errors are informative, not punitive)
- No pulsing or glowing on interactive elements (the lamp glow is ambient, not attention-seeking)
- No transitions longer than 500ms (this is not a cinematic experience — it's a thinking tool)
- No sound effects

---

## Iconography

**Almost none.** Terrain uses typographic glyphs for nearly everything.

### Trust Glyphs

```
●  verified     (U+25CF)
◐  contested    (U+25D0)
○  inferred     (U+25CB)
◌  untested     (U+25CC)
◦  decayed      (U+25E6)
```

### Navigation/Action Glyphs

```
→  forward, link, "move to"
←  back, "return to"
↵  enter/submit
×  close, dismiss
+  add, expand
—  divider
·  separator, list item
```

### SVG Icons (maximum 4)

Only if a glyph truly cannot communicate the concept:

- **Map pin** — for "you are here" on the visual map. 1px stroke, `--lamp`.
- **Compass** — for goals/orientation. 1px stroke, `--stone`.
- **Pencil** — for write mode. 1px stroke, `--stone`.
- **Terminal** — for sandbox/provision modes. 1px stroke, `--stone`.

All 16px, 1px stroke, no fill. They are marginalia, not features.

---

## Texture & Atmosphere

### Background Treatment

The `--ground` background has a faint paper texture:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.025;
  background-image: url("..."); /* fine paper grain texture */
  mix-blend-mode: soft-light;
  z-index: 9999;
}
```

Softer than InkRemind's noise overlay. This is `soft-light`, not `overlay`. The texture should feel like kraft paper, not film grain. You're writing on something, not watching something.

### The Lamp Glow

The current concept — whatever the conversation is about right now — has a faint warm glow in the margin and on the map. Not a highlight. Not a border. A glow. Like lamplight falling on the page you're reading.

```css
.current-concept {
  box-shadow: 0 0 20px var(--lamp-glow);
}
```

Very faint (the `--lamp-glow` is only 8% opacity). It's felt, not seen. It moves as the conversation moves. When the topic changes, the glow transitions to the new concept (400ms fade).

### Panel Borders

1px `--stone-faint`. No shadows anywhere in the application. Panels are zones in a room, divided by thin lines like the joins between sheets of paper on a wall. Structural, not decorative.

### Scroll Behavior

```css
html {
  scrollbar-width: thin;
  scrollbar-color: var(--stone-faint) transparent;
}

/* The conversation auto-scrolls to newest message
   but respects manual scroll position. If the learner
   scrolls up to re-read, auto-scroll stops until
   they return to the bottom. */
```

---

## The Map (Visual)

Phase 1 is the territory list view (described in the spec). Phase 2 is the visual map. When the visual map is built:

### Visual Encoding

- **Verified concepts:** Solid dots, `--verified` color, full size. Owned ground.
- **Inferred concepts:** Open dots, `--inferred` color, slightly smaller. Probably known.
- **Contested concepts:** Half-filled dots, `--contested` color, pulsing very slowly (opacity 0.7→1.0, 3s). The frontier. Alive.
- **Untested concepts:** Faint dots, `--fog` color, smallest. Shapes in the fog.
- **Edges (prerequisite/component/related):** Thin lines connecting dots. `--stone-faint` by default. Edges between verified concepts: `--stone`. The structure of owned territory is more visible.
- **Territories:** Subtle background regions grouping related concepts. No borders on territories — they're zones, not boxes. Distinguished by a barely perceptible background tint.
- **The learner's position:** A `--lamp` colored ring around the concept currently being discussed. The desk lamp shining on where you are.
- **Goals:** If set, a faint path drawn from current position to goal concept. `--chalk-faint`, dashed line. The path is a suggestion, not a mandate.

### Map Interaction

- Hover on concept: show name + trust state in a small tooltip (`--font-data`, `--text-xs`)
- Click on concept: margin panel updates with full trust details, conversation can be directed there
- Zoom and pan: smooth, momentum-based. The map can be large. The learner navigates it.
- The map never auto-zooms or auto-navigates. The learner controls their position. (Policy A: mapmaker, not guide.)

---

## Anti-Patterns — The Wall of "Never"

| Never | Why |
|---|---|
| Progress bars that celebrate | Progress is visible on the map. It doesn't need applause |
| "Great job!" or "Well done!" | Policy E. The agent reflects, never praises |
| Streaks, points, badges | Policy D. No gamification. Ever |
| "You're falling behind" | Policy F. No urgency |
| Red for wrong answers | Wrong is informative, not punitive. Use --contested |
| Green for right answers | Right is a trust update, not a reward. Use --verified |
| Confetti, sparkles, celebrations | This is a thinking room, not a game show |
| Chat bubbles with colors per speaker | Typography distinguishes speakers, not bubbles |
| Modals or overlays | Nothing interrupts the conversation |
| Rounded avatar circles | There is no avatar. The typography is the identity |
| "Recommended for you" carousels | Policy A. Mapmaker, not guide |
| Difficulty ratings (Easy/Medium/Hard) | The agent calibrates difficulty silently. Labels flatten the experience |
| Time-based challenges or countdowns | Policy F. No urgency |
| Social features (leaderboards, sharing) | Policy D. Learning is personal |
| Animated mascots or characters | The agent is text. Its identity is its voice, not a character |
| Skeleton loaders | Show a still, faint placeholder. No pulsing, no shimmer |
| Onboarding tours with popups | The conversation IS the onboarding |
| "Did you find this helpful?" ratings | The trust model captures signal. No need to ask |

---

## What the First Session Looks Like

The learner arrives. The screen is quiet. Almost empty.

```
┌─────────────────────────────────────────────────┐
│  terrain                                        │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│         What do you want to learn?              │
│                                                 │
│         ___________________________________     │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

- "terrain" in the top-left, `--font-system`, `--stone`. Quiet. Just the name.
- "What do you want to learn?" centered, `--font-voice`, `--text-xl`, `--chalk`. The only question.
- The input below it. Waiting.
- No map yet (no data). No margin yet (no context). No navigation yet (nowhere to go). Just the question and the space.

The learner types. The conversation begins. The map builds. The room fills with their thinking.

---

## One-Line Gut Check

Before committing any UI code, ask yourself:

> *"Would someone deep in thought — really wrestling with an idea, failing, trying again, quietly arriving at understanding — look up at this interface and feel that the room respects what they're doing? Or would they feel like they're being managed?"*

If the answer is managed, delete it and start over.
