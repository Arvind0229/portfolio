# Change: four visual identities and the motion system (Phase 2, G4/G5)

## Date

2026-09-15

## EXISTING

Three theme ids (`enterprise`, `engineering`, `studio`) × two modes, driven by
`data-theme` / `data-mode` on `<html>`, with a pre-paint bootstrap script and
per-theme mode memory. `:root` carried 68 tokens and doubled as both the design
baseline and the Enterprise light palette. `backdrop.tsx` mounted one layer per
theme. The robot was a single 22-second CSS cycle mounted in `hero.tsx` **with
no theme check** — it rendered in all three themes. `StudioLayer` was two
counter-rotating rings in a corner. `EnterpriseLayer` was a 1px horizon rule.

## GAP

No pastel clay theme. No crimson theme. The "mandala" was not radial. The robot
had no states and leaked into every theme. Cards and buttons had colour
transitions but no depth response.

## REUSED

Everything visible on the page is the component that was already there.

| Reused | Instead of |
|---|---|
| The panel token system (`--panel-shadow`, `--panel-bg`, `--panel-radius`, `--shadow-*`, `--radius-*`) | Editing thirteen section components. **The entire clay look is token changes; not one section file was touched.** |
| `automation-flow.tsx` | A second workflow diagram. It already reads its colours from tokens, so it became the Light RPA visual and the Crimson execution flow with no code change at all |
| `robot-figure.tsx` | Redrawing the artwork. Every state is a transform of the whole figure |
| `backdrop.tsx` mount-one-layer architecture | A second backdrop system. It is also what enforces isolation |
| The two Studio rings (r=86/90s, r=58/64s) | Replacing them. The mandala is built *around* them |
| `Reveal`, `use-in-view`, `PageTransition`, `--theme-transition`, `.theme-wash` | New scroll/route/theme transition machinery |
| Existing `theme-option-*` testids | Renaming anything. All three survive |

**Dependencies added: none.** Production list is still `next`, `react`,
`react-dom` + five fonts. No Framer Motion: every interaction below is a CSS
transition on `transform`/`box-shadow`, which is what the existing architecture
was already built for.

## CHANGED

### The architecture decision

A fourth theme id, `clay`, was added rather than repurposing an existing one.

**Why not Option C** (Light and Crimson as the two modes of one theme): it
gives three picker entries for four identities, and it makes the bulb the only
route to Crimson. **Why not four ids with two mode-locked**: disabling the mode
toggle on half the themes is a capability loss.

**Why `clay` is additive and safe:** `enterprise` is kept (it is a
localStorage key and a test selector, not a name — it is now *displayed* as
"Crimson Clay"). Every previously stored preference still names a theme that
exists. Every existing `theme-option-*` selector still resolves. The change is
one entry in `THEME_IDS`, one in the bootstrap array, one union member and one
row in `themes[]`.

Each of the four has both modes, so the bulb never becomes a dead control.

| Theme | id | Default | Signature |
|---|---|---|---|
| Light Clay | `clay` | light | pastel washes + automation rail |
| Midnight | `engineering` | dark | the robot |
| Studio | `studio` | light | generative mandala |
| Crimson Clay | `enterprise` | **dark** | abstract web geometry |

### Theme isolation

Enforced by **mount condition, not CSS**: `backdrop.tsx` renders exactly one
signature layer and `RobotStage` returns `null` off Midnight. An inactive
signature is absent from the DOM, so it cannot animate, hold a timer, or appear
in a screenshot. Switching theme unmounts the old layer — that *is* the
cleanup.

### The robot

`robot-stage.tsx`, new. Six states (`hidden` → `peeking` → `observing` →
`walking` → `idle` → `hiding`) with weighted transitions and randomised
durations, because fixed durations produce a loop a viewer predicts after two
cycles. State lives in a **ref**; the machine writes `data-state` and
`--robot-x` on one element and CSS does the movement. React renders the
component twice in its life. One `setTimeout` outstanding at any moment,
cleared on unmount, theme change and route change.

### Interaction motion

Applied through the existing classes and by element role
(`a[class*='rounded']`, `button:not([role='tab'])`, `.surface-card:has(a,
button)`), so every card, button and control on the site gained hover lift and
press compression without a component edit. `transform` and `box-shadow` only.

## FILES

```
src/types/index.ts                       ThemeId gains 'clay'
src/lib/theme/constants.ts               THEME_IDS + bootstrap array + dark-first default for enterprise
src/data/site.ts                         four theme definitions, new display names
src/app/globals.css                      clay light/dark, crimson light/dark, interaction layer,
                                         mandala + clay + crimson backdrop CSS, robot states,
                                         mobile budgets, reduced-motion entries
src/components/visuals/backdrop.tsx      ClayLayer, CrimsonLayer, MandalaLayer; EnterpriseLayer removed
src/components/visuals/robot-stage.tsx   NEW — the state machine
src/components/sections/hero.tsx         mounts RobotStage; unused mode binding removed
tests/e2e/{accessibility,visual,journey}.spec.ts   theme enumerations
tests/component/{appearance-controls,bulb-switch}.test.tsx   light-first theme is now `clay`
```

**Not touched:** `src/lib/ai/**`, `src/lib/admin/**`, `src/app/api/**`,
`middleware.ts`, project data, `project-depth.json`, `buildChunks()`.

## TESTS

| | Result |
|---|---|
| `tsc --noEmit` | clean |
| `next lint` | no warnings or errors |
| Unit + component + API | **459 passed** |
| `next build` | successful |
| E2E | run in batches — see the release note for which |

Two component tests changed. Both asserted that Enterprise is light-first,
which stopped being true when Enterprise became Crimson. Each now uses `clay`
(the light-first theme) and keeps its original intent; the appearance test also
gained the reverse assertion, that Crimson pulls the mode back to dark.

## PERFORMANCE

| | Before | After |
|---|---|---|
| Shared JS | 102 kB | **102 kB** |
| Homepage | 153 kB | **153 kB** |
| `/projects/[id]` | 109 kB | 109 kB |
| `/admin` | 123 kB | 123 kB |
| Middleware | 33.9 kB | 33.9 kB |

Unchanged, which is the expected cost of a change that is mostly CSS custom
properties plus one small client component. Budget is 115 kB shared.

Mobile budget at ≤430px: mandala layers 3 and 4 are not rendered and the rest
hold still; crimson charges and clay washes stop. This is the stated starting
hypothesis, not a measurement that it was needed.

No `will-change` was added anywhere (architecture.md §8 — it exhausted GPU
memory on phones and made other layers paint blank).

## Accessibility

**0 axe WCAG A/AA violations**, measured on all four themes at 390px and
1440px, scanned under reduced motion so the colours axe reads are final rather
than mid-fade.

One real failure was found and fixed: `--text-subtle` at the value from the
design note (`#706b78`) measures **4.16:1** on `--clay-lavender` and failed in
the footer at 390px. It is now `#5f5968`, which clears 4.5:1 on every pastel
surface in the theme (worst case 5.43). Computed, not adjusted until it looked
right.

Coral `#FF6F61` measures 2.9:1 on white, so it is never text: it lives in
`--accent-vivid` for fills and graphics, and text-weight coral is
`--accent-primary` `#B03A2E` (6.0:1 on white). Crimson `#E21D36` is 3.6:1 on
the crimson surface, so the same split applies there.

## Reduced motion

Every new animated class is named in the existing allow-list — it is explicit
by design, and a class that is not named escapes it silently. The robot does
not walk or roam: the machine never starts, and the figure holds one still
pose, `aria-hidden` and `pointer-events:none` as in every other state.
Verified in a browser: `states=[hidden, observing]`, never `walking`.

## UAT results

Horizontal overflow, home page, all four themes:

```
  clay         320:0  390:0  430:0  768:0  1280:0  1440:0
  engineering  320:0  390:0  430:0  768:0  1280:0  1440:0
  studio       320:0  390:0  430:0  768:0  1280:0  1440:0
  enterprise   320:0  390:0  430:0  768:0  1280:0  1440:0
```

Theme isolation, measured by querying for all four signature selectors on each
theme: exactly one present in every case.

Robot state machine over 56 seconds on Midnight: `[hidden, walking, idle]`,
reached a visible state, **0px** document overflow throughout.

### Two defects the measurement caught

1. **76px of document overflow at 1280 on Midnight.** My first robot CSS used
   `translate3d(58%, …)` for the hidden state — moving *right*, which is the
   exact trap the old keyframes carried a width table about. The element scan
   reported 0px because the wrapper is `aria-hidden` and the scan skips
   `aria-hidden` subtrees; only the document-width measurement saw it. Every
   state now keeps X at or left of −50% and the hidden states leave downward.

2. **The first screenshots showed an empty page under the headline.** Not a
   product fault — the harness screenshotted at 1200ms, before
   IntersectionObserver had attached, so nothing had revealed. It now waits for
   `.reveal[data-visible="true"]`. Same family as the axe-mid-fade mistake
   recorded in AI-CONTEXT §6.

## Rollback

`git revert` of this commit, or `git reset --hard pre-g4-themes`. A visitor
holding `ag.theme=clay` after a revert falls back to the default theme, because
the bootstrap validates against the id list — no broken state.

## KNOWN GAPS

1. **Light Clay and Crimson Clay dark/light counterparts are authored but
   unreviewed.** `clay` dark ("dusk clay") and `enterprise` light exist so the
   bulb works on every theme; neither is one of the four headline identities
   and neither has had a design pass.
2. **Lighthouse still never run.** Every performance figure here is a build
   measurement.
3. **No real case-study content.** Unchanged, and untouched by this work.
4. **`buildChunks()` still does not read the seven G3 depth fields.** G6.
   Deliberately not touched.
5. The ≤430px motion budget is a hypothesis, not a measurement of need.

## Final status

Implemented, built, measured and visually inspected in a browser at 1440 and
390 on all four themes. Not released.
