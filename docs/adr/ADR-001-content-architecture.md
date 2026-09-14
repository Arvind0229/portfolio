# ADR-001 — Where portfolio content lives

**Status:** Accepted (2026-09-14, with the amendments recorded at the foot) · **Date:** 2026-09-14 · **Decides:** the storage layer for profile,
skills, social links, projects, ProjectDetails, documents, theme, and uploads.

---

## Correction to my previous plan

In the plan I sent you I wrote that a free-tier database "is asleep; they get a cold
start, or an error page," and applied that to both Supabase and Neon. **That was wrong
about Neon and I am withdrawing it.** Verified today:

| | Suspends after | Resume | Risk to a visitor |
|---|---|---|---|
| **Supabase free** | ~7 days of low activity | **Manual** — someone must click *Resume project* in the dashboard | Real. Site broken until noticed |
| **Neon free** | 5 minutes idle | **Automatic**, a few hundred ms on the next connection | Negligible — a slightly slower first query |

So Option A is more viable than I represented, **provided it is Neon and not Supabase**.
The recommendation below still lands in the same place, but it no longer rests on that
argument, because that argument does not survive checking.

---

## The three options

**A — Managed Postgres (Neon) + an object store for files.**
**B — Git-backed JSON in the repo, written through the existing `ContentWriter`.**
**C — Something already in the codebase or on the platform.**

### Option C, investigated first (your §2 reuse rule)

Three candidates, and only one survives:

- **`src/lib/admin/content-writer.ts`** — already exists, already has a `ContentWriter`
  interface with a local `fs` implementation and a GitHub Contents API implementation,
  already writes one JSON file (`project-depth.json`) and already validates untrusted
  content defensively in `parseDepth()`. **This is Option B's mechanism.** C and B are
  the same answer; B is C generalised from two files to ten.
- **Vercel Edge Config** — right shape (low-latency config reads, no function
  invocation), wrong size. Sized for flags, not for project records. Viable for
  `theme.json` alone; not worth a second storage system for one file.
- **Vercel Blob** — metered beyond a small free allowance, and it solves only uploads,
  not content.

**There is no fourth thing hiding in the codebase.** There is no database, no ORM, no
runtime storage. Production dependencies are `next`, `react`, `react-dom` and five font
packages.

---

## Evaluation

Weighted by what this application actually is: **one author, five projects, a few edits
a month, and visitor reads outnumbering admin writes by many thousands to one.**

| Criterion | A — Neon + blob store | B/C — Git-backed JSON | Winner |
|---|---|---|---|
| **Reliability for visitors** | Page render depends on a DB call at request time | Static file from CDN. **Visitors touch no service that can fail** | **B** |
| **Cold-start / suspension** | Neon auto-resumes in ~300 ms. Supabase does not — manual restore | None. No runtime dependency | **B**, narrowly |
| **Admin update experience** | Save → live immediately | Save → visible in admin at once, live in ~90 s | **A** |
| **Deployment delay** | None | ~90 s Vercel rebuild | **A** |
| **Rollback** | Hand-built: snapshot tables, restore UI, tested restore path | `git revert`. Already works, already tested by every developer alive | **B** |
| **Versioning** | Hand-built audit/history tables | Every save is a commit with a full diff | **B** |
| **Concurrent admin changes** | Postgres handles it properly | Optimistic concurrency via the GitHub `sha`. **Currently broken** — the 409 is swallowed. Must be fixed either way | **A** |
| **Security** | New credentials, connection string, a public network surface to lock down | One GitHub token, already in place, already scoped | **B** |
| **Resume / photo / document uploads** | Postgres cannot store these — **needs a second service** (Blob/S3/Supabase Storage) | Same writer, same token, same commit | **B** |
| **ProjectDetails (confidential)** | Row-level flag — one query away from leaking | Separate file, excluded from the public build. Reduces accidental exposure **subject to verified import and build controls** — see the note below | **B** |
| **Future project additions** | Insert a row | Append to an array | Tie |
| **AI knowledge retrieval** | Query at request time, or cache and re-introduce a delay | Read at build time into the index. Matches how `knowledgeBase` already works | **B** |
| **Scalability** | Millions of records | Comfortable to a few thousand records / ~50 MB of binaries | A, irrelevant here |
| **Maintenance** | Two services, migrations, a connection pool, credential rotation | One token | **B** |
| **Backup / recovery** | Configure and *test* backups | The repo is the backup. Cloned on every machine that has ever pulled it | **B** |
| **Dependency on GitHub/Vercel** | Vercel only | GitHub **and** Vercel — but only for *saving* | **A** |
| **Cost** | ₹0 now; free tiers are a commercial decision someone else makes | ₹0, and no account that can change terms | **B** |

### Failure scenarios, walked through

| If this happens | Option A | Option B |
|---|---|---|
| GitHub is down | Site fine, admin fine | Site fine, **cannot save** |
| Vercel is down | Site down | Site down |
| Database is down / paused | **Site down or degraded** | n/a |
| Bad save corrupts content | Restore from a backup you hope you tested | `git revert`, 10 seconds |
| Credential leaks | DB reachable from the internet | Token can only push to one repo; every write is a signed commit |
| You are locked out of a service | Content is in someone else's system | Content is in a folder on your laptop |

---

## Decision

**Option B/C — git-backed JSON through the existing `ContentWriter`.**

Not because it is free. Because on the criteria that dominate *this* application it is
better, and I want the reasoning to be the record:

1. **Visitors depend on nothing that can fail.** The site stays fully static. A database
   adds a runtime dependency to the read path that this application has no need for —
   content changes a few times a month and is identical for every visitor.
2. **A database does not solve uploads.** Postgres cannot hold the resume, the photo,
   the project images or the logos. Option A is therefore *two* new services; B is zero.
3. **§24 is satisfied by the storage layer rather than by code.** Versioning, diff,
   history and one-command rollback come free. Under A I would be writing and testing a
   restore path — the most important code in the system and the least exercised.
4. **Confidentiality is enforced by exclusion rather than by a flag.** ProjectDetails
   is a separate file that the public build does not import, which reduces accidental
   public exposure compared with a `visibility` column that one bad query can defeat.
   This is **not** an absolute guarantee and must not be described as one: it holds
   only while the import and build controls hold. Those controls are therefore to be
   *verified*, not assumed — a build-output test asserting that no ProjectDetails
   string appears in `.next/static` or in any server-rendered public page, run in CI,
   is part of the phase that introduces the file. Until that test exists, the claim is
   unproven.
5. **It extends what exists**, which is your §2. The writer, the validator pattern, the
   auth and the route shape are already there and already tested.

**What Option A genuinely wins, and I am accepting the loss:** publishing takes ~90
seconds instead of being instant. Mitigations: the admin panel reads through the writer
so you see your own edit immediately, and a Vercel Deploy Hook fires on save so the
build starts at once with real status in the UI.

**Conditions that would reverse this decision** — worth recording so it can be revisited
honestly rather than re-argued:

- Publishing latency becomes unacceptable (you are editing daily, not monthly).
- Content grows past a few thousand records or ~50 MB of binaries.
- A second person starts editing, making real concurrency a daily concern.
- You want visitor-generated data — a contact form, analytics, comments. **A database
  is the right answer the day that exists**, and none of this work blocks it: the
  content layer is an interface, so its implementation can change without touching a
  component.

**Not chosen: Supabase.** If we ever move to A it should be Neon. Supabase's free tier
pauses after ~7 days of low activity and needs a manual restore, which is precisely the
traffic pattern a portfolio has.

---

## Consequences

**Must be built (were not in scope before this ADR):**

- Optimistic concurrency on writes. The `sha` is already sent; the 409 is currently
  swallowed into a generic 502. Two admin tabs silently clobber each other today. This
  is Option B's one real weakness and it is fixed, not tolerated.
- A Vercel Deploy Hook call on save (`VERCEL_DEPLOY_HOOK_URL`), with publish status in
  the UI.

**Verified limits that bound this design:**

- Vercel Hobby: **100 deployments per day**, 100 builds per hour. One admin save = one
  deployment. Not a practical constraint for one author; stated so it is not a surprise.
- Vercel Hobby cannot connect to repositories owned by a GitHub *organisation*. The repo
  is personal, so this is fine — but it blocks moving it under an org later.

**Accepted costs:**

- ~90 s from save to live.
- Binaries in git history are never truly deleted; "delete" means "stop referencing".
  Uploads are size-capped and images re-encoded to keep this bounded.

---

## Sources

- [Supabase — Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Neon — Connection latency and timeouts](https://neon.com/docs/connect/connection-latency)
- [Vercel — Limits](https://vercel.com/docs/limits)


---

## Amendments

**2026-09-14 — after review.**

1. **Wording.** "Leak is structurally impossible" removed. Replaced with a claim
   bounded by the controls that actually enforce it, plus a requirement that
   those controls be verified by a build-output test rather than asserted.
2. **Binaries are not automatically git-stored forever.** Approval covers
   structured JSON content. Each binary kind is decided on inspection, and any
   kind retained in git carries a size cap, magic-byte validation, a
   server-minted filename, and a stated retention rule. The first such rule is
   `MAX_RESUME_VERSIONS = 5` (CHANGE-001), together with the honest note that it
   bounds the registry and not git history.
3. **Token security verified, not assumed.** Checked 2026-09-14: no secret name
   in `.next/static`, no secret referenced from a `'use client'` module, the only
   `NEXT_PUBLIC_` variable is the site URL. The grep is recorded in
   `docs/architecture.md` §5 so it can be re-run.
4. **Concurrency is a precondition, not a follow-up.** The GitHub 409 must be
   surfaced and handled before further content moves under admin control. Open
   defect #1 in `docs/architecture.md`.
5. **Deploy hook conditions.** When added: the hook URL is a server-only
   environment variable, only an authenticated admin request may trigger it,
   repeat triggers are debounced, a failure to trigger is shown to the admin, and
   **publish status is reported as "requested" unless a completed deployment has
   actually been confirmed.**
