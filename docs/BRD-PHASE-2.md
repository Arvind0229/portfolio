# BRD — Phase 2

**Status:** G1 (analysis and design), G2 (project data layer and CRUD) and G3
(the public case-study page) complete. G4 onwards not started. The G3 outcome,
including the two gaps carried forward, is in
[`changes/CHANGE-2026-09-15-case-study-page.md`](changes/CHANGE-2026-09-15-case-study-page.md).

**R1 is still open.** The case-study page is built and the depth store is still
`{"projects": {}}`, so on live content every new section renders as nothing —
by design, but nothing all the same. The mitigation below was "Arvind populates
one real project at G3"; that has not happened yet, and the content will not be
invented here.
**Restore point:** tag `pre-phase2-restore-point`, plus a content-verified
filesystem backup (187 files, blob-hash matched, not merely counted).
**Written:** 2026-09-15, against the repository as it actually is. Every claim
below was checked in the code, not recalled.

---

## 1. Objective

Turn the portfolio from a site whose *content* is admin-editable into one whose
*projects* are too, give the deep project detail a public surface it currently
does not have, and give each theme a visual identity distinct enough that a
person could tell them apart with the colours removed.

Non-objective: making the site more animated. Animation that does not improve
hierarchy, feedback, navigation or storytelling is a regression with extra
steps.

---

## 2. Current state — what the inspection actually found

### 2.1 The finding that reframes Phase 2

**`ProjectDepth` feeds the AI assistant and nothing else.**

`grep` for every consumer of `project.depth` returns exactly one file:
`src/lib/ai/knowledge.ts`. The deep detail — scale, systems, challenges,
decisions, timeline, team, failure handling, before/after — is indexed into
retrieval chunks and can be *spoken about by the assistant*. It is never
rendered on `/projects/[id]`, or anywhere else a human can read it.

So "Phase 2 Project Case Study experience" is not an improvement to an existing
page. **The deep content has no public surface at all.** That is the single
largest gap in this phase.

### 2.2 The second finding

```json
// src/data/project-depth.json
{ "$comment": "…", "projects": {} }
```

Empty. The storage, the validator, the API, the admin form and the AI indexing
all work; nobody has filled it in. A richer case-study page built on an empty
store renders empty. Arvind has committed to populating at least one real
project at G3, which is the correct sequencing — the UI gets evaluated against
real content rather than lorem.

### 2.3 What exists, precisely

| Area | Implementation | Admin-editable |
|---|---|---|
| Project list | `src/data/projects.ts` — 5 entries, TypeScript literal | ❌ code only |
| Project detail fields | `ProjectCaseStudy`: problem, solution, technicalView, role, process[], impact[], technologies[], featured | ❌ code only |
| Project depth | `ProjectDepth` + `project-depth.json` + `/api/admin/depth` + panel tab | ✅ (empty) |
| Project URLs | `/projects/<id>`, 5 stable ids, `generateStaticParams` | — |
| Companies / Experience | `companies.json` / `experience.json`, joined in `experience.ts` | ✅ |
| Skills | `skills.json` + `skills.ts` | ✅ |
| Backdrop | `backdrop.tsx` — switches on theme: `NetworkLayer` / `StudioLayer` / `EnterpriseLayer` | ❌ |
| Motion tokens | `--motion-fast 140ms`, `--motion-base 260ms`, `--motion-slow 620ms`, `--ease-out`, `--ease-in-out` | ❌ |
| Per-theme motion intensity | `--motion-scale`: enterprise **0.8**, engineering **1.1**, studio **1.0** | ❌ |
| Scroll reveal | `Reveal` component + `use-in-view` IntersectionObserver + `.reveal` CSS, stagger via `--reveal-delay` | — |
| Keyframes | **51** in `globals.css` | — |
| Robot | `robot-figure.tsx` (static SVG, internally animated parts) + `.robot-peek` 22s cycle | — |
| AI provenance | `KnowledgeChunk`: `kind`, `sourceSection`, `projectId` | — |
| Reduced motion | Two-part check (OS preference AND no `data-motion="full"`), decorative loops removed outright rather than shortened | — |

### 2.4 Themes

Three, and the internal ids do not match the display names:

| id | Display name | Phase 2 target identity | `--motion-scale` |
|---|---|---|---|
| `enterprise` | Enterprise | **Crimson Claymorphism** | 0.8 |
| `engineering` | Midnight | Midnight Blue + robot | 1.1 |
| `studio` | Studio | Studio + generative Mandala | 1.0 |

The `enterprise` **id stays**. Renaming it would invalidate every visitor's
saved preference in `localStorage` and break the E2E theme tests, in exchange
for nothing a visitor can see. Only the display name and the visual system
change.

---

## 3. EXISTING → GAP → CHANGE, per requirement

This is the section §4 of the directive asks for. An existing partial
implementation is a baseline, never a completed requirement.

### 3.1 Studio Mandala

**EXISTING.** `StudioLayer` renders **two** counter-rotating dashed circles
(r=86 and r=58 in a 200-unit viewBox) plus one horizontal rule, at 14% opacity,
in a 30rem box pinned to the top-right corner, over a paper-grain noise
overlay. Rotation is CSS: `ring-turn` at 90s and 64s, one reversed. Both are
explicitly killed under reduced motion (`animation: none`, `rotate: none`).

**GAP.** It is not a mandala and was never meant to be one. A mandala is
radially symmetric nested geometry with a repeated motif around a common axis.
This is two rings and a line. Specifically missing: radial symmetry, any
repeated motif, nesting beyond two levels, generative variation, and placement
as an *environment* rather than a corner ornament. There is no mobile
behaviour — the same 30rem SVG renders at 320px as at 1440px. There is no
density reduction of any kind.

**CHANGE.** Extend `StudioLayer` into a nested radial system — rings, a
repeated petal/tick motif at N-fold symmetry, and coordinated counter-rotation
— drawn with the same technique that is already working (inline SVG, CSS
rotation on `transform`, no canvas, no library, no per-frame JavaScript).
Replace nothing: the existing rings become two of its layers.

### 3.2 Midnight Blue robot

**EXISTING.** A 280-line SVG figure with internally animated parts (float,
eyes, beacon, core, scan, signal). The wrapper runs `.robot-peek`, a 22-second
cycle: tucked at the edge → leans in → glances → leans again → withdraws.
`pointer-events: none`. Suppressed under reduced motion.

**GAP.** Four of the five requested states do not exist. There is no walking,
no hiding-and-returning, no observing, and no state machine — the behaviour is
one fixed CSS loop. It is rendered **only in the hero**, **only at `xl:` and
above** (invisible below 1280px), and **in all three themes**, when the
directive says it is Midnight's character.

**CHANGE.** A small state machine (IDLE → WALKING → PEEKING → OBSERVING →
HIDING) driving CSS custom properties rather than React re-renders, gated to
`data-theme="engineering"`, with defined safe zones. The **existing SVG asset is
reused unchanged** — it can support every requested state, because all of them
are transforms of the whole figure.

### 3.3 Crimson Claymorphism

**EXISTING.** `enterprise` theme: restrained palette, `--motion-scale: 0.8`,
`EnterpriseLayer` renders a single 1px horizon rule with a highlight travelling
along it. Surfaces use `.surface-card` and `.glass`.

**GAP.** No crimson. No clay. Surfaces are flat-bordered, not dimensional.

**CHANGE.** Crimson token set (light and dark designed separately, not
inverted), clay surface treatment via layered `box-shadow`, dimensional card
motion. The backdrop stays the restrained horizon line — **no Mandala**.

### 3.4 Framer-quality motion

**EXISTING.** Tokens, 51 keyframes, IntersectionObserver reveals with stagger,
per-theme intensity, a genuinely careful reduced-motion implementation.

**GAP.** No exit animations. No shared-element/layout (FLIP) transitions. No
spring physics. Card, navigation and button interaction is inconsistent —
present in some places, absent in others.

**CHANGE.** Extend the CSS system first (§14 of the directive). The three
genuinely-missing capabilities are deferred behind a measurement gate, not
assumed.

### 3.5 Project case study

**EXISTING.** `/projects/[id]` renders problem, solution, technicalView, a
5-step pipeline visual, process, impact, technologies, and a next-project link.

**GAP.** `depth` is not rendered. No hero treatment, no metrics, no
architecture or workflow, no lessons learned, no related-projects logic beyond
"the next one in the array", no images, no links.

**CHANGE.** A sectioned case-study page that renders only what has content.

---

## 4. Requirements

### 4.1 Functional

| # | Requirement |
|---|---|
| F1 | Projects become admin-editable content (`projects.json` + validator + accessor + registry entry) |
| F2 | Admin can create, edit, duplicate, delete, reorder, publish/unpublish and feature/unfeature a project |
| F3 | Project ids are derived deterministically from the title, unique, and immutable once created |
| F4 | `ProjectDepth` is extended with the genuinely-missing case-study fields (§5 below) |
| F5 | The public project page renders depth, section by section, showing only sections with content |
| F6 | Projects reference `companyId`, `experienceIds[]`, `skillIds[]`; dangling references degrade, never crash |
| F7 | Project images reuse the Phase 1 upload architecture — no second image pipeline |
| F8 | Each theme gets its own motion identity; the global motion system is shared |
| F9 | Studio gets the generative Mandala; Midnight gets the robot state machine; Crimson gets clay surfaces and **no Mandala** |
| F10 | Project content is indexed for AI with `visibility`, and retrieval respects it |

### 4.2 Non-functional

| # | Requirement | Measure |
|---|---|---|
| N1 | No performance regression beyond an agreed budget | Shared JS ≤ 115 kB (from 102 kB) |
| N2 | Animation stays cheap, and layout is never animated | `transform` / `opacity` are the default. **Crimson Claymorphism may animate `box-shadow`** where depth is the identity — measured, not assumed. No layout property is animated anywhere. |
| N3 | Reduced motion fully honoured | Existing two-part check extended to every new animation |
| N4 | No horizontal overflow at 320/390/430/768/1280/1440 | Measured, per page and per component box |
| N5 | Accessibility does not regress | 0 axe WCAG A/AA violations, all routes, all themes |
| N6 | No new production dependency without a measured case | — |
| N7 | Confidential content never reaches the client bundle, public JSON, or AI retrieval | Test-enforced |

### 4.3 Content classification (directive §17)

Three levels, stored per field group and enforced at two boundaries:

| Level | Examples | Reaches browser? | Reaches AI? |
|---|---|---|---|
| `public` | Project description, technologies, generic workflow, portfolio-safe impact | ✅ | ✅ |
| `internal` | Internal system names, detailed operational implementation, internal URLs | ❌ | ❌ |
| `confidential` | Credentials, tokens, PAN, PII, customer data, financial detail | ❌ never stored | ❌ |

**Confidential is not a storage class — it is a refusal.** Nothing at that level
should enter the repository at all, because this repository is the database and
its history is permanent. The admin form will say so at the point of entry.

For `internal`: the honest engineering statement is that the architecture
**reduces the risk of accidental public exposure**, because internal-marked
fields are filtered before serialization into any page or retrieval chunk, and
a test asserts that. It is not "impossible to leak" — a bug in the filter, or a
field mis-classified by the person typing it, defeats it.

---

## 5. Data model

### 5.1 Reuse map — one source of truth per fact

The directive requires this table before the schema is finalised.

| Fact | Lives in | Status |
|---|---|---|
| Title, category, problem, solution, technicalView, role, process[], impact[], technologies[], featured | `ProjectCaseStudy` | **Reused, authoritative, unchanged** |
| Scale, systems, challenges[], decisions[], timeline, team, failureHandling, before, after, faq[] | `ProjectDepth` | **Reused, authoritative, unchanged** |
| Company name, industry, description, website, location | `companies.json` | **Reused via `companyId`** |
| Designation, dates, employment type | `experience.json` | **Reused via `experienceIds[]`** |
| Skill names and grouping | `skills.json` | **Reused via `skillIds[]`** |

**Nothing above is duplicated into a project record.**

### 5.2 New on the project record

```
id            existing — stays the URL, immutable after creation
companyId     → companies.json
experienceIds[] → experience.json
skillIds[]    → skills.json
year          string, display only
status        'completed' | 'ongoing' | 'maintained'
image         { src, alt, width, height, blurDataURL }  ← Phase 1 photo shape
links         { live?, github?, caseStudy? }   safeUrl-validated
visible       boolean, default true
order         number, lower first
```

Deliberately **not** added: `slug` (the id is the slug), `title`/`description`
duplicates, `technologies` duplicates (already on the case study),
`businessImpact` (that is `impact[]`), `achievements` (that is `impact[]`),
`tags` (that is `category` + `skillIds`).

### 5.3 New on `ProjectDepth`

Extension only — every existing field stays.

| New field | Type | Why it is not a duplicate |
|---|---|---|
| `overview` | string | A paragraph for the case-study page. `businessView` is one line for a card. |
| `businessProblem` | string | The long form. `problem` is the summary. |
| `architecture` | string[] | Components and how they connect. Nothing holds this today. |
| `workflow` | string[] | The runtime sequence. `process[]` is how it was *built*, not how it *runs* — a genuine distinction. |
| `metrics` | {label, value, note?}[] | Quantified outcomes. `impact[]` is prose. |
| `lessonsLearned` | string[] | — |
| `futureEnhancements` | string[] | — |
| `visibility` | 'public' \| 'internal' | Per §4.3. **Record-level for Phase 2** — one setting per project's depth record, not per field. Field-level visibility is not built unless a concrete requirement demands it. |

**Resolved at G1 review:** `integrations` is **not added**. The existing
`systems[]` already means "the applications, databases and interfaces it works
against". It may be reconsidered only if a concrete, documented case shows the
two are different facts.

Rejected from the proposed schema because they already exist:
`solution`, `technologies`, `businessImpact`, `challenges`, `security`,
`performance` (the last two belong in `decisions[]`, which is where trade-offs
already live).

### 5.4 Relationships

```
COMPANY ──< EXPERIENCE ──< PROJECT >── SKILLS
   companies.json   experience.json   projects.json   skills.json
```

Resolved through accessors at build time, exactly as `experience.ts` already
joins company to role. Degradation rules, consistent with ADR-002:

| Broken reference | Behaviour |
|---|---|
| `companyId` missing | Project renders **without** the employer line. Not dropped — a project is worth showing even when its employer record is gone. |
| `experienceIds[]` entry missing | That entry is skipped |
| `skillIds[]` entry missing | That chip is skipped |
| Project referenced by nothing | Fine — projects stand alone |

This differs from ADR-002's rule for roles (where a missing company *drops* the
role) and the difference is deliberate: a role without an employer is
meaningless, a project without one is still a project.

---

## 6. ProjectDetails wireframe

Sections render only when they have content. Nothing renders an empty block.

```
DESKTOP ≥1024px                          MOBILE ≤430px
┌────────────────────────────────┐       ┌──────────────┐
│ HERO                           │       │ HERO         │
│  category · year · status      │       │  category    │
│  Title (h1)                    │       │  Title       │
│  businessView — one line       │       │  businessView│
│  [company] [role] [timeline]   │       │  company     │
│  ─────────────── image/visual  │       │  ┌────────┐  │
└────────────────────────────────┘       │  │ image  │  │
                                          │  └────────┘  │
┌──────────────┬─────────────────┐       ├──────────────┤
│ OVERVIEW     │ METRICS         │       │ METRICS      │  ← moved up on mobile:
│ (2 cols)     │  3 tiles        │       │  scroll row  │    numbers are what a
└──────────────┴─────────────────┘       ├──────────────┤    phone reader stops for
┌────────────────────────────────┐       │ OVERVIEW     │
│ BUSINESS PROBLEM               │       ├──────────────┤
│  before → after, side by side  │       │ PROBLEM      │
└────────────────────────────────┘       │  before      │
┌────────────────────────────────┐       │  ↓ stacked   │
│ SOLUTION                       │       │  after       │
└────────────────────────────────┘       ├──────────────┤
┌────────────────────────────────┐       │ SOLUTION     │
│ ARCHITECTURE + WORKFLOW        │       ├──────────────┤
│  existing AutomationPipeline   │       │ WORKFLOW     │
│  reused, horizontal            │       │  vertical    │
└────────────────────────────────┘       ├──────────────┤
┌────────────────────────────────┐       │ TECH chips   │
│ TECHNOLOGY  chips + skill links│       ├──────────────┤
└────────────────────────────────┘       │ CHALLENGES   │
┌────────────────────────────────┐       │  accordion   │
│ CHALLENGES & DECISIONS         │       ├──────────────┤
│  existing challenge/decision   │       │ IMPACT       │
└────────────────────────────────┘       ├──────────────┤
┌────────────────────────────────┐       │ LESSONS      │
│ IMPACT                         │       ├──────────────┤
└────────────────────────────────┘       │ RELATED      │
┌────────────────────────────────┐       ├──────────────┤
│ LESSONS · FUTURE               │       │ CTA          │
└────────────────────────────────┘       └──────────────┘
┌────────────────────────────────┐
│ RELATED PROJECTS               │  by shared skillIds / companyId,
│  2–3 cards                     │  not "the next one in the array"
└────────────────────────────────┘
┌────────────────────────────────┐
│ CTA — contact / resume         │
└────────────────────────────────┘
```

**Hierarchy decision:** metrics move above the overview on mobile. A recruiter
on a phone scans for numbers; prose below the fold is prose nobody reaches.

**Animation opportunities** (all opt-in to reduced motion): section reveal on
scroll with stagger; metric counters using the existing `use-count-up` hook;
pipeline draw-in reusing `trace-draw`; challenge accordion height — which is a
layout property and therefore the one place a FLIP/shared-element approach
would genuinely help. Noted as evidence for the §3 measurement gate, not as a
reason to install anything yet.

---

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Empty content.** The case-study page is built and stays blank | **High** | Arvind populates one real project at G3 before the UI is judged |
| R2 | Mandala costs frames on low-end phones | High | Static below 430px; measured, not assumed |
| R3 | Robot state machine causes React re-renders every frame | Medium | Drive CSS custom properties from a ref; never `setState` per frame |
| R4 | Crimson light mode fails contrast | Medium | Compute ratios before committing tokens, as was done for the WhatsApp colour |
| R5 | `projects.ts` → `projects.json` loses a field | Medium | Fixture captured from the pre-migration commit, asserted equal — the technique that worked for the company split |
| R6 | Scope. 15 sub-phases in one pass | **High** | Six approval gates; each ends in a report and a stop |
| R7 | Internal-marked content leaks into a chunk | Medium | Filter at serialization; test asserts no internal text in any public page or chunk |
| R8 | Motion library added by reflex | Medium | Measurement gate with a named interaction, per directive §3 |

---

## 8. Out of scope (discovered, not fixed)

Recorded per directive §55. **None of these will be touched in Phase 2.**

- `impact.ts`, `skill-notes.ts`, `automation-flow.ts`, `reporting.ts` remain code-only
- `src/app/loading.tsx` and `global-error.tsx` do not exist
- No offline / network-restored states
- `tests/unit/data-integrity.test.ts` asserts social-link *order*, which will
  fail if an admin reorders them (open defect #12)
- No dirty-state guard when switching admin sections (open defect #13)
- Nothing rebuilds the site after a content save (open defect #14)

---

## 9. Testing and UAT plan

**Automated.** Extend the existing suites; do not start a parallel one.

- Unit: project parser, id derivation, uniqueness, immutability, relationship
  resolution, every dangling-reference case, depth extension parsers,
  visibility filtering, image validation reuse
- API: project CRUD under auth, rate limits, size caps, optimistic concurrency
- E2E: CRUD through the panel, publish/unpublish, feature, reorder, duplicate,
  case-study rendering with partial content, 404 for an unknown id, theme
  switching, reduced motion, the Mandala stopping when leaving Studio, the
  robot appearing only in Midnight
- Accessibility: axe on the new case-study page in every theme

**Browser UAT**, at 320 / 390 / 430 / 768 / 1280 / 1440, in all three themes and
both modes. Screenshots captured and read. Two-session concurrency on the
project store.

**Explicitly not a substitute for human review.** Arvind reviews the running
site at every gate. Automated checks measure overflow and contrast; they do not
say whether it looks right.

**Performance.** Lighthouse has never been run on this project. It will be run
at G6 and the numbers recorded, whatever they say.

---

## 10. Backward compatibility

| Guarantee | How |
|---|---|
| `/projects/<id>` URLs unchanged | Ids are not migrated; `generateStaticParams` keeps reading them |
| Saved theme preferences survive | Theme ids unchanged (`enterprise` stays `enterprise`) |
| Saved font and mode preferences survive | Untouched |
| The AI keeps answering as it does today | `experience` and `projects` accessors keep their existing exported shape |
| Existing admin sections keep working | New sections are added; none are rewritten |

---

## 11. Acceptance criteria

Phase 2 is complete when, and only when:

1. A project can be created, edited, published and reordered from the panel
   with no source-code change, and its URL is stable
2. The case-study page renders every populated depth section and no empty ones
3. Company / experience / skill references resolve, and every broken-reference
   case degrades as specified
4. Each theme is visually distinguishable with colour removed
5. Reduced motion produces a still page, verified by measurement
6. No horizontal overflow at any of the six widths
7. 0 axe WCAG A/AA violations
8. Shared JS ≤ 115 kB
9. No internal-marked content in any public page or retrieval chunk
10. Every existing test still passes
11. **Arvind has reviewed the running site and said so**
