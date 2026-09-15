# CHANGE-004: Phase 1 gap closure — photo, company/experience, admin entry

## Date

2026-09-14

## Request

Four gaps found during Arvind's manual review of the running site:

1. **Theme/Typography overflow** — cards extending outside the panel. Verify the
   fieldset fix and do not change it again unless a regression is demonstrated.
2. **Profile photo** — no way to replace it from the admin panel.
3. **Company + Experience** — company details embedded in each role; must become
   a reusable entity supporting multiple roles per company.
4. **Admin entry** — no way into the panel from the public site. Evaluate TOTP
   vs SMS OTP vs a hybrid before changing authentication.

## Business objective

Every remaining thing on the site that needs a developer to change. A portfolio
that lags six months behind its owner is worse than a shorter one that is
current, and the photo, the employer list and the role history are exactly the
parts that change when a career moves.

## Current state before this change

| | |
|---|---|
| Overflow | Fixed in the previous commit (`e57cf2a`) |
| Photo | `public/profile/arvind-gupta.jpg`, metadata hard-coded in `profile.ts`, no admin path |
| Company | Embedded in each role in a 100-line TypeScript literal |
| Admin entry | `/admin` linked from nowhere; reachable only by typing the URL |

## Existing components reused

No new storage mechanism, no database, **no new dependencies**.

| Reused | How |
|---|---|
| `ContentWriter` | Three new `WRITABLE` keys; a second parameterised file family for photos, mirroring resumes |
| `src/lib/content/registry.ts` | Three new entries — each inherits auth, rate limiting, the size cap, optimistic concurrency and conflict handling |
| `checkAdminAccess`, middleware, rate limiter | Unchanged; the new routes sit behind them |
| `useContent<T>()` | Both career editors are built on it, so the conflict banner and reload action came free |
| `Field` / `TextArea` / `inputClass` | Imported from the panel rather than copied |
| Resume upload route | The photo route is its structural twin: file-then-pointer ordering, `PATCH` for rollback |
| TOTP authentication | **Unchanged.** See below. |

## Gap analysis and what was built

### Photo

`photo.json` registry + `photo.ts` accessor + `/api/admin/photo` + a panel
section. Filenames are content hashes, three versions are kept, the active one
is never pruned. `profile.photo` returns exactly the shape it always did.

### Company and Experience

`companies.json` keyed by id, `experience.json` referencing `companyId`, joined
in `experience.ts`. A dangling reference drops the role rather than rendering a
blank employer, and the panel says so in place. Public sections and the AI
knowledge layer were not touched.

### Admin entry

A link in the footer's last line, same size and colour as the sentence around
it, `rel="nofollow"`.

## Alternatives considered

| Decision | Chosen | Rejected |
|---|---|---|
| Image processing | Browser resizes; server validates without decoding | `sharp` — a native dependency with its own CVE history, to do the one thing (decoding hostile bytes) worth avoiding. ADR-003. |
| Company model | Separate entity, referenced | Embedded per role — duplicates on the second role at one employer, and merges two different standards of evidence into one record. ADR-002. |
| Dangling reference | Drop the role | Blank employer (reads as broken), placeholder (invents a fact), throw (one bad save takes the site down) |
| Authentication | **TOTP, unchanged** | SMS OTP and mobile-as-recovery — see below |
| Admin entry | Always-visible quiet link | A marker cookie showing the link only to browsers that had signed in — rejected as state added to hide a word that gives an attacker nothing |

### Why authentication was not changed

Arvind asked for the three options to be compared before anything was
implemented, and the comparison argued against changing.

| | TOTP (current) | SMS OTP | Mobile + TOTP |
|---|---|---|---|
| Cost | ₹0 | Twilio India ~$0.04/message, plus DLT registration for transactional SMS in India | ₹0 until SMS runs |
| Data held | None | His mobile number, server-side | His mobile number, server-side |
| Failure modes | Lost authenticator | SIM swap, SS7, carrier delivery, vendor breach | Adds SMS as the recovery path — the weakest link becomes the way in |
| Already built | Yes — RFC 6238, verified against the published test vectors, 21 unit tests | New vendor, new dependency, new account | — |

The third option adds nothing: with a single user there is no identifier to
establish. Recovery is already solved — the TOTP secret is an environment
variable Arvind controls, so a lost authenticator is a regenerate-and-rescan,
which is free and strictly stronger than an SMS path.

## Files and components affected

### New

`src/data/photo.json`, `src/data/photo.ts`, `src/data/companies.json`,
`src/data/companies.ts`, `src/data/experience.json`,
`src/lib/admin/image-dimensions.ts`, `src/lib/admin/photo-validation.ts`,
`src/app/api/admin/photo/route.ts`, `src/components/admin/photo-editor.tsx`,
`src/components/admin/career-editors.tsx`,
`tests/unit/photo-registry.test.ts`, `tests/unit/company-experience.test.ts`,
`tests/fixtures/experience-before-split.json`,
`docs/adr/ADR-002-*.md`, `docs/adr/ADR-003-*.md`

### Modified

`src/data/experience.ts` (now a join), `src/data/profile.ts`,
`src/data/skills.ts`, `src/lib/admin/content-writer.ts`,
`src/lib/content/registry.ts`, `src/app/api/admin/content/[key]/route.ts`,
`src/components/admin/admin-panel.tsx`,
`src/components/admin/content-editors.tsx`,
`src/components/layout/footer.tsx`, `src/app/globals.css`,
`tests/unit/content-layer.test.ts`, `tests/e2e/admin.spec.ts`,
`tests/e2e/responsive.spec.ts`, `docs/architecture.md`, `.gitignore`

## Database / API changes

No database. Two new endpoints, both behind the existing guard, middleware,
origin check and rate limiter:

- `POST /api/admin/photo` — upload; `PATCH` — roll back to a kept version
- `GET|PUT /api/admin/content/{companies,experience,photo}` — three new
  registry keys on the existing route

## Security impact

| Control | Status |
|---|---|
| Server-side image decode | **None.** Header parse only — ADR-003 |
| Photo magic bytes / size / dimensions | Enforced server-side; verified by UAT (415/413/422) |
| `blurDataURL` from the client | Bounded: fixed prefix, base64 only, 8 KB cap |
| `facePosition` | Two percentages only — it reaches an inline `style` |
| Company `website` | `safeUrl` — https/mailto/tel only |
| Company `logo` | Site-relative image paths only; an off-site URL is dropped |
| Ids (`companyId`, role id, photo id) | `/^[a-z0-9][a-z0-9-]{0,63}$/`; `__proto__` rejected |
| Photo file paths | Re-validated at target construction and again at path resolution |
| Authentication | Unchanged. Verified still enforced on the new routes (401) |
| Admin footer link | **Explicitly not a security boundary**, and the test says so |

## Performance impact

Measured from the production build: First Load JS **103 kB shared**, unchanged.
Middleware 34.1 kB, unchanged. The photo and career editors are in the admin
bundle only.

Uploaded portraits are resized to 1200px in the browser before upload — the UAT
upload produced 960×1200, smaller than the 1081×1351 original.

One load was **removed**: the career section fetched `companies` twice per
render. Now once.

**Not measured:** Lighthouse. Defect #11 stands.

## Accessibility impact

The photo form requires a description before it will save — refused server-side
with a 400, not merely nudged in the UI, because an empty `alt` is a silent
accessibility regression nothing on the public page would attribute to this
upload.

Axe: 0 WCAG A/AA violations across every route, theme and viewport in the full
E2E run.

## Testing performed

| Suite | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Lint | `npx next lint` | 0 warnings, 0 errors |
| Unit + API | `npx vitest run` | **400 passed, 0 failed** (26 files) |
| Build | `npx next build` | clean, 14/14 pages |
| E2E | `npx playwright test` | **421 passed, 3 skipped, 0 failed** across 1440/768/390/320 |

## UAT results

43 browser scenarios across two server configurations.

**Local-write phase (`next dev`, `ADMIN_LOCAL_BYPASS=1`) — 33/33.** Photo:
current shown, preview before save, the preview *is* the resized blob that gets
stored, save writes a new version, the server derived 960×1200 from the file's
own header, the filename is the content hash, the blur is stored and bounded,
the public page serves the new portrait, the earlier photo is still offered and
rolling back repoints without overwriting. Rejections: a non-image refused in
the browser; 415 for non-JPEG bytes, 422 for a JPEG whose header cannot be read,
413 over 4 MB, 400 with no description, 422 below the minimum size, 429 on a
burst. Career: two lists, a new company added and stored, two roles under one
company both rendering with the company stored once, display order respected, a
dangling reference dropped from the site and explained in the panel, a hidden
role off the site and still in the file. Concurrency with two real sessions: the
second admin is told their copy is stale, offered a reload, and did not
overwrite the first. Every admin section at 320/390/768/1440 with 0px overflow.

**Production phase (`next start`, TOTP secrets, no GitHub credentials) —
10/10.** The footer link is present and no louder than its line, lands on the
sign-in box and never the panel, the new content keys and the photo route both
require a session, no secret and no PAN-shaped string in the delivered HTML, and
the public page fits at all four widths.

### Defects UAT found, and fixed

1. **Saving a list quietly did nothing — and had shipped.** A save round-trips
   through the same parser, and `parseSkillGroups` rejected the bare array the
   panel sends, so saving skills parsed to `[]` and wrote nothing. Silent. The
   existing round-trip test only fed the parser the *file* shape, which was
   never the broken one. Found when the new company editor hit the same wall.
   All three list parsers fixed; a test now asserts every content key survives a
   save.
2. **A rate limiter a normal screen could trip.** Reads and writes shared a
   budget of ten a minute; the career section legitimately makes three requests,
   doubled by React's development double-render. Opening the tab twice was
   refused, with the message "Too many saves in a short time" on a page that had
   saved nothing. Separate budgets now, correct messages, and the duplicate
   `companies` fetch removed.

### Defects in the UAT harness itself, corrected

Recorded because each one first looked like a product failure: an assertion that
ran before client-side navigation finished; `waitUntil: 'networkidle'` against a
dev server that holds an HMR socket open forever; clicks landing before React
hydrated; and — worst — `process.exit` inside a `finally` swallowing an
exception, so a run that skipped its last third still reported "0 failed".

### What was NOT validated

- **No human has looked at these screens.** The viewport checks measure overflow
  and clipping; they are not a judgement about whether the layout looks right.
- **Lighthouse was not run.**
- **The GitHub write path was not executed** — no repository credentials exist
  in any test environment, by design.
- **Nothing was deployed.**

## Rollback plan

Four separately revertible commits: the overflow fix, the photo feature, the
company split, the footer link, plus a fifth for the two UAT fixes. Tag
`pre-phase1-gaps` and a content-verified filesystem backup at
`C:\Users\23403\Documents\portfolio-backup-pre-phase1-gaps` (171 files, checked
against `HEAD` by blob hash, not by count).

Content-level rollback needs no code: photo versions switch in the panel, and
every content save is a commit.

## Final status

Implemented and tested. **Awaiting Arvind's manual review of the running site.**
Phase 2 not started.
