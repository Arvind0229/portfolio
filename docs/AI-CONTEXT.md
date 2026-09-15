# AI context — read this before changing anything

For the next agent picking this project up. `docs/architecture.md` explains how
the system works; this file explains **where the project stands, what has been
decided, and which mistakes have already been made here** so they are not made
again.

**Current phase:** Phase 2, gate G2 complete (project data layer and CRUD).
G3 onwards not started.
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
| **Phase 2 G2** | **Projects are admin-editable: data layer, CRUD, relationships** |
| Phase 2 G3–G6 | Not started |

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
| Theme id `enterprise` is not renamed | BRD Phase 2 | Renaming invalidates every saved `localStorage` preference |
| Extend `ProjectDepth`; never create a second details store | ADR-004 | The proposed schema duplicated four existing fields |
| A project's id is derived from its title, then frozen | G2 | The admin panel renders it as text, not an input. Editing it breaks a live URL |
| New and duplicated projects start **hidden** | G2 | Publishing is a deliberate act; a half-written project must not appear the moment it is created |

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
| A projects store | `projects.json` + `parseProjects` + `relationsFor()` + a registry entry |
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
`projectId`. Phase 2 adds `visibility`, and retrieval must filter on it.

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

---

## 7. Measured baseline (2026-09-15)

| | |
|---|---|
| Shared JS | 102 kB |
| Homepage | 153 kB |
| `/projects/[id]` | 109 kB |
| `/admin` | 121 kB (118 kB before G2) |
| Middleware | 33.9 kB |
| Unit + API tests | 428 passing (400 before G2) |
| E2E tests | 421 passing, 3 intentional skips |
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
