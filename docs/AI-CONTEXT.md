# AI context — read this before changing anything

For the next agent picking this project up. `docs/architecture.md` explains how
the system works; this file explains **where the project stands, what has been
decided, and which mistakes have already been made here** so they are not made
again.

**Current phase:** Phase 2. G3 implementation complete (acceptance pending real
content); G4/G5 complete (four themes + motion). G6 not started.
**Last verified:** 2026-09-15.

---

## 1. Orientation in one minute

Personal portfolio for Arvind Gupta, RPA Developer, plus a grounded AI
assistant. Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4,
static build on Vercel.

**Production dependencies: `next`, `react`, `react-dom` and five font packages.
That is the entire list.** No database, no ORM, no auth library, no UI kit, no
animation library, no state manager. This is deliberate and it is the single
most important property to preserve.

The repository is the database. Content lives in `src/data/*.json`, is written
by the admin panel through `ContentWriter`, and is read at build time. No public
page fetches content at runtime.

---

## 2. Where the work stands

| Phase | State |
|---|---|
| CHANGE-001 | Resume registry — versioned, rollback |
| CHANGE-002 | Admin security — bypass, middleware, rate limits, real concurrency |
| CHANGE-003 | Content layer — profile, socials, skills admin-editable |
| CHANGE-004 | Phase 1 gaps — photo, company as an entity, admin entry |
| Phase 2 G1 | Analysis complete, approved |
| Phase 2 G2 | Projects are admin-editable: data layer, CRUD, relationships |
| Phase 2 G3 | `ProjectDepth` gets a public page; visibility; related work by reference |
| **Phase 2 G4/G5** | **Four visual identities, signature isolation, robot state machine, mandala, clay motion** |
| Phase 2 G6 | Not started |

Phase 2 gates: G2 project data + CRUD · G3 case-study page · G4 motion + robot ·
G5 Mandala + Crimson · G6 AI + performance + release.

---

## 3. Decisions a future agent must not silently reverse

| Decision | Where | Why it matters |
|---|---|---|
| Git-as-CMS, no database | ADR-001 | The site depends on nothing that can fail at runtime |
| Company is referenced, not embedded | ADR-002 | A dangling `companyId` **drops the role** |
| Server never decodes an uploaded image | ADR-003 | Header parse only. Do not add `sharp` |
| Project id is the URL; no slug field | ADR-004 | Five live URLs; the id already satisfies every slug requirement |
| A dangling `companyId` on a **project** keeps the project | ADR-004 | Deliberately the opposite of the role rule. A project without an employer is still a project |
| Theme id `enterprise` is not renamed | BRD Phase 2 · CHANGE-006 | Renaming invalidates every saved `localStorage` preference and every `theme-option-enterprise` selector. It displays as "Crimson Clay" |
| A signature visual is isolated by **mount condition**, not CSS | CHANGE-006 | An inactive layer is absent from the DOM, so it cannot animate, hold a timer or reach a screenshot |
| Absent `visibility` means **public** | G3 | The safer-sounding default would have hidden every existing record on the day it shipped |
| Extend `ProjectDepth`; never create a second details store | ADR-004 | The proposed schema duplicated four existing fields |
| A project's id is derived from its title, then frozen | G2 | The admin panel renders it as text, not an input. Editing it breaks a live URL |
| New and duplicated projects start **hidden** | G2 | Publishing is a deliberate act; a half-written project must not appear the moment it is created |
| `publicDepthFor()` is the **only** depth accessor | G3 | An unfiltered getter beside it is an invitation to autocomplete the wrong one onto a public page. A unit test scans `src/app` and `src/components`, comments included |
| Absent `visibility` means **public** | G3 | The safer-sounding default would have hidden every existing record on the day it shipped, which presents as a rendering bug |
| A depth section with no content renders **nothing** | G3 | An empty heading reads as a failed load, and invites filling the gap with something plausible |

---

## 4. Things that are already built and are easy to miss

A `grep` before building is worth more here than anywhere else.

| You might build | It already exists |
|---|---|
| A project details system | `ProjectDepth` + `project-depth.json` + `/api/admin/depth` + panel tab |
| A theme-switched background | `backdrop.tsx` → `NetworkLayer` / `StudioLayer` / `EnterpriseLayer` |
| Motion tokens | `--motion-fast/base/slow`, `--ease-out`, `--ease-in-out` |
| Per-theme motion intensity | `--motion-scale` (0.8 / 1.1 / 1.0) |
| Scroll reveals | `Reveal` + `use-in-view` + `.reveal`, stagger via `--reveal-delay` |
| A count-up animation | `use-count-up` |
| A fourth theme | `clay` exists. `enterprise` is Crimson — the id was kept deliberately |
| A robot state machine | `components/visuals/robot-stage.tsx` — six states, one ref, one timer |
| A mandala | `MandalaLayer` in `backdrop.tsx` — five nested radial layers |
| Clay surfaces | Token-only: `--panel-shadow` and friends. **No section component was edited to get the clay look** |
| Card hover / button press | Already global, applied by element role in `@layer components` |
| A projects store | `projects.json` + `parseProjects` + `relationsFor()` + a registry entry |
| A case-study section component | `components/sections/case-study.tsx` — metrics, overview, mechanics, outcome, related |
| A "related projects" rule | `relatedProjects()` — scored on shared references, best match first |
| A repeated-row admin editor | `PairList` — generic over any `Record<string, string \| undefined>`, so metrics needed no new component |
| An upload pipeline | Resume and photo routes: magic bytes, size cap, content-hash filename, pointer-then-file ordering, rollback |
| Optimistic concurrency + conflict UI | `useContent<T>()` — inherit it, do not reimplement |
| A rate limiter | `createRateLimiter`, separate read and write budgets |

---

## 5. The AI knowledge layer

```
src/data/*  →  buildChunks()  →  knowledgeBase (~50 chunks, module load)
                                      ↓
                              BM25 index (module load)
                                      ↓
visitor question → sanitize → injection check → intent → tool → retrieve
                                      ↓
                    LLM if a key is set, else deterministic extractive composer
                                      ↓
                              output leak filter
```

`src/lib/ai/retrieval.ts` is the most carefully built code in the repository.
Five honesty guards stop it answering about things Arvind has not done. **Do not
refactor it casually.**

`KnowledgeChunk` already carries provenance: `kind`, `sourceSection`,
`projectId`.

**Visibility is filtered upstream, not in retrieval.** `buildChunks()` reads
`project.depth`, which the join already passed through `publicDepthFor()`, so an
internal record never becomes a chunk in the first place. A test in
`tests/unit/project-visibility.test.ts` mounts a fixture and asserts it.

**Open gap for G6.** `buildChunks()` reads `scale`, `systems`,
`failureHandling`, `challenges`, `decisions`, `faq`, `team`, `timeline`,
`before` and `after`. It does **not** read the fields G3 added: `overview`,
`businessProblem`, `architecture`, `workflow`, `metrics`, `lessonsLearned`,
`futureEnhancements`. A visitor can read those on the case-study page while the
assistant says the profile does not cover them — under-claiming rather than
inventing, so it is safe, but it is wrong and it is worth closing.

**`projectId` exists for a specific reason.** Facet chunks carry globally rare
vocabulary ("hardest", "challenge"), so their IDF is enormous, and one
project's difficulty once outranked every chunk of the project the visitor had
named — the compliance bot's story told under the HR automation's name. That
field prevents it. Do not drop it.

---

## 6. Mistakes already made here

Recorded so the next agent does not repeat them. Each cost real time.

| Mistake | Lesson |
|---|---|
| `next dev` and `next start` share `.next` | Run one server at a time, or give each its own `distDir` |
| Stale server found by `fuser`, not `pgrep` | **Kill by port, not by name** |
| `parseSkillGroups` rejected its own output | A save round-trips through the same parser — **it must accept its own output**, and a test now asserts that for every content key |
| Reads shared the writes' rate limit | A limiter a normal screen can trip is not protection, it is an intermittent bug |
| `safeUrl` allowed only https/mailto | Dropped the `tel:` link silently; the footer lost its call action and every test still passed |
| A comment naming env vars in a `'use client'` file | The secret-scan test does not distinguish code from comments, deliberately |
| Unit suite not re-run after the last edit | **Run the suite after the last source change, not the last one that seemed relevant** |
| `process.exit` in a `finally` | Swallowed an exception; a UAT run skipped its last third and reported "0 failed" |
| `waitUntil: 'networkidle'` against a dev server | The HMR socket never settles. Wait for the element |
| Clicking before hydration | The tab exists in SSR HTML before React attaches a handler |
| Screenshotting at 1200ms | Before IntersectionObserver attaches — every shot showed an empty page under the headline and looked like a rendering bug. **Wait for `.reveal[data-visible="true"]`** |
| Moving the robot right | `translate3d(58%, …)` put 76px of document overflow at 1280. The element scan missed it because the wrapper is aria-hidden and the scan skips aria-hidden subtrees — only the document-width measurement saw it. **Every robot X must stay ≤ −50%** |
| "The bulb is flickering" | It was not the bulb. A moving backdrop read through a 3px cord over a translucent header. **Measure the element with the backdrop hidden first** — it was 0 changed pixels every time |
| Styling controls by element type | `button:not([role='tab'])` is not coverage, it is a leak: it reached the bulb, the nav toggle, the search trigger and the theme picker |
| axe scanned mid-fade | Four "serious" contrast failures that do not exist: axe read text at ~12% opacity during a scroll reveal. **Scan under reduced motion**, where this site removes the reveal instead of shortening it |
| Text overflowing a `min-w-0` flex item | The element's box is in bounds and the document still scrolls sideways. `min-w-0` lets the box shrink; it does not make an unbreakable token wrap. Prose needs `break-words` too |

---

## 7. Measured baseline (2026-09-15, after G3)

| | |
|---|---|
| Shared JS | 102 kB (unchanged through G3) |
| Homepage | 153 kB |
| `/projects/[id]` | 109 kB (unchanged through G3) |
| `/admin` | 123 kB (121 kB before G3, 118 kB before G2) |
| Middleware | 33.9 kB |
| Unit + API tests | 459 passing (428 before G3) |
| E2E tests | 437 passing, 3 intentional skips (421 before G3) |
| Accessibility | 0 axe WCAG A/AA violations |
| **Lighthouse** | **never run** |

Phase 2 budget: shared JS ≤ 115 kB.

---

## 8. Rules that are not negotiable

1. **Never fabricate.** Not test results, not metrics, not deployment status.
   If it was not run, say "not executed".
2. **Never invent content about Arvind.** No projects, clients, metrics or
   technologies that are not in the resume or that he has not supplied.
3. **`src/data/reporting.ts` is invented demo data** and is labelled as such on
   the page. Real dashboard figures, employee names, emails, PAN numbers and
   customer data must never enter this repository — its git history is
   permanent.
4. **Validate-and-drop.** Every content parser drops a malformed field and
   never throws. One bad save must not be able to take the site down.
5. **Reduced motion:** remove decorative loops outright, do not shorten them.
   A delayed animation still fires.
6. Before adding a dependency: does existing code solve it? Does the platform?
   The answer has been "no dependency" 100% of the time so far.

---

## 9. Where to look next

| Question | File |
|---|---|
| How does anything work? | `docs/architecture.md` — read first |
| What must not change? | `docs/architecture.md` §8 |
| What is broken? | `docs/architecture.md` §10 |
| Why is it built this way? | `docs/adr/ADR-001` … `ADR-004` |
| What changed and when? | `docs/changelog.md` |
| What is Phase 2? | `docs/BRD-PHASE-2.md` |
| How does motion work? | `docs/MOTION-SYSTEM.md` |
| Why these design choices? | `docs/DESIGN-RESEARCH-PHASE-2.md` |
