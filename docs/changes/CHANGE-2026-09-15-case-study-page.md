# Change: the public case-study page (Phase 2, G3)

## Date

2026-09-15

## Request

Build the public ProjectDetails / case-study experience on the existing
architecture. Render only sections that hold real content. Keep the approved
reading order — What → Problem → Solution → Role → Technology → Outcome. Keep
metrics prominent on mobile. Derive related projects from shared references
rather than from position in the file. Zero horizontal overflow at 320, 390,
430, 768, 1280 and 1440. Zero axe WCAG A/AA violations. Public depth may enter
retrieval; internal depth must reach neither the page nor retrieval.

Out of scope, and not touched: the robot state machine, Studio Mandala, Crimson
Claymorphism, any animation library, and any global motion rewrite.

## Business objective

`ProjectDepth` has existed since CHANGE-003, has been editable in the admin
panel that whole time, and has been rendered on no page. Its only consumer was
the AI assistant. The deepest writing on the site was therefore answerable by a
chatbot and invisible to the recruiter reading the page — and, predictably,
never written: `project-depth.json` still contains `{"projects": {}}`.

The objective is not a prettier project page. It is to give that content
somewhere to go, so there is a reason to write it.

## Current state before this change

| | |
|---|---|
| `/projects/[id]` | Intro, pipeline diagram, problem / solution / technical blocks, process list, impact, technologies |
| Employer line | The literal string "SBFC Finance Limited, Mumbai", on every case study |
| Next project | `projects[(index + 1) % length]` — adjacency presented as relevance |
| Depth on the page | None |
| Depth in the admin | `scale`, `systems`, `timeline`, `team`, `before`, `after`, `failureHandling`, `challenges`, `decisions`, `faq` |
| Depth in retrieval | All of the above |

## Existing components reused

Nothing in this change is new infrastructure. In order of how much work it
saved:

| Reused | Instead of |
|---|---|
| `ProjectDepth` + `parseDepth` + `project-depth.json` + `/api/admin/depth` | A second project-details store (rejected in ADR-004 §3) |
| `Reveal` / `use-in-view` | A scroll-reveal implementation |
| `PairList`, `Field`, `TextArea`, `lines` / `toLines`, `inputClass` | New admin form primitives — metrics fit `PairList` unchanged |
| `Badge`, `PageIntro`, `PageShell`, `surface-card`, `glass`, `card-reactive` | New card and layout styles |
| Motion tokens `--motion-fast/base`, `--ease-out` | New timings |
| Native `<details>` | A JavaScript accordion |
| `relationsFor()` from G2 | A second reference-resolution path |

Dependencies added: **none**. The production list is still `next`, `react`,
`react-dom` and five font packages.

## Gap

Seven fields had nowhere to be written and nothing to render them: `overview`,
`businessProblem`, `architecture[]`, `workflow[]`, `metrics[]`,
`lessonsLearned[]`, `futureEnhancements[]`. `visibility` did not exist. The
depth that *was* writable had no public surface at all.

## Solution

**`src/components/sections/case-study.tsx`** — one new file, exporting four
composed groups (`ProjectMetrics`, `CaseStudyOverview`, `CaseStudyMechanics`,
`CaseStudyOutcome`) and `RelatedProjects`. Every section returns `null` when its
field is absent.

**`src/app/projects/[id]/page.tsx`** — extended, not rewritten. The existing
blocks stay and are still authoritative; the depth groups are interleaved
around them in the approved order. `depth.businessProblem` renders as a second
paragraph under the *existing* "The business problem" heading rather than
getting a heading of its own, because two headings both meaning "the problem"
is worse than one heading with two paragraphs.

**Admin panel** — eight fields added to the existing depth form, using the
existing primitives. Visibility is the first control on the form.

**Visibility** — one record-level switch. `publicDepthFor()` is the only
accessor; the join in `projects.ts` is its only caller; the page and the AI both
read the joined result, so one filter covers both.

**Related work** — `relatedProjects()` scores shared skills (×4), shared roles
(×2), same category (×2) and same company (×1), ties broken by display order,
and returns best match first.

## Alternatives considered

| Alternative | Why not |
|---|---|
| A new `ProjectDetails` component tree | ADR-004 §3. Four of the proposed fields already existed |
| A separate "full case study" route under the summary page | Two URLs for one project, and the one that gets shared would be the thin one |
| Field-level visibility | Forty switches nobody re-checks. One record-level switch, per ADR-004 §5 |
| Keeping the unfiltered `depthFor()` accessor beside the filtered one | An API that fails silently in one direction. Removed — see below |
| Absent `visibility` meaning internal | Would have hidden every pre-existing record on the day it shipped |
| A JS accordion for challenges and decisions | `<details>` works before hydration, is keyboard-operable for free, and needs no reduced-motion rule |
| Truncating long tokens, as the Projects section does | Right for an address, wrong for prose. These wrap instead |

## Files and components affected

```
src/types/index.ts                        ProjectMetric; seven fields + visibility on ProjectDepth
src/data/project-depth.ts                 parse the new fields; asMetrics; publicDepthFor; depthFor removed
src/data/projects.ts                      join through publicDepthFor; relatedProjects ranked, not display-ordered
src/components/sections/case-study.tsx     NEW — the public surface
src/app/projects/[id]/page.tsx            wired in; employer from the company reference; related work by reference
src/components/admin/admin-panel.tsx      eight fields; visibility select; "filled" dot ignores visibility
tests/unit/project-depth-extension.test.ts NEW
tests/unit/project-visibility.test.ts      NEW
tests/component/case-study.test.tsx        NEW
tests/e2e/case-study.spec.ts               NEW
docs/adr/ADR-004-project-architecture.md   status Accepted; "As built (G3)" section
```

## Database / API changes

None. `project-depth.json` gains optional keys; `/api/admin/depth` is unchanged
because the registry and the parser already carry the contract. No new route,
no new write path.

## Security impact

- One accessor decides visibility, and it is the only one. `depthFor()` was
  written, then deleted: an unfiltered single-record getter next to a filtered
  one is an invitation to autocomplete the wrong one onto a public page, and
  nothing would have failed loudly.
- A unit test scans `src/app` and `src/components` for any reference to the raw
  store, comments included. The scan does not distinguish code from prose,
  deliberately — a test that trusts itself to tell them apart is a test that can
  be talked out of failing. It caught a doc comment during this change.
- A second test mounts a two-record fixture — one public, one internal — and
  follows it through the real join and the real chunk builder, asserting that no
  string from the internal record appears in any retrieval chunk.

**What that establishes:** on this commit, a record marked internal does not
reach the rendered page or the retrieval set. **What it does not establish:**
that confidential material is safe here. The file is committed to git either
way and git history is permanent. Credentials, PAN, PII and customer data must
not be written into this repository at all, and no code in it can make that
true. The admin form says so on screen when internal is selected.

## Performance impact

Measured from `next build` on this commit, against the G2 baseline:

| | Before | After |
|---|---|---|
| Shared JS | 102 kB | 102 kB |
| `/projects/[id]` First Load | 109 kB | 109 kB |
| `/admin` First Load | 123 kB | 123 kB |
| Middleware | 33.9 kB | 33.9 kB |

Unchanged, which is what a server component built from existing primitives
should cost. Phase 2 budget is 115 kB shared. No client component was added and
no JavaScript ships for the new sections — `<details>` is the browser's.

## Accessibility impact

0 axe WCAG A/AA violations, measured at 390px and 1440px against a build with
every depth section populated, scanned under reduced motion. Sections are
`<section>` with headings; metrics are a list with an `sr-only` heading;
disclosures are native `<details>`; operating facts are a `<dl>`.

The first version of the measurement reported four "serious" contrast failures.
They were not real: axe was reading elements mid-fade during the scroll reveal
and computing the blended colour of text at about 12% opacity. The harness now
reloads under reduced motion — where this site removes the reveal rather than
shortening it — so the colours axe reads are the colours a person sees. The
failure was in the instrument, and it is recorded here because the first
instinct was to "fix" the page.

## Compliance / governance impact

Proportional to a personal portfolio. Visibility is one documented switch with
one enforcement point and two tests. The admin form states in plain words what
internal does and does not protect.

## Testing performed

| Suite | Result |
|---|---|
| `tsc --noEmit` | clean |
| `next lint` | no warnings or errors |
| Unit + component + API | **459 passed** (428 before) |
| E2E | see the release note below |
| `next build` | successful |

New tests: 31. Parser acceptance and drop behaviour for all seven fields;
metrics requiring both halves; visibility defaulting and round-tripping;
`relatedProjects` self-exclusion, limit, uniqueness and reference-sharing; the
source scan; the end-to-end internal-record exclusion; eleven component tests
covering the populated, partial and absent cases; four E2E covering the
unpopulated page, the employer reference and related-work correctness at four
viewports.

## UAT results

Against a build with every depth section populated by a throwaway fixture. The
fixture is not committed; the depth store was restored in a `finally` and
verified to contain `{"projects": {}}` afterwards.

Horizontal overflow, `/projects/compliance-tracking`:

```
   320px   document 0px   worst element 0px
   390px   document 0px   worst element 0px
   430px   document 0px   worst element 0px
   768px   document 0px   worst element 0px
  1280px   document 0px   worst element 0px
  1440px   document 0px   worst element 0px
```

The first run of this measurement found **57px of document overflow at 320px**,
with no single element's box out of bounds — the signature of text overflowing
a flex item that has already shrunk to `min-width: 0`. The cause was an
unbreakable token in the fixture's architecture list
(`unbreakable/token/that/cannot/wrap/anywhere`), which is not an artificial
case: `LMS_DISBURSEMENT_TRANSACTION_DETAIL` and a UNC path are exactly what gets
typed into a systems or architecture list. Fixed with `break-words` on the
text-bearing elements — wrapping, not truncation, because this is prose.

Section order at 390px, top offset in px:

```
  cs-metrics          631      cs-challenges      3418
  cs-overview        1315      cs-before-after    4313
  cs-problem         1495      cs-lessons         4622
  cs-architecture    2499      cs-future          4750
  cs-workflow        2710      cs-faq             4878
  cs-facts           2922      cs-related         5027
```

Metrics sit above every paragraph, within the first screen on a 390×844 phone.

## Regression testing

Full E2E suite before the change: 421 passed, 3 intentional skips. After: the
responsive, accessibility, journey and admin suites all re-run — see the
release note. Unit suite grew from 428 to 459 with no failures and no changes to
existing assertions.

## Rollback plan

`git revert` of this commit. The six modified files are additive: the schema
gains optional keys, and `parseDepth` drops unknown ones, so a depth record
written after this change remains valid under the previous code minus the new
fields. No data migration to undo, no URL changes, and the depth store is empty
in any case.

## Known gaps carried forward

1. **No real case study is populated.** The content must come from Arvind; it
   will not be invented here. A fill-in template is in the release note.
2. **The new fields are not in retrieval.** `buildChunks()` reads `scale`,
   `systems`, `failureHandling`, `challenges`, `decisions`, `faq`, `team`,
   `timeline`, `before` and `after` — not the seven added here. So a visitor can
   read them on the page while the assistant says the profile does not cover
   them. Wrong, but wrong in the safe direction: it under-claims rather than
   invents. Tracked for G6, where chunking is being worked on anyway, and pinned
   by a test so it is a known boundary rather than an assumption.

## Final status

Implemented, built, tested and measured. Not released: G3 ends at this
document, and deliverable "one real populated case study" is blocked on
content.
