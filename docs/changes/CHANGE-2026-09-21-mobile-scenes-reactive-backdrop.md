# Change: phone scroll scenes, themed landing, reactive backdrop

## Date

2026-09-21 (CHANGE-009)

## Request

Arvind, after checking the laptop build:

1. On a phone the scroll felt like scrolling past one image after another.
2. The background should move more and react to the mouse. Some mandalas and some bubbles should be bigger.
3. The Midnight robot should move around more.
4. The WhatsApp logo did not read well. He asked for the original logo.
5. The lamp (bulb) flickers on every theme.
6. The landing is dark on every theme, so it only matches Midnight dark.

## Current state (before)

- Below 768px, the mission and build sections fell back to stacked cards.
- The landing and closing sections were hard-coded navy on all eight theme × mode combinations.
- The backdrop drifted slowly and ignored the pointer. Mandalas were 160–260px and bubbles were 5–13rem.
- The robot was off stage 22–46s between appearances and walked at most 130px.
- WhatsApp showed as an outline glyph in brand green.
- The lamp's glows were `filter: blur()` boxes, and the filament used a `drop-shadow` filter.

## Reused, not rebuilt

| Reused | Instead of |
|---|---|
| The existing pinned view timelines (`--cinema`, `--build`) and their keyframes | A second, mobile-only scroll system. The desktop rules now apply at every width, and a phone block only changes the layout |
| The magnetic-field pattern: one `pointermove`, one write per frame, a WeakMap of applied offsets, and the two-part reduced-motion check | A pointer library. `usePointerReaction` in backdrop.tsx follows the same pattern |
| The `translate` / `scale` properties | Rewriting each item's `transform` drift. The reaction composes with the drift |
| The existing WhatsApp glyph | A copy of Meta's artwork. The glyph is drawn white on a solid #25D366 disc (`WhatsAppMark`) |
| The robot state machine | A new animation engine. New timings, a wider walk and one extra state (`hopping`) |

**Dependencies added: none.**

## Changes

- **Phones:** the mission and build sections now pin and play on phones, with the picture above the words and one chapter at a time. The mission picture is revealed from a clipped frame and only ever scaled down. On screens shorter than 740px, the build hides its detail line and shrinks its frame. With reduced motion, or in a browser without scroll timelines, the stacked cards remain.
- **Landing and closing:** these follow the theme everywhere except Midnight dark. `--scene-*` tokens drive the theme's ground (its art shows through), the words use the theme's ink and accent, the picture sits in a framed window (at most 860px, below its 1672px source), and the scroll fade goes to the theme colour. On narrow screens the closing picture moves below the text. Midnight dark keeps the full-bleed night frame.
- **Backdrop:**
  - Every theme reacts to the mouse. Items drift with the pointer by their own depth (parallax), and any item within 240px is pushed away by up to 70px and grows by up to 20%. This is off for touch and reduced motion.
  - Movement is larger and faster:
    - Mandala wander ±12vw, turn in 38–70s.
    - Crimson mandala now wanders as well.
    - Bubble and marble paths are about 2× longer.
  - Sizes:
    - Three Studio mandalas are drawn at 340–400px, up to 1.45× the 280px source. This is a deliberate exception to the no-upscale rule: the mandalas are decoration at 40% opacity and always turning.
    - The Crimson mandala is 380px, 1.27× its source.
    - Marbles are larger but never beyond their own pixels.
    - Three bubbles grew to 15–22rem.
- **Robot:** off stage for only 4–9s. It walks up to 420px (always leftward, so it cannot add page overflow), steps with a lean, sways when idle, and hops.
- **WhatsApp:** a green disc with a white glyph in the hero, résumé and contact card.
- **Lamp:** no filters remain. The glows are plain radial gradients, and `.bulb-layer` gives the lamp its own compositor layer. The headless browser could not reproduce the flicker (0 changed pixels across 12 frames × 4 themes, before and after), so this fix is aimed at the likely cause and is **not verified on real hardware**. Arvind to confirm.

## Testing

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| ESLint | clean |
| Vitest | 470 passed |
| `next build` | OK — shared 102 kB (unchanged), home 157 kB (was 156) |
| E2E mission, G6, journey and flicker specs, 4 viewports | 278 passed, 3 failed. Two failures were a new test not waiting for the backdrop to mount; fixed, and they pass on re-run. One was the portrait-order test at 768px under 3-worker load; it passes alone |
| E2E accessibility, responsive and visual | 140 passed |
| E2E admin | 44 passed |
| E2E assistant, case-study and security | passed (part of the 108 in that run) |
| New tests | Phone pinned layout with exactly one chapter visible; themed landing window; Midnight dark stays full-bleed; backdrop reacts to the mouse; WhatsApp disc colours; lamp has no filters |

Screens were checked at 390×844 (Studio light, Midnight dark) and at 1440 and 1280 (all four themes). No sideways scroll at 390.

## Rollback

`git reset --hard pre-change-009` in the working copy the change was made in. On the laptop, discard the working-tree changes to the files listed in the diff.
