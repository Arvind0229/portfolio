# Change log

Every change made to this project from 11 September 2026 onward, newest first.
Each entry says what was changed, **why**, and what was measured afterwards —
not just which files moved.

A backup of the code as it stood before each session's changes is kept under
`Documents\portfolio-backups\portfolio-<date>-<time>` on the laptop.

---

## 2026-09-12 — one search instead of two, a green WhatsApp mark, and a robot that peeks

### Two search boxes became one, in the header

Arvind's question was the right one: *"do jage search wala q diya hai"* — why is
there a search in two places. There was one over the technology chips and one
over the project cards, and the answer was that each had been added where it
was needed without anyone stepping back.

Two boxes for one verb is worse than it sounds. It is not only that the visitor
has to guess which half of the site a word lives in. Each box **only ever knew
about its own section**, so typing "Redshift" into the box beside the project
cards returned nothing — while Redshift sat in the stack two sections down.
That is a false negative about a man's actual experience, produced by the
site's own search, and it is the worst class of bug this project can ship.

**Now:** one icon in the header. Click it (or `Ctrl`/`⌘ K`, or `/`) and a panel
opens over the page with one field that searches **technologies, projects and
sections together**.

Why a panel rather than the field expanding in the header: the results need
somewhere to go. A field that grows sideways in the bar has nowhere to put ten
rows, and a dropdown hanging off a fixed header is clipped the moment the
window is short.

Picking a result:

| Result | Goes to |
| --- | --- |
| a technology | the stack, with every matching chip highlighted |
| a project | that project's own case study page |
| a section | that section |

The stack still filters — it just no longer owns the control that does it. The
term arrives from the palette through a small store (`useSyncExternalStore`,
not context: a provider would have to wrap the whole document and would
re-render every consumer on every keystroke). The filtered state **names itself
and can be cleared**, because a filtered grid with no visible control is a
trap — the visitor comes back later, finds three groups of nine, and has
nothing to click for the rest.

The highlight is deliberately **not** in the URL. A query string on a one-page
site survives in history and in shared links long after it meant anything, and
makes one page look like many to a crawler — the mistake `sitemapRoutes`
already exists to avoid.

**Measured before building, not assumed.** The header comment warned that the
bar had overflowed twice before, so the free space was measured rather than
guessed: 135px spare at 1024 and 278px at 1280, against the 36px the icon
takes. That was with seven nav items; the warning dated from when there were
ten.

Keyboard behaviour is covered by an E2E test, including the step most
implementations skip — **Escape returns focus to the button that opened the
panel**. Without it a keyboard visitor closes the dialog and lands back at the
top of the document, having lost their place.

Matching is deliberately not fuzzy. "Oracle" must not return "OCR". With tens
of entries rather than millions, a fuzzy matcher buys nothing and costs the
visitor their trust in the first wrong answer they see — pinned by a test.

### The WhatsApp mark now carries WhatsApp's green

It used to inherit the theme's text colour, and there was a comment in
`icons.tsx` defending that. The comment gave two reasons; only one of them
still held. Not taking on a brand asset's usage terms is real — so the glyph is
still ours, drawn in the house stroke style. "One green icon would break the
set" was not: in place it just made the mark one more grey shape in a row of
grey shapes, and green is the entire reason people recognise WhatsApp without
reading the label.

One colour does not work for six theme/mode combinations. Measured against
every surface, against the 3:1 WCAG 1.4.11 asks of a graphic that carries
meaning:

| Colour | on dark | on light |
| --- | --- | --- |
| `#25D366` — WhatsApp brand green | **7.95:1** | 1.81:1 ✗ |
| `#128C7E` — WhatsApp's darker green | 3.81:1 | **3.78:1** |

So `--whatsapp` is the brand green in dark mode and WhatsApp's own darker green
in light. It is keyed to `data-mode` rather than to a theme: this green does not
belong to Enterprise or Studio, it belongs to WhatsApp, and the only thing that
changes it is how dark the page is. The axe contrast pass runs over every theme
and mode and is green.

The tile behind the glyph on the contact card stays neutral on purpose. A green
glyph says "WhatsApp"; a green tile in a row of grey ones says "this card
matters more than the others", which is not true — email is the channel most
recruiters use.

### The robot peeks now

It stood at the right margin doing nothing, and after ten seconds the eye stops
seeing it. It now leans in from the edge on a 22-second cycle, holds, glances
the other way, and tucks back — dimmed to 55% while it waits, full strength
while it looks.

**The first version of this was wrong and the suite caught it.** It hid the
figure further right and leaned it in, which made the document 9px wider at
1440. The fix was *not* to trim the number until 1440 passed, because the
geometry says the whole direction is unsafe:

| viewport | room right of the 76rem container |
| --- | --- |
| 1280 | **8px** |
| 1366 | 51px |
| 1440 | 88px |
| 1536 | 64px |
| 1920 | 256px |

Eight pixels at 1280 — one of the commonest laptop widths, and **not one of the
four viewports the E2E projects cover**. A number tuned until 1440 went green
would have passed here and overflowed on a real machine. So the resting pose is
exactly where the figure already sat, with zero overflow, and every frame of
the animation moves left, into the page.

What makes it still read as hiding is the pivot, not the position:
`transform-origin: bottom right`, so the feet stay at the edge and the body
swings in around it — a lean around a doorframe rather than a slide along a
rail.

A new test drives the animation by `currentTime` and sweeps 1280 / 1366 / 1440 /
1536 / 1920, asserting the figure never crosses the right edge at any frame at
any width. That is the test the previous change needed and did not have.

### Note to self: killing the test server

The stale `next start` on port 3100 produced false failures for the **fourth**
time this session — a whole block of tests failing with "element(s) not found"
because the old server was serving a build whose asset hashes no longer
existed, so every stylesheet and script 404'd and nothing had any layout.

`pgrep -f next-server` does not find it; `pgrep -a node` shows nothing at all.
`fuser 3100/tcp` does. **Kill by port, not by process name.**

### Verified

- TypeScript: clean
- ESLint: clean
- Production build: clean
- Unit / API: 277 passed (was 262)
- E2E: 409 passed, 3 skipped, 0 failed (412 across 1440 / 768 / 390 / 320)

### Not done

- No Lighthouse run. Still never executed by the agent, here or anywhere.
- The robot peek was not measured for compositor cost; it is `transform` and
  `opacity` on two elements, which is the cheap path by construction, but no
  frame timings were taken.

---

## 2026-09-11 (evening) — the search control, and a WhatsApp button on the resume

### The search box

Reported as "wrongly placed", and the screenshot showed why: a permanently-open
input sitting between the expertise cards and the stack cards, left-aligned
with nothing beside it. It belonged to neither grid. The row it lived in used
`justify-between` with a single child, so the alignment did nothing.

It is also the wrong weight. Most visitors read the groups; only a recruiter
with a job description in hand types a word. A control that is always open
claims the space of a primary action while being a secondary one.

**Now:** an icon that opens into a field, on a row with a heading that names
what the search searches, above the grid it filters.

The parts that are easy to get wrong, and were not skipped — the collapsed
state is a real `button` with a real label; the expanded state is a real
`input` with a real `<label>`; focus moves into the field on open; Escape
closes it; and it collapses on blur **only when empty**, because closing a
field that still holds a query throws away the filter whose results the person
is reading.

The open animation is `clip-path` and `opacity`, not `width`. Animating width
relayouts the row every frame and pushes the heading beside it around.

### The phone problem, which was separate

The old field carried `min-w-[15rem]` — 240px it could not go below. On a 320px
screen that is a box wider than the space it has, and the placeholder inside it
was clipped. It is `w-full` below `sm` now and a fixed width above.

`type="search"` also became `type="text"`: the search type adds a
browser-drawn clear button in a style no theme here can reach, and on iOS it
reserves space the placeholder then has to fit around. The clear button is
drawn here instead, so it matches.

**Pinned by a test** that opens the field at every viewport, asserts it is never
wider than the screen, and asserts `scrollWidth` does not exceed `clientWidth`
— which is what "the placeholder is cut off" actually is.

### The WhatsApp button on the resume

Asked for as a logo beside the resume with an animation on click. It was a line
of text before; it is an icon button in the row with the downloads now —
outlined and icon-only, so it reads as a third way to act rather than competing
with the two downloads the panel exists for.

The press draws a ring that expands and fades, on `:active`. That is feedback
for a click which hands off to another application: WhatsApp takes a moment to
open, and without a response the button looks like it did nothing and gets
pressed twice. The ring is on a pseudo-element, so the button's own size never
changes — a control that grows under the finger moves the thing you are aiming
at.

### Verified

262 unit and API tests. **397 end-to-end across four viewports, 3 skipped, 0
failed** — up from 389, the new ones covering the search opening, focusing,
closing on Escape, keeping a query on blur, and fitting a 320px screen.

---

## 2026-09-11 (later still) — hairlines flickering: three of them, one fault

### The fault

A hairline positioned on a **half-pixel** is antialiased slightly differently
on each repaint. The ambient background animates continuously, so those regions
repaint constantly — and the line shimmers for as long as the page is open.

Two ways to land on a half-pixel, both present:

- **A 1px box centred with `translateX(-50%)`** inside a 3px parent.
- **A 1px box centred by flexbox or `mx-auto`** inside a parent of even width:
  1px centred in 44px sits at 21.5.

### The three places

| Where | How it was centred | Notes |
| --- | --- | --- |
| The braid on the bulb's cord | `left: 50%` + `translateX(-50%)` in a 3px box | fixed first |
| **The chain above the brass knob** | flexbox, in a 44px button | **the one Arvind pointed at** |
| The phone-layout rail in the hero graph | `mx-auto` | found by looking for the rest of the class, not reported |

The first fix went to the cord because that is where "the string" seemed to
point. It was the wrong one — the screenshot showed the *knob*, and the line
inside it. Both were real; only the second was the complaint.

### The fix, applied identically in all three

A box with width to land on (3px), carrying the hairline as a **background
stripe** — `background-size: 1px 100%`, centred. A background is rasterised
with the element that owns it, so there is no separate box to misalign and no
transform to round. The stripe cannot drift from its parent because it is not
positioned against it.

The hero rail needed its resting colour moved out of a Tailwind `bg-` class and
into the same rule, so both its layers — the travelling charge and the rail it
travels along — are described together. Its keyframes now name the position of
**both** layers at every step: a `background-position` shorthand that lists one
layer resets the other, which would have parked the rail.

### Everything else with a hairline was checked and is fine

`w-px` / `h-px` elsewhere is either full-width (`inset-x-0`, `w-full`, where the
horizontal position is the parent's own) or offset by a whole number of pixels
(`left-8` = 32px, `left-[0.4375rem]` = 7px). No other element combines a 1px
dimension with fractional centring.

### Verified

262 unit and API tests, 10 dev-server checks, and the full end-to-end run below.
**The pixel measurement was still not taken** — the region contains the animated
background, so counting changed pixels there measures the backdrop as much as
the hairline, and the harness written for it kept failing on clip geometry. The
cause is named and removed; the confirmation is Arvind's eye.

---

## (superseded note) the first pass, cord only

Reported as flickering "kab se" — for a long time, which fits: it was there from
the first build.

The cord is a 3px strand. The braid on it was a **separate 1px-wide span**
placed with `left: 50%` and `translateX(-50%)`. In a 3px box that lands on a
half-pixel, and a half-pixel hairline is antialiased slightly differently on
each repaint. The ambient background animates continuously, so that region
repaints constantly — and the line shimmers for as long as the page is open.

Fixed by removing the element rather than nudging it. The braid is now a
background layer on the strand itself (`background-size: 1px 100%`, centred),
so there is no separate box to misalign and no transform to round: the stripe
is rasterised with the element that owns it.

**Not measured.** The obvious experiment — count changing pixels in the cord
region before and after — is confounded by the animated background behind it,
and the harness written for it kept failing on clip geometry. The cause is a
known one and the fix removes it outright, but the number that would prove it
is not in hand, and saying so is better than quoting one that means nothing.

262 unit and API tests, 25 e2e on the accessibility and responsive specs.

---

## 2026-09-11 (later) — WhatsApp contact, and a QR that scans to the chat

### Asked

A "free WhatsApp API" seen in a reel, so visitors can message his number; and a
QR code that opens his WhatsApp when scanned.

### What was checked before building anything

Meta's WhatsApp Cloud API exists and is the wrong tool twice over. It is built
for a *business* messaging its customers — the opposite direction — and it is no
longer free in any useful sense: every template message is charged, and since
**1 October 2026** replies inside the 24-hour window are charged too. It also
requires a Meta Business account and verification he does not have.

The other thing that circulates as a "free WhatsApp API" is an unofficial
library (whatsapp-web.js, Baileys) driving a real account. Those break
WhatsApp's terms, and the account at risk of a ban is his personal number.

Neither is needed. `wa.me` **click-to-chat is not an API**: the link opens the
*visitor's* WhatsApp with a conversation to this number already started, and
they send it from their own account. Nothing to authenticate, nothing to pay
for, no server, no dependency, and it falls back to WhatsApp Web on a desktop.

### What was built

- `src/lib/contact/whatsapp.ts` — the link, derived from `profile.phone` rather
  than repeated. A second copy of a phone number is a second thing to drift.
- **Contact section**: a WhatsApp card beside Email and Phone. The same number
  as the phone card, deliberately — a recruiter reading at 9pm will not ring a
  stranger and will send a message. One fact, two costs to act on.
- **Resume panel**: a quiet line under the downloads, because that is the moment
  a question forms. A line rather than a fourth button, so it does not compete
  with the downloads the panel exists for.
- **A QR code**, committed as an SVG and generated by `npm run qr`.
- A themed WhatsApp icon drawn in the same single-stroke style as the rest of
  the set, rather than the official filled green mark — which would be the one
  icon that ignores the theme, and would bring brand-asset terms with it.

### Decisions worth keeping

**The QR is generated at authoring time, not in the browser.** It encodes one
short URL that changes roughly never; drawing it at runtime would ship a
Reed-Solomon encoder to every visitor to compute an identical picture. As a
committed SVG it is about a kilobyte, needs no JavaScript, and still scans off a
printed page. `qrcode` is therefore a **devDependency** — it never reaches the
bundle.

**The QR carries no pre-filled message**, while the buttons do. A QR is scanned
off *someone else's* screen — a laptop at a desk, a slide, a card — and "I saw
your portfolio" is wrong for most of those.

**The QR is hidden below 640px.** You cannot scan your own screen with the phone
you are holding it on, so on a phone it would be a picture that does nothing
while the button beside it already works.

**The code uses `currentColor`**, so one file works across three themes in light
and dark. A black code on a midnight background does not scan.

**A test regenerates the QR and compares it byte for byte with the committed
file.** A stale QR is worse than no QR: it renders, it scans, and it opens a
chat with whoever holds the old number — nobody would notice until strangers
started messaging them. Changing the number in `profile.ts` now fails the suite
with "run `npm run qr` and commit the result". Confirmed by changing the number
and watching it fail.

### Verified

| | |
| --- | --- |
| QR decoded independently with OpenCV, from the PNG **and** from the committed SVG rasterised | both returned `https://wa.me/918291398844` |
| Drift test proven to fail when the number changes | confirmed |
| typecheck / eslint | clean / 0 warnings |
| unit + API tests | **261 passed** (was 252) |
| production build | clean |

### Note for next time

`qrcode` was added to `devDependencies`, so **`npm install` is needed** after
pulling this change before `npm run qr` or the test suite will work.

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

### Also in this change

`next.config.ts` — `allowedDevOrigins` now includes the private network ranges,
so the dev server can be opened from a phone on the same Wi-Fi. That is the only
way to check a touch-scroll fault on the device that has it; an emulated
viewport has the right shape and the wrong scrolling. Dev only — it has no
effect on a production build.

The first attempt at this failed for a reason worth recording: Next printed
`Network: http://172.16.0.2:3000`, which turned out to be the **CloudflareWARP
VPN adapter** with a `255.255.255.255` mask — reachable by nothing. The real
Wi-Fi address was `192.168.1.105`. On a machine with a VPN, the address Next
advertises is not necessarily the one to use.

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
