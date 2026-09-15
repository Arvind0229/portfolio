# Design research — Phase 2

Principles, not assets. Nothing proprietary is copied: no code, no artwork, no
brand identity. What follows is the reasoning taken from current practice and
the decision it produced *for this project*.

**Read this with the constraint in mind:** the audience is a recruiter or a
hiring engineer looking at an RPA developer's portfolio, often on a phone,
often for under two minutes. Every principle below is filtered through that.

---

## 1. Case-study structure

### What current practice agrees on

Portfolio case-study guidance converges on a small number of points, and the
agreement is more useful than any individual source:

1. **Outcome before process.** The result is what earns the rest of the read.
   A case study that opens with methodology loses the reader before the payoff.
2. **Problem → Approach → Outcome** is the spine. Deviating from it costs
   comprehension without buying anything.
3. **Scannable beats complete.** Headings, short blocks and numbers carry a
   skim; walls of prose do not survive one.
4. **Specific numbers beat adjectives.** "Cut manual effort by 80%+" is
   evidence. "Significantly improved efficiency" is noise.
5. **Say what *you* did.** On team work, the individual contribution is the
   thing being assessed.

### Decisions for this project

- The wireframe (BRD §6) follows the spine, with **metrics lifted above the
  overview on mobile** — a phone reader scans for numbers, and prose below the
  fold is prose nobody reaches.
- `role` already exists on `ProjectCaseStudy` and already says "Sole developer
  — requirement discussions, BRD, build, testing, UAT, deployment and ongoing
  production support." Point 5 is satisfied; it just needs to be *visible* on
  the page.
- A new `metrics[]` field of `{label, value, note?}` exists specifically to
  serve point 4, and the existing `use-count-up` hook animates it.
- **Sections with no content do not render.** A visible empty heading reads as
  a loading state that never finished.

---

## 2. Animation performance

### What the evidence says

The consistent finding across current performance writing is that only
`transform` and `opacity` can be handled entirely by the compositor; anything
that touches layout (width, height, top, left) forces work on the main thread
every frame. Continuous background animation is also a measurable battery cost
on mobile, which is a category of harm that does not show up in a desktop
profiler.

SVG versus canvas is the other live question. The honest summary: SVG is
cheaper and simpler for a small number of shapes that move as wholes; canvas
wins when the element count grows into the hundreds or the drawing is genuinely
per-pixel.

### Decisions for this project

- **The Mandala stays SVG.** Five layers rotating as wholes is exactly the case
  SVG is better at — and it keeps the existing implementation rather than
  replacing it with a canvas loop that would need its own cleanup, its own
  reduced-motion handling and its own resize logic.
- **Rotation only**, no opacity pulsing or scale breathing. Those read as noise
  and cost more than they contribute.
- **Static below 430px.** The battery point decides this: a continuous
  background rotation on a phone is a cost paid by every visitor for an effect
  most of them will not consciously notice.
- Nothing animates a layout property. The one place that would — the accordion
  — gets `grid-template-rows: 0fr → 1fr`, which is transitionable, before any
  library is considered.

---

## 3. Claymorphism

### What current practice says

Claymorphism is soft, inflated surfaces built from layered shadows — typically
one outer drop shadow plus two inner highlights — reading as a raised object
rather than a rectangle with a border.

The criticisms in the same sources are the more useful half:

- It trends **toy-like** quickly. Heavy rounding plus saturated colour plus big
  soft shadows reads as a children's app.
- Its predecessor, neumorphism, **failed on accessibility** — low-contrast
  surfaces where the only affordance was a shadow, which is invisible to a
  screen reader and near-invisible to a low-vision reader.
- Layered soft shadows in **light mode** are where contrast ratios quietly fail.

### Decisions for this project

The directive already names the trap ("avoid toy-like UI, gaming aesthetic,
excessive neon, inflated/bubble-heavy"). Concretely:

| Do | Do not |
|---|---|
| Keep the existing radius tokens | Increase rounding to pill-like |
| Crimson as an accent | Crimson as a surface fill |
| Shadow as *reinforcement* of an affordance | Shadow as the *only* affordance |
| Elevation change on hover | Inflation / bounce |
| Compute contrast before committing tokens | Assume light mode inherits dark's ratios |

And the performance note worth keeping: `box-shadow` does not repaint on scroll
the way `backdrop-filter` does. Clay is the cheaper dimensional idiom. That was
measured in this project earlier, not taken from an article.

**Enterprise's restraint is preserved.** `--motion-scale: 0.8` stays. Crimson
Claymorphism should read as *premium and dimensional*, not as a different
product.

---

## 4. Generative / mandala backgrounds

### Principles taken

- Radial symmetry needs **a repeated motif at N-fold symmetry around a common
  axis**. Concentric circles alone are not it — which is precisely why the
  current `StudioLayer` does not qualify.
- Nested layers rotating at **different speeds and opposite directions** create
  perceived depth without any 3D and without parallax cost.
- Legibility governs. A background that competes with the text in front of it
  has failed regardless of how good it looks in isolation.
- Slow enough to be ambient. The existing 90s and 64s periods are already in
  the right range and are being kept.

### Decisions for this project

Five layers, 12-fold petal symmetry, 24 outer ticks, opacity in the existing
0.10–0.14 band, periods between 64s and 180s, counter-rotating. Centred rather
than pinned to a corner, because an environment is what the theme wants and an
ornament is what it currently has.

---

## 5. Character interaction

### Principles taken

- A character earns attention by being **rare**. Constant presence becomes
  wallpaper; constant movement becomes a distraction.
- Behaviour should read as **intent** — look, pause, react — rather than as a
  loop.
- It must never obstruct content or capture input. `pointer-events: none` and
  `aria-hidden` are the baseline, not the polish.
- Peeking is more interesting than roaming because it implies awareness of a
  boundary. Roaming reads as a screensaver.

### Decisions for this project

- Hidden for 25–60 seconds between appearances. **That the robot is usually
  absent is the design, not a gap in it.**
- Bounded safe zone; never over navigation, CTAs, forms or the chatbot.
- Midnight only. The directive is explicit, and a character that appears in
  every theme is not a theme identity.
- Not rendered below 1280px at all — there is no safe zone on a phone, and the
  current code already makes this choice correctly.

---

## 6. What was deliberately not taken from the research

- **Cursor-following characters.** Reads as a novelty and fails on touch.
- **Scroll-driven parallax backgrounds.** Main-thread cost for an effect this
  audience does not need.
- **Full-bleed hero video / WebGL.** Wrong weight for a portfolio whose value
  is the content.
- **Page-transition curtains.** They make navigation *feel slower*, which the
  directive explicitly forbids.
- **Animated numbers everywhere.** Reserved for the metrics block, where the
  number is the point.

---

## Sources

Consulted for principles only.

- [The Web Animation Performance Tier List — Motion Magazine](https://motion.dev/magazine/web-animation-performance-tier-list)
- [Performance fundamentals — MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Fundamentals)
- [SVG Animation in 2026: Capabilities, Trade-offs, and Best Practices](https://www.adsights.ai/blog/topics/creative-strategy/svg-animation-capabilities-and-best-practices)
- [SVG vs Canvas Animation: What Modern Frontends Should Use in 2026](https://www.augustinfotech.com/blogs/svg-vs-canvas-animation-what-modern-frontends-should-use-in-2026/)
- [The Ultimate UX Case Study Template & Structure (2026)](https://blog.uxfol.io/ux-case-study-template/)
- [UX Case Study Structure: Best Practices & Examples](https://blog.uxfol.io/ux-case-study-structure/)
- [Portfolio UX 2026: structure, components and defensible case studies — UDIT](https://www.udit.es/en/portfolio-ux-2026-estructura-componentes-y-casos-de-estudio-defendibles/)
- [Claymorphism UI design: recipe, examples, guidelines — Setproduct](https://www.setproduct.com/blog/claymorphism-design-guide)
- [Glassmorphism vs Neumorphism vs Claymorphism — Pixso](https://pixso.net/articles/glassmorphism-vs-neumorphism-vs-claymorphism/)
- [Claymorphism vs Glassmorphism: the 2026 battle for UI dominance](https://timgraf.com/ui/claymorphism-vs-glassmorphism-the-2026-battle-for-ui-dominance/)
