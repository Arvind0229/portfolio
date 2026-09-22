# Change: verified content, and the G6 scroll journey

## Date

2026-09-21

## Request

Arvind's G6-scroll master prompt plus a corrected factual context about his
work. The factual context was pasted twice; it was read once. Where the prompt
and the facts disagreed, the facts won — see *Conflicts resolved* below.

## Business objective

A recruiter should see what Arvind actually built, in the order a run actually
happens, without a single claim he cannot defend in an interview.

## Current state (before)

- Five case studies, all resume-backed. `project-depth.json` was
  `{"projects": {}}` — the case-study page and the assistant had nothing
  beyond the one-paragraph summaries.
- No PMT, Digio, DRR Collection MIS or reconciliation *project* existed on the
  site. The word "reconciliation" appeared in four places as framing: the
  reporting showcase, three skill notes, and one runtime step label.
- No scroll-linked motion. Midnight had no warm accent.

## Conflicts resolved

| The prompt said | The facts said | Done |
|---|---|---|
| Loan Automation case study, with OCR / AI | No loan-automation project in the facts; "do not invent OCR" | **Not built.** The second storyboard slot is the manpower workflow, which has eleven confirmed steps |
| Storyboard: "UiPath workflow appears" | Primary tool is TruBot; UiPath is basic | Storyboard shows the TruBot workflow. UiPath stays in skills, labelled Basic |
| Verified figures: 36, 580, 144, 72, 3, 13 only | Resume and site say 80+ automations and 80%+ effort reduced | **Left unchanged.** Arvind was asked and gave no preference. Changing the site and not the resume PDF would make the two disagree, which a recruiter notices. Open item for him |
| User ID automation is API-based | Resume says front-end / recorder | Both shown. Open item for him to confirm |
| Proposed Midnight palette (`#050A12` …) | "Validate against existing" | Existing Midnight tokens kept; only the amber accent is new |

## Existing components reused

| Reused | Instead of |
|---|---|
| `project-depth.json` + `publicDepthFor()` | A second content store for the storyboard. It reads the same record the case-study page renders |
| `case-study.tsx` sections | Any new case-study layout. The new depth records render with no component change |
| `projects.json` validate-and-drop parser | Hand-edited TS. Every new project went through the parser and the data-integrity tests |
| The skills data as the technology whitelist | Loosening the "only known technologies" test. One skill was added because Arvind confirmed it |
| `LinkButton` | A new button. It gained one optional prop |
| The reduced-motion allow-list | A second suppression mechanism |

**Dependencies added: none.**

## Changed

### Content (P0 — accuracy)

- **Manpower** — `hr-process-automation` retitled *Manpower Tracking & HR
  Reporting Automation*. The id is unchanged, so the URL is unchanged. Depth
  record: the eleven confirmed runtime steps and the four systems they touch.
  The ApplicantDetails CSV step was **not** included — the facts say it is
  unconfirmed.
- **Multi-source MIS** — depth record with the typical flow, explicitly
  labelled as the *typical shape* ("each report runs the subset it needs"),
  the four decisions and two challenges Arvind stated, four lessons.
- **User ID** — ID creation / deactivation APIs added alongside front-end.
- **New LOS Reporting & Dashboard Suite** — new, secondary. 36 reports and
  ~580 field definitions placed in *scale*, not *metrics*: they are scope, and
  Arvind's rule forbids turning scope into impact.
- **AutomationEdge Platform Evaluation & Migration** — new, secondary, status
  *In progress*. 144 / 72 / 3 / 13 in *scale*, and the overview says in words
  that these are planned scope, not volumes and not impact. No vendor names,
  licence detail, internal portals, servers or people.
- **Agentic AI** — not a project card. A new optional profile field,
  `exploring`, rendered in *At a glance* as "Currently exploring", and handed
  to the assistant with the words "as self-learning rather than production
  work". Editable from the admin panel.
- **Reconciliation** — reworded in the reporting showcase (now *compliance
  data*, matching the Compliance Tracking project it illustrates), three skill
  notes and one runtime step label.

Nothing was given a metric. No depth record has a `metrics` field.

### G6-scroll-A (visual)

| Piece | How | Cost |
|---|---|---|
| Amber on Midnight | `--accent-amber`, dark and light. Light only — spine tip, active node, active step. Never text, so no contrast obligation | tokens |
| Journey spine | One 2px line in the left gutter, filled by `animation-timeline: scroll(root)`. `transform: scaleY` — compositor only. Only at ≥1280px | CSS |
| Section nodes | `::before` on each section, lit by `view()` as the section reaches the reading line | CSS |
| Storyboard | `run-storyboard.tsx`, server component. Sticky lead column; the panel grows into place; steps arrive in order; a rail fills; the step at the reading line holds the gold | 0 JS |
| Midnight parallax | The two glows lift away on scroll via the `translate` property, which composes with their existing `transform` drift | CSS |
| Magnetic CTAs | `magnetic-field.tsx`: one document listener, one write per frame, ±6px, mouse only, off under reduced motion. Three hero buttons | ~1 kB |

Every scroll-linked rule is inside `@supports (animation-timeline: …)`. A
browser without it gets the finished state: spine full, every step visible.

### Tests

- `projects-content.test.ts` — the two migration tests asserted **equality**
  with a frozen fixture, which fails on the first legitimate admin edit. That
  was right on migration day and wrong ever after. Rewritten to the invariants
  they protected: the parser is lossless, and no project id that existed at
  migration is lost. Removing a project on purpose still fails, by design.
- `data-integrity.test.ts` — one alias added for the new API skill. The
  whitelist itself was not loosened.
- **Retrieval** — "who else worked on the multi-product MIS" had reached the
  delivery facet only because a project with no depth had so few chunks that
  everything named after it made the top five. Depth added eight chunks and it
  fell out. `else` / `involved` now map to the team vocabulary; "worked" was
  deliberately not mapped (the Kubernetes note in `retrieval.ts`). Delivery
  now ranks first at 12.93 against 7.22 for the next chunk — a margin, not luck.
- New: `run-storyboard.test.tsx` (4), `profile-exploring.test.ts` (2),
  `g6-scroll.spec.ts` (8).

## Files

```
src/data/projects.json                  2 new projects, 1 retitle, 1 technology change
src/data/project-depth.json             4 depth records (was empty)
src/data/profile.json                   + exploring
src/data/skills.json                    + ID Creation / Deactivation API Integration
src/data/skill-notes.ts                 + note for that skill; 3 reconciliation rewordings
src/data/reporting.ts                   reconciliation → compliance data
src/data/automation-flow.ts             step label reworded
src/types/index.ts                      Profile.exploring
src/data/profile.ts                     parser for exploring
src/lib/ai/knowledge.ts                 exploring labelled; delivery facet vocabulary
src/lib/ai/retrieval.ts                 else / involved synonyms
src/components/sections/run-storyboard.tsx   NEW
src/components/visuals/magnetic-field.tsx    NEW
src/components/sections/about-section.tsx    Currently exploring row
src/components/sections/reporting-showcase.tsx  wording
src/components/sections/hero.tsx        three CTAs magnetic
src/components/admin/content-editors.tsx     exploring field
src/components/ui/index.tsx             LinkButton magnetic prop
src/app/page.tsx                        spine, section nodes, storyboard
src/app/layout.tsx                      MagneticField mounted once
src/app/globals.css                     G6-SCROLL block + reduced-motion entries
tests/…                                 see Tests
```

**Not touched:** admin auth, middleware, API routes, `buildChunks()` beyond the
two lines above, the robot, every theme's backdrop except Midnight's two orbs.

## Performance

| | Before | After |
|---|---|---|
| Shared JS | 102 kB | **102 kB** |
| Home first load | 153 kB | **156 kB** |
| `/projects/[id]` | 109 kB | 109 kB |
| `/admin` | 123 kB | 123 kB |

Build measurements. Lighthouse still not run.

## Security

No auth, API or middleware change. No secret in any file. The depth records
contain no names, emails, internal URLs, servers, licence terms or customer
data. **The TOTP secret pasted into chat on 2026-09-18 must be regenerated** —
verified then that it is in no file and no commit.

## Accessibility

Spine, rail and marks are `aria-hidden`. The storyboard is an `<ol>` with an
accessible name. Magnetic pull is mouse-only and never moves focus. Reduced
motion lands every new class on its finished state — asserted in E2E, not
assumed.

### Also fixed: WhatsApp QR invisible on dark themes

Reported with a screenshot. The QR is an SVG loaded through `<img>`, and an
`<img>` cannot see the page's `currentColor` — it resolves to black inside the
file. Black modules on a dark card. It now sits on a white plate in every
theme; dark-on-light is also the only polarity every scanner reads. Verified by
decoding the rendered QR from screenshots of Midnight and Crimson: both decode
to the `wa.me` link.

### E2E

Full run before the final fixes: 470 passed, 11 failed, 15 skipped. Of the 11:
eight were two stale tests from G4 (the surname became one `.surname-wipe`
span; `enterprise` became dark-first) — fixed to keep their intent; one was an
axe run timing out at 1440 under a loaded machine; two were mobile-320 journey
tests. All 11, plus the G6 spec, re-run: **40 passed, 0 failed**.

## Rollback

`git reset --hard pre-g6-scroll`, or revert this commit. The retitled project
keeps its id, so no URL changes either way.

## Open items for Arvind

1. **80+ automations / 80%+ effort reduced** — keep, or replace with "not
   formally measured"? If removed, the resume PDF must change too.
2. **User ID automation** — API, front-end, or both?
3. **Manpower** — is the ApplicantDetails CSV step part of the final build?
4. **Metrics** for any project, if measured.
5. **Regenerate the admin TOTP secret** and set it in Vercel, then redeploy.
