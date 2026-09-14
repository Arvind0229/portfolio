# Change: Admin security — close the bypass, make concurrency real

**Change ID:** CHANGE-002 · **Date:** 2026-09-14 · **Phase:** 1
**Status:** see *Final status*.

---

## Request

Move six security items out of Phase 7 and into Phase 1, because they affect the
safety of the content architecture being built now:

1. Explicit `ADMIN_LOCAL_BYPASS=1` instead of relying on `NODE_ENV`
2. Admin middleware / edge protection
3. Rate limiting on all admin write routes
4. GitHub 409 optimistic-concurrency handling
5. Verify GitHub credentials stay server-side only
6. CSRF / origin protection for admin writes

## Business objective

Six more content files are about to move under admin control. Every one of them
inherits whatever the admin surface's weaknesses are today, so they are worth
fixing while the blast radius is two files rather than eight.

---

## The decision point: the 409 could never have fired

The request was to handle the 409. Reading the write path first showed the
request was aimed at a symptom of something worse.

```ts
async write(target, content, message) {
  const existing = await fetchMeta(target);   // ← fetches the CURRENT sha
  ...PUT with existing.sha
}
```

The sha sent was always fetched moments before the write, so it was current **by
construction**. GitHub's compare-and-swap therefore always succeeded. The
docblock beside it described the sha as a concurrency check; it was not one.

```
Admin A reads        → sha X
Admin B reads        → sha X
Admin A saves        → writer fetches X, sends X, accepted → file is now Y
Admin B saves        → writer fetches Y, sends Y, ACCEPTED → A's edit is gone
```

Adding a 409 handler would have added a branch for a response that never
arrives. The fix is that **the caller's sha is sent** — the one from the read
the edit was based on — so GitHub arbitrates atomically:

```
Admin B saves        → route sends X, GitHub holds Y → 409 → refused, A survives
```

### Two consequences that had to come with it

- **`read()` returns `{ content, version }`.** A version the caller never saw
  cannot be quoted back, so reads and versions travel together.
- **`write()` returns the new version.** Without it, saving twice from one open
  form would quote the version from before the first save and be refused as a
  conflict with itself — the failure that makes optimistic concurrency feel
  broken rather than protective. Found while wiring the panel, not by a test.

**No merge is attempted.** Two people's prose cannot be merged without guessing
which sentence was meant. The second writer is told, and reloads.

---

## The other five

### `ADMIN_LOCAL_BYPASS` — the widest hole

`isLocalAdmin()` was `process.env.NODE_ENV !== 'production'`. `NODE_ENV` has
three conventional values, not two: **any build running as `test` served a fully
unauthenticated admin panel** to whatever could reach it — a CI job, a staging
box, a container someone forgot to configure. Nothing in the code said so.

Now two conditions, both from the environment, the second typed by a person who
meant it. Near-misses (`true`, `yes`, `0`, `" 1"`) are rejected rather than
treated as truthy, and production ignores the flag entirely.

### Middleware

One edge gate on `/admin` and `/api/admin/*`. It checks that a session cookie is
**present**, not that it is valid — the Edge runtime has no `node:crypto`, so the
HMAC cannot run there. That split is deliberate and documented in the file: this
layer turns "no credential at all" into a 401 without waking a Node function, and
the route still proves authenticity.

**It does not replace the per-route checks** and must never be allowed to. Route
handlers are directly addressable; a new route would otherwise opt out of
authorisation simply by existing.

### Rate limiting

`/api/admin/depth` (GET and PUT) had none. Now 60/hour, burst 10/minute —
looser than the upload limiter because repeatedly saving a form while editing is
normal behaviour, not abuse. Reuses `createRateLimiter`; nothing new was built.

### CSRF / origin

`isSameOrigin(request)` on every admin route including login and logout, checked
**before** the local bypass — a development server is exactly where a page on
another origin might reach `localhost`, and the bypass means no session cookie
stands in the way.

Only `Origin` is trusted. `Referer` is stripped by privacy settings often enough
that requiring it breaks real requests, and accepting it as a fallback would hand
an attacker the weaker header to forge. A request with **no** `Origin` is allowed:
that is same-origin navigation, `curl`, or a server, and a browser always sends
`Origin` on a cross-origin write.

`DELETE /api/admin/login` took no `request` at all and so could examine nothing
about its caller. It now checks origin — but deliberately **not** authentication,
because signing out with an expired cookie has to work.

### Credentials stay server-side — verified, not asserted

Three checks, now tests rather than a one-off grep:

| Check | Result |
|---|---|
| No `'use client'` module references a secret name | **0 offenders** |
| No `NEXT_PUBLIC_*SECRET/TOKEN/KEY/PASSWORD` anywhere | **0 offenders** |
| No secret name in built `.next/static` | **0 offenders** |

The third skips with a warning when there is no build output, rather than
passing silently on nothing.

---

## Existing components reused

| Reused | How |
|---|---|
| `createRateLimiter` | Applied to depth; nothing new written |
| `checkAdminAccess` | **Extended** with one reason, not replaced |
| `ContentWriter` | Interface widened; both implementations kept |
| `clientKeyFromHeaders` | Unchanged |
| Admin panel | Two small edits — hold a version, send it back. Not rebuilt |
| TOTP, session, cookie | **Untouched** |

## Files affected

**New:** `src/middleware.ts`, `tests/unit/admin-security.test.ts`,
`tests/unit/content-writer-concurrency.test.ts`, this document.

**Modified:** `src/lib/admin/guard.ts`, `src/lib/admin/content-writer.ts`,
`src/app/api/admin/depth/route.ts`, `src/app/api/admin/resume/route.ts`,
`src/app/api/admin/login/route.ts`, `src/components/admin/admin-panel.tsx`,
`tests/api/admin-routes.test.ts`, `.env.example`.

## API changes

- `GET /api/admin/depth` returns `version`; `PUT` accepts it and returns the new
  one. Omitting it still works — an older client is not broken, it is only
  unprotected, and the panel sends it.
- New `409` with `code: 'conflict'` on depth and resume.
- New `403 Request rejected.` for cross-origin.
- New `429` with `retry-after` on depth.

## Security impact

The point of the change. Five real weaknesses closed; one — the lost update —
was a defect the previous code believed it had already handled.

**Still open, tracked in `docs/architecture.md`:** no audit history, no recovery
codes, stateless sessions cannot be revoked individually.

## Performance impact

Middleware adds ~34 kB to the edge bundle and runs only on `/admin` and
`/api/admin/*` — no public page touches it. `GET /api/admin/depth` gains one
rate-limit map lookup. Public pages unchanged.

## Accessibility impact

None — no public UI changed. The conflict message is text in the existing status
region, which already announces politely.

---

## Testing performed

Actually executed.

| | Result |
|---|---|
| TypeScript | **Clean** |
| ESLint | **Clean** |
| Unit / API | **331 passed, 0 failed** (was 303 — 28 new) |
| Build | **Compiled successfully**, middleware 33.9 kB |
| E2E | see *Final status* |

**Six existing tests failed and were updated, correctly.**
`tests/api/admin-routes.test.ts` encoded the old assumption that any
non-production build skips the login — the exact behaviour being removed. The
helper now sets the explicit opt-in, so each case still tests "a developer on
their own machine" rather than "any build that is not production". The bypass's
own boundaries are tested separately.

`createGitHubWriter` had **no test at all** before this — the live save path had
never been executed by anything. It now has seven, against a stubbed `fetch`,
including one asserting the token never appears in a thrown error.

## UAT

| ID | Scenario | Expected | Status |
|---|---|---|---|
| UAT-101 | `NODE_ENV=test` without the flag | Admin locked | **PASS** (unit) |
| UAT-102 | Dev server with the flag | Admin open | **PASS** (unit) |
| UAT-103 | Cross-origin POST | 403 | **PASS** (unit) |
| UAT-104 | Two admins, second saves stale | 409, first survives | **PASS** (unit, both writers) |
| UAT-105 | Save twice from one open form | Both succeed | **PASS** (unit) |
| UAT-106 | Secrets absent from client bundle | 0 occurrences | **PASS** |
| UAT-107 | Two real browser tabs conflicting | Conflict message shown | **NOT EXECUTED** — needs a live admin session |
| UAT-108 | Middleware blocks an uncookied API call | 401 at the edge | **NOT EXECUTED** — E2E runs with the bypass off but no test asserts the edge layer specifically |

## Rollback

`git revert`, or `git reset --hard pre-security-batch`. No data migration.
**One operational note:** after this change a local dev server needs
`ADMIN_LOCAL_BYPASS=1` in `.env.local` or the admin panel will ask for a TOTP
code. That is the intended behaviour, and it is the one thing that will look
like a regression if it is not expected.

---

## Final status

**PASS.**

```
TypeScript      clean
ESLint          clean
Unit / API      331 passed, 0 failed   (was 303 — 28 new)
Build           Compiled successfully, middleware 33.9 kB
E2E             409 passed, 3 skipped, 0 failed   (412 across 1440/768/390/320)
```

**Not executed, and not claimed:** UAT-107 and UAT-108 above; Lighthouse; any
deployment; browser/visual inspection of the conflict message.
