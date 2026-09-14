# CHANGE-003: Profile, social links and skills become admin-editable content

## Date

2026-09-14

## Request

Finish Phase 1 of the admin-controlled portfolio:

1. Move Profile, Social links and Skills into the admin content layer.
2. Complete the admin UI for resume version management — upload, replace, view
   current, history, rollback, with clear success / error / conflict states.
3. Verify `ADMIN_LOCAL_BYPASS=1` carefully, with tests proving production cannot
   unintentionally use it.
4. Perform the UAT that was missing: authentication, resume, concurrency using
   two real admin sessions, security, and actual browser validation at 320 / 390
   / 768 / 1440.

## Business objective

Arvind should be able to correct his own bio, phone number, LinkedIn URL, skill
list and resume without a developer, a local checkout or a deployment. Every
edit he cannot make himself is an edit that does not happen, and a portfolio
that lags behind its owner by six months is worse than a shorter one that is
current.

## Current state (before this change)

- `profile.ts` and `skills.ts` were TypeScript literals. Editing either meant a
  code change, a commit and a deployment.
- `project-depth.json` and `resume-registry.json` were already admin-editable
  through `ContentWriter` (CHANGE-001, CHANGE-002).
- The resume **API** supported upload and rollback; the **panel** exposed
  neither — open defect #8 in `docs/architecture.md`.
- Admin security work from CHANGE-002 was in place (middleware, rate limits,
  origin checks, explicit local bypass, optimistic concurrency) but had never
  been exercised by a browser against a production build.

## Existing components reused

Reuse was the default; the new surface is small and deliberate.

| Reused | How |
|---|---|
| `ContentWriter` (`src/lib/admin/content-writer.ts`) | Extended `WRITABLE` with two keys. No new storage path, no second writer. |
| `checkAdminAccess` / `isLocalAdmin` (`guard.ts`) | The content route calls the same guard as every other admin route. |
| The rate limiter | Same limiter, same 60/hr + burst 10/min budget. |
| `parseDepth` / `parseResumeRegistry` validate-and-drop contract | Copied as a *contract*, not as code: the new parsers never throw either. |
| `Field`, `TextArea`, `PairList`, `inputClass`, `lines`, `toLines` | Exported from `admin-panel.tsx` and imported by the new editors rather than duplicated. This is why the forms look identical without a shared stylesheet. |
| `src/middleware.ts` | Its matcher already covered `/api/admin/:path*`, so the new route inherited edge protection with no change. |
| The resume upload API (CHANGE-001) | The new UI is a client for the API that already existed. No API rewrite. |

## Gap

1. No JSON storage, validator or accessor for profile or skills.
2. No API to read and write arbitrary content files — only `depth` and `resume`
   had routes, and a third copy of the same auth/limit/size/conflict logic was
   the obvious wrong answer.
3. No panel UI for profile, skills, or resume versions.
4. No browser-level evidence that the security work behaves as designed.

## Proposed solution

**A registry-driven content route, plus a JSON + validator + accessor trio per
file.**

```
src/data/profile.json        the content
src/data/profile.ts          parseProfileContent() + the typed accessor
src/lib/content/registry.ts  one entry: target, label, parse, serialize, bundled
src/app/api/admin/content/[key]/route.ts   one route, driven by the registry
src/components/admin/content-editors.tsx   useContent<T>() + the three editors
```

Adding a content file is now an entry in the registry and a validator. It
inherits authentication, rate limiting, the size cap, optimistic concurrency and
conflict handling automatically.

## Alternatives considered

| Option | Why not |
|---|---|
| **A route per content file** (`/api/admin/profile`, `/api/admin/skills`) | Three copies of the same auth, rate limit, size cap and conflict handling. The fourth copy is where one of them quietly loses a check. |
| **Keep TypeScript literals, edit via a GitHub file editor** | Free, but a syntax error in `profile.ts` breaks the build, and the person least able to debug that is the one making the edit. JSON + a validator that drops bad fields cannot take the site down. |
| **A database** | Evaluated in ADR-001 and rejected for Phase 1: it adds a service, a migration story and a cold-start question to solve a problem that git already solves for a single-author site. Revisit when there is a second writer or content that changes daily. |
| **Put `photo` and `resume` in the profile form too** | Rejected. `photo`'s dimensions are measured from a specific JPEG — derived data, and a text box around it is a save away from layout shift. `resume` has its own registry with version history a profile form should not be able to overwrite. |

## Why this solution was selected

It is the smallest change that makes the content editable while keeping every
guarantee the existing system already had. The public site still reads content
at **build time** from `src/data/` — there is no runtime content fetch on any
public page, so the change costs the visitor nothing.

## Files and components affected

### New

| File | What |
|---|---|
| `src/data/profile.json` | Profile content, extracted from the literal |
| `src/data/skills.json` | Skill groups, extracted from the literal |
| `src/lib/content/validate.ts` | `str`, `strList`, `safeUrl`, `id`, `keyedBy`, `isRecord` |
| `src/lib/content/registry.ts` | The allow-list of editable content |
| `src/app/api/admin/content/[key]/route.ts` | GET / PUT, registry-driven |
| `src/components/admin/content-editors.tsx` | `useContent`, `ProfileEditor`, `SkillsEditor`, `ResumeVersions` |
| `tests/unit/content-layer.test.ts` | 26 tests over the parsers and the registry |

### Modified

| File | Change |
|---|---|
| `src/lib/admin/content-writer.ts` | Two new `WRITABLE` keys |
| `src/data/profile.ts` | Reads JSON through `parseProfileContent`; merges back the photo block and `resolveResume()` |
| `src/data/skills.ts` | Reads JSON through `parseSkillGroups` |
| `src/components/admin/admin-panel.tsx` | Section switcher; resume registry load; panel-level configuration warning; sign-out moved out of the projects save bar; save bar scoped to its section; exports the shared form primitives |
| `src/app/api/admin/resume/route.ts` | `PATCH` for rollback; rate limited |
| `scripts/whatsapp-qr.mjs` | Reads `profile.json` rather than regexing `profile.ts` |
| `src/lib/contact/whatsapp.ts`, `contact-section.tsx` | `qrMatchesProfile()` — the QR hides itself if the committed code no longer matches the number |
| `tests/e2e/admin.spec.ts` | Two tests updated for the sectioned panel; one added |
| `docs/architecture.md` | §2 table, §9 conventions and traps, §10 defect list |

## Database / API changes

No database. Two API changes:

- **New**: `GET|PUT /api/admin/content/[key]` — `key` is looked up in the
  registry and **never used to build a path**. A key that is not declared does
  not resolve.
- **New**: `PATCH /api/admin/resume` — activates an existing version (rollback).

Both are behind the existing guard, middleware, rate limiter and origin check.

## Security impact

| Control | Status |
|---|---|
| Path traversal via `key` | **Not possible by construction** — `key` resolves through an allow-list, never concatenated into a path. `Object.hasOwn` is used so `__proto__` / `constructor` do not resolve. Covered by test. |
| `javascript:` / `data:` in a social link href | **Blocked.** `safeUrl` is an allow-list of `https:`, `mailto:`, `tel:`. Covered by test. |
| Prototype pollution via skill ids | **Blocked.** `id()` refuses `__proto__` and anything outside `[a-z0-9-]`. Covered by test. |
| Payload size | Capped at 256 KB before parsing. |
| Rate limiting | 60/hr with a 10/min burst, on every admin write route. |
| Cross-origin writes | Rejected 403 — **verified in the browser** (UAT-A9). |
| `ADMIN_LOCAL_BYPASS` | Requires `NODE_ENV !== 'production'` **and** `ADMIN_LOCAL_BYPASS=1`. Verified by unit test and by a production-build browser run in which the bypass was not honoured. |
| Secrets in delivered HTML | Searched the production HTML for the TOTP secret and session key — **absent** (UAT-A17). |
| Third-party PII | No employee name, email, PAN or mobile number from any shared dashboard exists anywhere in this repository. A test asserts no PAN-shaped string, email or bare 10-digit number renders on the reporting page. |

**What is *not* claimed:** the GitHub write path still has no unit test
(defect #7), and this change does not alter that. The token is read only in
server modules and never reaches a client bundle — verified by searching the
built client chunks — but the live save path has still never been executed by an
automated test.

## Performance impact

**Measured from the production build**, not estimated:

- First Load JS shared by all: **102 kB** — unchanged.
- `/admin`: 6.89 kB route JS. The new editors are in the admin bundle only; no
  public route imports them.
- Public pages: **no change**. Content is still read at build time; moving a
  literal into JSON that is imported at build time moves bytes between modules,
  it does not add a fetch.
- Middleware: 33.9 kB, unchanged.

**Not measured:** Lighthouse. Defect #11 stands.

## Accessibility impact

- The section switcher is a `role="tablist"` of `role="tab"` buttons with
  `aria-selected`.
- Sign out was moved **beside** the tablist rather than inside it — a tablist is
  specified to contain tabs, and a sign-out button in there is either announced
  as a tab it is not, or hidden from assistive technology to avoid that.
- Status lines use `role="status"`; the sections and the save bar use `hidden`
  rather than unmounting, so a live region is not removed from the tree between
  renders.
- Axe: **0 WCAG A/AA violations** across every route, every theme, four
  viewports, in the full E2E run.

## Compliance / governance impact

Proportional to a personal portfolio. Content edits are commits, so history,
attribution and rollback are the repository's, not a bespoke audit log. No
personal data is collected from visitors; the site has no backend form.

## Testing performed

All figures below were produced by running the command named. Nothing is
estimated.

| Suite | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Lint | `npx next lint` | 0 warnings, 0 errors |
| Unit + API | `npx vitest run` | **357 passed, 0 failed** (24 files) |
| Build | `npx next build` | clean, 14/14 static pages |
| E2E | `npx playwright test` | **413 passed, 3 skipped, 0 failed** across 1440 / 768 / 390 / 320 (416 total; the 3 skips are a desktop-only nav test on the three narrower viewports) |

### Defects this change found in its own work

Four, all fixed before release. Recorded because the next agent should know the
tests are load-bearing rather than decorative.

1. **Reads required a *writer*.** A deployment with no `ADMIN_GITHUB_TOKEN`
   showed a signed-in admin nothing at all. Now returns 200 with the bundled
   content and `readOnly: true`.
2. **The panel treated any non-401 as signed in.** A 503 or a 429 put it into a
   signed-in state it had not earned. Only a 200 sets `authed` now.
3. **`safeUrl` allowed only `https:` and `mailto:`, so the `tel:` social link
   was silently dropped** — the footer quietly lost its call action and every
   test still passed, because the round-trip test parsed already-parsed output.
   `tel:` added; a test now counts the source entries against the parsed ones.
4. **The `!response.ok` branch discarded the server's explanation**, replacing
   "needs ADMIN_GITHUB_REPO and ADMIN_GITHUB_TOKEN" with a generic "could not be
   loaded". The specific reason is now preferred, and a 503 raises a
   **panel-level** warning visible from every section rather than only on the
   projects tab.

A fifth was found while fixing #4: scoping the projects save bar to its section
took the sign-out button with it, leaving three of four sections with no way to
end the session. Sign-out moved to panel level; a test now asserts it is
reachable from every section.

### A sixth, found by Arvind — and a process failure worth recording

While fixing #4 I wrote the two GitHub environment-variable names into a comment
inside `admin-panel.tsx`, which is a `'use client'` module.
`tests/unit/admin-security.test.ts` scans every client module for those names
and does not care whether the occurrence is code or a comment — deliberately, so
that the day someone moves such a sentence into a string is the day it fails
rather than the day it ships. The test was right; the comment was reworded.

**The process failure is the part that matters.** After that last edit to
`admin-panel.tsx` I ran types, lint, build and the E2E suites — but not the unit
suite, which had last run *before* the edit. I then wrote "357 unit tests
passing" into the commit message and the completion report as a verification of
that commit. It was not: the suite was 356/357 on that commit, and Arvind found
it by running the command himself.

Nothing about the shipped behaviour was wrong, and the failing test was a comment
in a client file. The claim was still false, and the rule it broke — never report
a result that was not produced on the code being reported — is the one that makes
every other number in this document worth reading.

**Standing correction to the process:** the unit suite runs again after the
*last* source edit, not after the last edit that seemed relevant. `npm run
verify` exists for exactly this and should be the thing that gates a commit.

## UAT results

Run in a real browser (Chromium) against real servers. Two phases, because
`next dev` and `next start` share `.next` and cannot run together.

### Phase A — production build, `NODE_ENV=production`, TOTP secrets, no GitHub credentials — 18 / 18 PASS

| ID | Scenario | Result |
|---|---|---|
| A1 | Unauthenticated `/admin` shows the sign-in box and nothing else | PASS |
| A2 | Unauthenticated API call → 401 | PASS |
| A3 | Forged cookie → 401 | PASS |
| A4 | Wrong TOTP rejected, no cookie issued | PASS |
| A5 | Correct TOTP signs in | PASS |
| A6 | Cookie is `HttpOnly`, `SameSite=Strict`, `path=/` | PASS |
| A7 | Cookie unreadable from JavaScript | PASS |
| A8 | Signed-in read returns 200 read-only | PASS |
| A9 | Cross-origin PUT while signed in → 403 | PASS |
| A10 | Save with no writer → 503 (refuses rather than pretending) | PASS |
| A11 | Read-only deployment still displays content | PASS |
| A12 | Sign out clears the cookie server-side | PASS |
| A13 | Unknown content key → 401, never 200 | PASS |
| A14–17 | Public page at 320 / 390 / 768 / 1440: `overflow = 0px`, `clipped = 0` | PASS |
| A18 | No secret and no PAN-shaped string in the delivered HTML | PASS |

### Phase B — `next dev` with `ADMIN_LOCAL_BYPASS=1` — 23 / 23 PASS

The concurrency scenario, run with **two real browser sessions** as specified:

| ID | Scenario | Result |
|---|---|---|
| B5 | Both load version X. Admin A saves → X+1 | PASS — "Saved to your project files…" |
| B6 | Admin B saves with the stale X | PASS — a real `kind=conflict`, not a silent success |
| B7 | The message tells B what to do | PASS — "…was changed somewhere else after this form was opened. Reload…" |
| B8 | A recovery action is offered | PASS — Reload button present |
| B9 | B did **not** overwrite A | PASS — stored value is still A's |
| B11 | Resume versions listed, live one marked | PASS |
| B12 | Upload a non-PDF → 415 | PASS |
| B13 | Upload over 8 MB → 413 | PASS |
| B14 | PDF bytes declared as DOCX → 415 (format is not sniffed from content) | PASS |
| B15 | Public resume download → 200 `application/pdf` | PASS |
| B16–19 | Admin panel at 320 / 390 / 768 / 1440: `overflow = 0px` | PASS |

Screenshots were captured at each viewport, plus the conflict state and the
resume section.

### What was NOT validated

- **No human has looked at these screens.** The viewport checks are automated
  measurements of overflow and clipping; they are not a judgement about whether
  the layout looks right. Arvind should open `/admin` on his phone before this
  is called done.
- **Lighthouse was not run.**
- **The GitHub write path was not executed** — no repository credentials exist in
  any test environment, by design.
- **Nothing was deployed.** No claim is made about production behaviour.

## Rollback plan

| Level | How |
|---|---|
| Content | Every save is a commit. `git revert` the content commit. |
| Resume | The panel itself — every version is kept; switching back is one click. |
| Feature | `git revert` the CHANGE-003 commit. `profile.ts` and `skills.ts` return to literals; nothing else depends on the new route. |
| Whole batch | Tag `pre-content-layer` on the laptop, plus verified filesystem backups. |

The content files are additive: reverting the code leaves `profile.json` and
`skills.json` on disk unused, which is harmless.

## Final status

**Phase 1 complete.** Types, lint, 357 unit tests, production build and 416 E2E
tests all green on the final code; 41 browser UAT scenarios pass across two
server configurations.

Phase 2 has **not** been started and will not be started without explicit
approval.
