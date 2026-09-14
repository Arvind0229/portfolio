# Change: Resume registry — upload actually replaces the resume

**Change ID:** CHANGE-001 · **Date:** 2026-09-14 · **Phase:** 1 (part 1 of 2)
**Status:** see *Final status* at the foot of this document.

---

## Request

Phase 1 of the admin-controlled portfolio work, with one item called out
explicitly: fix the resume upload/download mismatch, and trace the whole flow
before fixing rather than correcting one path and declaring it done.

## Business objective

Arvind must be able to replace his resume from the admin panel and have visitors
download the new one, without a developer touching source code — and without
losing the previous version.

---

## Current state (before this change)

Traced first-hand, not assumed:

```
Admin upload  → POST /api/admin/resume
              → writer.write('resume')
              → public/resume.pdf                      ← written here

Download btns → profile.resume.pdf
              → '/resume/Arvind-Gupta-RPA-Developer.pdf'  ← read from here
```

Two paths with no connection between them. `public/resume.pdf` **did not exist
on disk**; `public/resume/Arvind-Gupta-RPA-Developer.pdf` did.

### Root cause

Not a wrong string. **The uploader and the renderer each held their own idea of
where the resume lives.** Correcting the constant would have left that condition
intact and the next feature would have broken it again.

The upload path reported `200 {ok: true}` on success, so nothing — not a test,
not the UI, not a log — would ever have surfaced it. It was found by reading the
code, and it had presumably never worked.

### Answers to the verification questions asked

| Question | Before |
|---|---|
| PDF supported? | Uploaded, but to a path nothing linked to |
| DOC/DOCX supported? | **No.** No key, no route path — while the site offered a DOCX download button |
| File validation? | Size + `%PDF-` magic bytes. PDF only |
| Replacement? | Wrote a file; changed nothing visible |
| Active/default resume? | **Did not exist** |
| Rollback to previous? | **Impossible** — one fixed path meant each upload destroyed the one before |

---

## Existing components reused

Per the reuse-before-rebuild rule, nothing here is a new subsystem:

| Reused | How |
|---|---|
| `ContentWriter` (`lib/admin/content-writer.ts`) | **Extended**, not replaced — one new target family, both writers unchanged in shape |
| `parseDepth` validation pattern | **Copied as a contract** — validate and drop, never throw |
| `checkResumePdf` | **Kept intact**; DOCX added beside it, size logic factored out and shared |
| `createRateLimiter` (`lib/security/rate-limit.ts`) | **Reused** — the upload route had none |
| `checkAdminAccess` | Unchanged |
| `Profile['resume']` shape | **Unchanged**, so all three consuming components needed no edit |
| Admin panel, auth, session, TOTP | **Untouched** |

---

## Gap

No single source of truth for "which file is the resume", no version history, no
DOCX support, no rate limit on the upload endpoint.

---

## Solution

A registry — `src/data/resume-registry.json` — is now the only thing that
decides what visitors download.

```jsonc
{ "active": "arvind-gupta-rpa-developer",
  "versions": [ { "id", "label", "pdf", "docx?", "uploadedAt?", "bytes?" } ] }
```

1. **Content-addressed files.** Each upload lands at `/resume/<id>.<ext>` with a
   server-minted id. **Nothing is ever overwritten.**
2. **Rollback falls out for free** — it is repointing `active`. The old file is
   still there, byte for byte. No restore procedure to write or forget to test.
3. **A stale CDN copy cannot serve the wrong resume.** A new upload is a new URL,
   so there is no cache to bust.
4. **`profile.resume` reads the registry** and keeps its shape, so the resume
   section, hero and footer were not modified for this.
5. **Retention is capped at 5 versions**, so the list cannot grow without
   bound. Files already committed stay in git history — see the honesty note in
   `resume-upload.ts` about what this does and does not reclaim.
6. **DOCX is supported**, validated by ZIP magic bytes *plus* the
   `[Content_Types].xml` member every OOXML package must contain — because every
   .docx is a zip but not every zip is a .docx.
7. **A DOCX uploaded for the active version attaches to it** rather than creating
   a second version, so the site can never offer a PDF and a DOCX with different
   content.

### Write ordering, deliberately chosen

The file write and the registry write are **separate commits** — there is no
transaction across the GitHub API. The file goes first:

| | Outcome |
|---|---|
| file ok, registry fails | orphan file nothing points at — harmless, and reported precisely |
| registry ok, file fails | site advertises a download that 404s |

The second reaches a recruiter, so the ordering rules it out.

---

## Alternatives considered

| Option | Rejected because |
|---|---|
| Change `WRITABLE.resume` to the existing filename | Fixes the symptom. Still no versioning, no DOCX, no rollback, and each upload still destroys the previous resume |
| Store the resume as a base64 blob in a JSON file | Bloats the file the site imports at build time, for a binary the browser must fetch separately anyway |
| Keep a fixed path + copy the old file aside on each upload | Two writes either way, and the "aside" copy needs its own naming scheme — which is the registry, arrived at the long way |
| Put uploads in Vercel Blob | A second storage service and a metered one, for files totalling ~75 KB |

## Why this solution

It removes the *condition* that caused the bug (two owners of one fact) rather
than the symptom, and versioning, rollback and cache-correctness all fall out of
the same decision instead of being three more features to build.

---

## Files affected

**New**
- `src/data/resume-registry.json` — seeded from the file actually on disk
- `src/data/resume-registry.ts` — validator + `activeResume()`
- `src/lib/admin/resume-upload.ts` — `mintId`, `applyUpload` (pure, testable)
- `tests/unit/resume-registry.test.ts` — 23 tests
- `docs/changes/CHANGE-2026-09-14-resume-registry.md` — this file

**Modified**
- `src/lib/admin/content-writer.ts` — `WriteTarget`, `targetPath`, `resumeFileTarget`, `mkdir` before local write
- `src/lib/admin/resume-validation.ts` — DOCX support, shared size check
- `src/app/api/admin/resume/route.ts` — format + label, rate limit, two-phase write
- `src/data/profile.ts` — `resume` resolved from the registry
- `src/types/index.ts` — `ResumeVersion`, `ResumeRegistry`; `resume.docx` now optional
- `src/components/sections/resume-section.tsx` — empty states

**Deliberately not modified:** hero, footer, admin panel, auth, session, TOTP.

## API changes

`POST /api/admin/resume` — backwards compatible. Two optional new form fields
(`format`, `label`); omitting them behaves exactly as before. Response gains
`active` and `versions`. New `429` with `retry-after`.

## Security impact

**Improved.**

- Rate limiting added where there was none (20/hour, burst 4/minute).
- The one parameterised path in the system is validated twice: the id is minted
  server-side from the clock and never derived from the uploaded filename, and
  `targetPath` re-validates against `/^[a-z0-9][a-z0-9-]{0,63}$/` regardless.
  Tested with `../`, absolute paths, spaces and over-length ids.
- **Token exposure — verified, not assumed.** Every reference to
  `ADMIN_GITHUB_TOKEN`, `ADMIN_SESSION_SECRET` and `ADMIN_TOTP_SECRET` is in a
  server-only module (checked: none of those files carries `'use client'`); the
  only `NEXT_PUBLIC_` variable in the project is the site URL; and **0 files in
  the built `.next/static` client bundle contain any secret name**. Re-run that
  check with the grep recorded in the session report.
- **Retention is bounded.** `MAX_RESUME_VERSIONS = 5`. The registry cannot grow
  without limit. This bounds the *list*, not the repository: bytes committed to
  git remain in history permanently, which is a property of the storage choice
  in ADR-001 and is recorded there as an accepted cost, not solved here.
- DOCX validation does not trust the extension or the browser MIME type.
- Registry ids are validated on read too, so a hand-edited JSON file cannot
  introduce a traversal path into a rendered `href`.

**Not addressed in this change** (tracked, out of scope): GitHub 409 conflicts
are still swallowed; `NODE_ENV=test` still serves an unauthenticated admin.

## Performance impact

Neutral. The registry is a ~400-byte JSON file read at build time, exactly as
`project-depth.json` already is. No runtime fetch, no new client bundle weight.
Build output unchanged.

## Accessibility impact

The new unavailable state carries `role="status"`, is reachable by keyboard, and
communicates through text rather than colour alone.

---

## Testing performed

Real runs, not assertions about what should happen.

| | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | **Clean** |
| ESLint | **Clean** — no warnings or errors |
| Unit/API suite | **300 passed** (was 277 — 23 new), 0 failed |
| Production build | **Compiled successfully** |
| E2E — see final status | 412 tests, 4 viewports |

### Notable test cases

- The regression itself: what `profile.resume` renders must equal what the
  registry names — the assertion that would have caught the original bug.
- Every URL in the registry is checked to exist in `public/`.
- Path traversal: `../`, absolute, spaces, over-length, `./` — all refused.
- A renamed PDF and a plain zip are both refused as DOCX.
- Rollback: previous versions survive a new upload with their paths intact.

## UAT

| ID | Scenario | Expected | Status |
|---|---|---|---|
| UAT-001 | Site serves the registry's active resume | Download buttons use the active version | **PASS** (unit) |
| UAT-002 | Registry lists only files that exist | No 404 from a download button | **PASS** (unit) |
| UAT-003 | Upload a PDF via the admin panel end to end | New resume becomes active | **NOT EXECUTED** — needs a browser session against a running admin |
| UAT-004 | Upload a DOCX, attaches to active version | One version, two formats | **PASS** (unit) |
| UAT-005 | Roll back to a previous version | Older file still served | **PASS** (unit) — no admin UI for it yet |
| UAT-006 | Resume unavailable renders an honest state | No broken download link | **PASS** (unit + build) |

**UAT-003 and UAT-005 have no admin UI yet.** The API and the data model support
both; the panel still shows only the single upload control. That is the
remaining half of Phase 1.

## Rollback plan

1. `git revert` the commit — the registry, its validator and the route all go
   back together.
2. Or restore the tag: `git reset --hard pre-phase1-restore-point`.
3. Or the filesystem backup:
   `Documents\ArvindPortfolio-backups\backup-20260914-085949-pre-phase1` (152
   files, verified present before any edit).

No data migration, so rollback is a code revert only. The original
`Arvind-Gupta-RPA-Developer.pdf` and `.docx` were never moved or renamed.

## Scope

**Required (done):** registry, upload writes to it, DOCX, validation, empty
states, rate limit.
**Recommended (done):** version history, since it falls out of content-addressed
naming.
**Recommended (not done):** admin UI for version list and set-active.
**Optional (not done, tracked):** deleting old files, PDF page-count validation,
resume download analytics.

---

## Final status

**PASS**, with the scope limits recorded above.

Actually executed on the final code, after every edit including the retention
rule:

```
TypeScript      clean
ESLint          clean, 0 warnings 0 errors
Unit / API      303 passed, 0 failed   (was 277 — 26 new)
Build           Compiled successfully
E2E             409 passed, 3 skipped, 0 failed   (412 across 1440/768/390/320)
```

**Not executed, and not claimed:** Lighthouse; a browser upload through the
running admin panel (UAT-003); any deployment. The resume upload's live GitHub
path remains untested by any automated test — pre-existing defect #7 in
`docs/architecture.md`, unchanged by this work.

**Remaining in Phase 1:** profile / social / skills migration to admin-editable
JSON, the admin UI for resume versions and rollback, the GitHub 409 conflict
fix, and the global loading/error/offline infrastructure.
