# Motion system

**Status:** Phase 2 proposal. The "today" column is measured from the code;
the "Phase 2" column is not built yet.

---

## 1. The rule this document exists to enforce

**Global motion is shared. Visual effects are theme-specific.** Confusing the
two is how three themes end up as one theme with three palettes.

```
GLOBAL          page transitions, scroll reveals, card/button/nav
                interaction, micro-feedback — identical everywhere,
                scaled by --motion-scale

THEME           Midnight  → robot character
                Studio    → generative Mandala
                Crimson   → clay elevation and depth
                — never stacked, never shared
```

---

## 2. Tokens

### Already in `globals.css`

```css
--motion-fast:  140ms
--motion-base:  260ms
--motion-slow:  620ms
--ease-out:     cubic-bezier(0.22, 1, 0.36, 1)
--ease-in-out:  cubic-bezier(0.65, 0, 0.35, 1)
--motion-scale: 1          /* per theme, see below */
```

`--motion-scale` is the mechanism that already gives each theme a different
temperament, and it is the one to build on rather than replace:

| Theme | `--motion-scale` | Reads as |
|---|---|---|
| `enterprise` (Crimson) | **0.8** | restrained, executive |
| `engineering` (Midnight) | **1.1** | alive, technical |
| `studio` | **1.0** | neutral, expressive through the backdrop |
| reduced motion | **0** | still |

Durations are written `calc(var(--motion-slow) * var(--motion-scale))`, so one
variable changes the whole feel of a theme.

### Proposed additions

```css
--ease-emphasized: cubic-bezier(0.2, 0, 0, 1)   /* enter with authority */
--ease-exit:       cubic-bezier(0.4, 0, 1, 1)   /* leave quickly */
--motion-distance-sm: 6px
--motion-distance-md: 18px      /* already hard-coded in .reveal */
--motion-stagger:     60ms      /* already passed ad hoc as --reveal-delay */
```

Two of these already exist as literals scattered through the stylesheet. Naming
them is the smallest possible change and stops the next one being invented
again.

---

## 3. Global motion

| Interaction | Today | Phase 2 |
|---|---|---|
| Scroll reveal | ✅ `Reveal` + IntersectionObserver + `.reveal`, stagger via `--reveal-delay` | Applied to the new case-study sections |
| Page enter | ✅ `page-enter` keyframe | Applied to route changes consistently |
| Theme switch | ✅ `theme-wash` | Unchanged |
| Card hover | Partial — projects yes, others no | One `.card-reactive` behaviour everywhere |
| Button press | Partial | Consistent press/active feedback |
| Nav active indicator | ✅ scroll-spy | Indicator movement between items |
| Mobile menu | ✅ opens/closes | Stagger the items in |
| Copy / upload / save feedback | ✅ in contact and admin | Extended to new admin actions |
| **Exit animations** | ❌ | Deferred — see §6 |
| **Shared element / FLIP** | ❌ | Deferred — see §6 |
| **Spring physics** | ❌ | Deferred — see §6 |

### Non-negotiables

- `transform` and `opacity` are the default. **No layout property is ever
  animated** — not width, height, top, left, margin or padding.
- **One documented exception:** Crimson may animate `box-shadow`, because
  elevation *is* its identity and displacing the card instead would be a
  different design. `box-shadow` is a paint-level property: cheaper than layout,
  more expensive than compositing. It is used on discrete state changes (hover,
  press), never in a continuous loop, and the frame cost is measured at G5
  rather than assumed.
- No `requestAnimationFrame` loop that writes React state.
- Every decorative loop is named in the reduced-motion suppression list.
- A decorative element is `aria-hidden` and `pointer-events: none`.

---

## 4. Theme-specific motion

### 4.1 Midnight (`engineering`) — the robot

**Today.** A 280-line SVG with internally animated parts (float, eyes, beacon,
core, scan), wrapped in `.robot-peek`: a 22-second CSS cycle that leans the
figure in from the bottom-right of the hero, glances twice and withdraws. Only
in the hero. Only at `xl:` and above. In **all three themes**.

**Phase 2.** A five-state machine, gated to Midnight:

```
        ┌──────────────────────────────────────────┐
        ↓                                          │
     HIDDEN ──→ PEEKING ──→ OBSERVING ──→ HIDING ──┘
        │                        ↑
        └──→ WALKING ────────────┘
               ↑  ↓
              IDLE
```

| State | Duration | Behaviour |
|---|---|---|
| `HIDDEN` | 25–60s | Off-stage. Nothing renders, nothing animates. |
| `PEEKING` | ~2s | Leans in from an edge — the existing `robot-peek` transform |
| `OBSERVING` | 3–6s | Still, eyes and beacon running |
| `WALKING` | 4–8s | Translates horizontally within a safe zone |
| `IDLE` | 6–12s | Float only |
| `HIDING` | ~1s | Withdraws |

**Implementation constraints, all of which follow from directive §32:**

- The state machine lives in one component, holds its state in a `ref`, and
  writes a `data-state` attribute plus CSS custom properties. **No `setState`
  per frame.** A React re-render per animation frame would re-render the hero.
- One timer at a time, cleared on unmount, theme change and route change.
- Safe zones expressed as a bounded X range; the figure never enters the header,
  the CTA column, or any form.
- `pointer-events: none`, `aria-hidden="true"`.
- **Reduced motion: the robot does not walk, roam, or animate continuously.**
  It may appear as a still identity element — no transform loop, no internal
  part animation — and it remains `aria-hidden="true"`, `pointer-events: none`
  and out of the way of every control. Identity preserved; movement removed.
- Below 1280px the robot does not render at all. This is the existing
  behaviour and it is correct: there is no safe zone on a phone.

**The existing SVG asset is reused unchanged.** Every requested state is a
transform of the whole figure; none of them need the artwork redrawn.

### 4.2 Studio — the Mandala

**Today.** `StudioLayer` renders two counter-rotating dashed circles (r=86,
r=58 in a 200 viewBox) and one horizontal rule, at 14% opacity, in a 30rem box
pinned to the top-right corner, over a paper-grain noise overlay. Rotation is
`ring-turn` at 90s and 64s, one reversed. Both are killed under reduced motion.

**It is not a mandala.** Two rings are not radial symmetry.

**Phase 2.** Extend the same SVG into a nested radial system:

```
       layer 4   outer ring, 24 ticks           rotate  +180s
       layer 3   petal motif × 12               rotate   -120s
       layer 2   existing r=86 dashed ring      rotate   +90s   ← kept
       layer 1   existing r=58 dashed ring      rotate   -64s   ← kept
       layer 0   centre mark
```

- One SVG, one `transform: rotate` per layer, no canvas, no WebGL, no library,
  no per-frame JavaScript. This is what the current layer already does and it
  is the cheapest thing that can produce the effect.
- Rotation only. No opacity pulsing, no scale breathing — those are the parts
  that read as "noisy" and they cost more than they add.
- Centred as an environment rather than pinned as a corner ornament.

| Width | Behaviour |
|---|---|
| ≥1024px | All five layers, full motion |
| 768–1023px | Layers 0–3, slower |
| 431–767px | Layers 0–2 |
| **≤430px** | **Static geometry. No rotation.** |

The ≤430px rule is a *starting hypothesis*, per the directive. If measurement
later shows a lightweight animated version costs nothing meaningful, it can be
revisited — but the default must not be "animate and hope".

**Cleanup:** the Mandala must not run when Studio is not the active theme.
`backdrop.tsx` already unmounts non-active layers, so this falls out of the
existing architecture; a test will assert no `ring-turn` element exists in the
DOM outside Studio.

**Never in Crimson.** Stated here because it is the one rule in this document
most likely to be broken by accident.

### 4.3 Crimson (`enterprise`) — clay and depth

**Today.** Flat surfaces with borders. `EnterpriseLayer` is a single 1px
horizon rule with a highlight travelling along it. `--motion-scale: 0.8`.

**Phase 2.** Motion through *elevation* rather than displacement:

- Card hover raises the clay shadow rather than translating the card
- Press compresses it
- Section reveals stay slow and short (0.8 scale already does this)
- The backdrop stays the horizon rule — **no Mandala, no robot**

There is a performance argument for clay that is worth recording, because it
was measured earlier in this project: `backdrop-filter` (glassmorphism)
repaints on every scroll frame, while `box-shadow` (claymorphism) does not.
Clay is the cheaper of the two dimensional idioms, not merely the more
fashionable one.

**Risk:** layered soft shadows in *light* mode routinely fail text contrast.
Ratios get computed before the tokens are committed, the way the WhatsApp
colour was handled.

---

## 5. Reduced motion

The existing implementation is careful and is being extended, not rewritten.

It is a **two-part check** — the OS preference AND the absence of
`data-motion="full"` — so a visitor can opt back into motion on this site
without changing their system setting.

The subtle part, already learned here the hard way and recorded in the
stylesheet: decorative loops are **removed outright**, not shortened. A 0.001ms
animation still schedules work, and a *delayed* animation still fires when its
delay elapses and lands on its final keyframe — motion arriving late rather
than motion suppressed. Every new decorative animation must be added to that
suppression list by name.

| Under reduced motion | Result |
|---|---|
| `--motion-scale` | 0 |
| Mandala rotation | stopped; geometry stays |
| Robot walking / roaming | disabled |
| Robot continuous animation | disabled — still figure, still `aria-hidden` |
| Scroll reveals | content visible immediately |
| Stagger | none |

---

## 6. The library question

**"Framer-quality" is a quality bar, not an instruction to animate everything.**
It means motion that improves hierarchy, feedback, navigation or storytelling.
Motion that does none of those is decoration, and decoration is a regression
with extra steps. The existing CSS, IntersectionObserver and motion tokens are
extended first; a library is considered only when they demonstrably cannot
serve a named interaction.

Three capabilities genuinely cannot be built well in CSS: coordinated exit
animations, shared-element / FLIP layout transitions, and spring physics.

Everything listed in §3 as Phase 2 work can be done with what exists. The plan
is therefore to extend the CSS system first and see what is still missing.

If a specific interaction then requires a library, the gate is a written case
with: the exact interaction, why the current system cannot serve it, the
measured bundle before, the measured bundle after, the frame-time impact, an
alternative implementation, and a recommendation — then approval before
installing anything.

Current baseline for that comparison: **shared JS 102 kB**. Budget: **115 kB**.

The one candidate identified so far is the challenge/decision accordion on the
case-study page, which animates height — a layout property. A CSS
`grid-template-rows: 0fr → 1fr` transition may well handle it. That gets tried
first.

---

## 7. What would make this system a failure

- Every element animated, so nothing reads as emphasised
- Motion on the critical path, so the site feels slower
- A library added for one interaction
- Theme effects stacked, so all three themes look alike
- A robot that roams like a game character
- A Mandala that competes with the text in front of it
- Any claim of "60 FPS" that was not measured
