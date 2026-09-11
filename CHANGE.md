# Change log

Every change made to this project from 11 September 2026 onward, newest first.
Each entry says what was changed, **why**, and what was measured afterwards —
not just which files moved.

A backup of the code as it stood before each session's changes is kept under
`Documents\portfolio-backups\portfolio-<date>-<time>` on the laptop.

---

## 2026-09-11 — Blank sections on scroll-back, and slow animation

**Backup taken:** `Documents\portfolio-backups\portfolio-20260911-1815`
(203 files, 2.5 MB, git history included)

### Reported

1. Animation loads very slowly, on desktop and phone.
2. On a phone, scrolling down is slow; scrolling back **up** leaves sections
   blank or half-rendered.
3. The bulb's cord-pull plays on a phone but not on the desktop browser.

### What was actually wrong (two causes, not one)

The first guess — permanent GPU layers — was real but turned out to be only
part of it. Removing every `will-change` took the declaring elements from 104
to **0** and the layer count from 169 to 154, and the fault **did not go away**.
That is why the rest of this entry exists: the measurement contradicted the
hypothesis, so the hypothesis was wrong.

Reproducing it settled it. Scrolling the page *slowly*, all 91 revealed
elements appeared and stayed. Scrolling it *fast*, elements sat at opacity 0,
0.39 and 0.78 while on screen. Nothing was ever lost — the entrance animation
was simply slower than the reader.

| Measured on a 390x844 phone viewport | Before | After |
| --- | --- | --- |
| Elements declaring `will-change` | 104 | **0** |
| Compositor layers | 169 | **147** |
| Layer memory (upper bound) | 181 MB | **137 MB** |
| Upward scroll stops showing unpainted content (of 31) | 6 | **0** |

The memory figure is layer area x 4 bytes — an upper bound, since Chrome tiles
and does not rasterise a whole layer at once. It is useful as a comparison
between the two states, not as a reading of GPU memory.

### Cause A — too many permanent compositor layers

`will-change` tells the browser to promote an element to its own GPU layer
**and keep it there**. It was set in three places, and between them almost
every animated element on the page held a permanent layer:

| Where | Elements affected | Added by |
| --- | --- | --- |
| `.reveal` in `globals.css` | **~91** — every scroll-revealed block on the page | commit `0e7278a` (mine, first build) |
| `.char-rise .char` in `globals.css` | one per letter of the name | commit `e3c93e3` (mine) |
| The two ambient orbs in `backdrop.tsx` | 2, each a very large blurred box | commit `417bfb8` (not mine) |

A phone's GPU memory is finite. Past the limit the browser starts **discarding
layer contents**, and a discarded `.reveal` layer re-rasters from its base
style — which is `opacity: 0`. That is precisely the reported symptom: scroll
away, scroll back, the section is blank. It is not a lost element and not a
failed observer; the element is there, painted empty.

The same crowd of layers is what made everything feel slow.

**The honest reading:** the first two are mine, from the day the site was
built. The third made an existing fault worse rather than creating it.

A fourth layer mattered more than all of them: `div.page-enter`, the wrapper
that holds the entire document, measured **390 x 24628 pixels** as a single
composited layer because its opacity and transform are animated on entry.

### Cause B — the entrance animation was slower than a thumb

`useInView` revealed *late* by design: `threshold: 0.15` with
`rootMargin: '0px 0px -8% 0px'` — a root **shrunk** at the bottom, so an
element only began its 620ms fade once 15% of it had pushed past a line above
the fold. Add a stagger of up to 300ms and the full entrance ran to nearly a
second.

At reading speed that looks considered. A flick covers a couple of thousand
pixels a second down a page 25,638 pixels tall, so the element was still
fading as it left the screen — and on the way back up the visitor met it
half-painted. That is the whole of report 2.

### What was changed

- **`will-change` removed from `.reveal`.** These are *one-shot entrance*
  animations. Browsers already composite an `opacity`/`transform` animation for
  as long as it runs and release the layer afterwards — which is exactly the
  wanted behaviour, and free. The hint only helps an element that is *about to*
  change repeatedly; on ninety-one elements that each animate once, it buys a
  smoother first frame and pays for it with a layer that never goes away.
- **`will-change` removed from `.char-rise .char`** — same reasoning, per
  letter.
- **`willChange: 'transform'` removed from both ambient orbs.** These animate
  continuously, so the browser composites them regardless; the hint was
  redundant and forced the layer even when the animation is not running (under
  reduced motion, for instance).
- **`useInView` defaults inverted** — `threshold: 0.15` to `0`, and
  `rootMargin: '0px 0px -8% 0px'` to `'300px 0px 300px 0px'`. The root is now
  *expanded* rather than shrunk, so an element begins its entrance while still
  off-screen and has finished by the time it is read, in both directions. The
  two components that pass their own values keep them.
- **The stagger is now a multiplier** (`--reveal-stagger`) rather than a raw
  delay, because `--reveal-delay` is set as an inline style and inline styles
  win every specificity contest — a plain override in a media query would have
  been silently ignored.
- **Below 768px the entrance animation is removed entirely**, and `.page-enter`
  with it. Content is simply there.

That last one is the substantive design decision, so it is worth stating
plainly rather than burying. Shortening the animation to a third only halved
the fault, because *any* entrance animation has a window where the content is
not yet painted, and a thumb outruns it. On a 25,000-pixel page scrolled by
flicking, almost nobody sees that animation — and the people who do see it
see it as this bug. Above 768px, where scrolling happens at reading speed,
everything is exactly as it was. One device makes a different trade; nothing
was deleted.

### Cause C — the desktop bulb, which was a real bug after all

The first read was "Windows has reduced motion on, which switches the pull off
by design, and the phone does not". Half right — and it would have been a
complete answer if pressing **Turn animation on** had fixed it. It did not,
and that was a genuine defect.

The CSS honoured the override: the whole reduced-motion block is nested under
`:root:not([data-motion='full'])`, so opting in releases the cord pull. But the
click handler read `matchMedia('(prefers-reduced-motion: reduce)')` on its own
and refused to start the animation, so there was nothing for the CSS to allow.
The button was a lie for the one control it is attached to.

Fixed in `bulb-switch.tsx`: the handler now reads the OS preference **and** the
`data-motion` override, the same pair the stylesheet uses.

An uncommitted change on the laptop had already found this and fixed it the
same way; that fix is kept. The same change also exempted `.cord-yank` and
`.bulb-yank` from the reduced-motion rules in `globals.css`, and that half was
reverted. It is not needed — the block already stops applying wholesale when
the visitor opts in — and it punched two named holes in the one guard that
exists to catch classes nobody remembered to list. That guard was written
because the hero graph's `.flow-*` animations ran unnoticed under reduced
motion for two rounds; narrowing it re-opens exactly that failure.

**A test was added**, because nothing covered this: opt into motion with the OS
asking for less, click the bulb, and assert a `yank` animation is actually
running. The existing test that the pull stays off *without* an override still
passes, so both directions are now pinned.

### Verified

| | |
| --- | --- |
| typecheck | clean |
| eslint | 0 warnings |
| unit + API tests | **252 passed** |
| end-to-end (1440 / 768 / 390 / 320) | **385 passed, 3 skipped, 0 failed** |
| production build | clean |
| Entrance animation still runs at 1440 and 768 | confirmed — `reveal-up`, 0.682s |
| Content unpainted in view, all three viewports, after settling | **0** |
| Lighthouse | **not executed** |
| Checked on Arvind's actual phone | **not done** — measured on an emulated 390x844 viewport in Chromium, which is the right shape but not his device |

---

## Before 11 September 2026

Earlier work is recorded in the git history and in the project documents
(`claude/arvind-portfolio-build.md`, `-motion.md`, `-admin.md`,
`-visuals.md`). This file starts here because that is when it was asked for.
