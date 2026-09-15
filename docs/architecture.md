# Architecture — read this first

For whoever picks this project up next, human or agent. It answers the questions
you would otherwise spend an hour of reading to answer, and it names the things
that will bite you.

**Last verified:** 2026-09-14, against `main` after CHANGE-004 — types, lint,
400 unit tests, production build and 421 E2E tests all green, plus 43 browser
UAT scenarios.
If something below contradicts the code, the code is right and this file is
stale — fix it.

---

## 1. What this is

A personal portfolio for Arvind Gupta, RPA Developer, plus a grounded AI
assistant that answers questions about him. Next.js 15 App Router, React 19,
TypeScript strict, Tailwind v4. Static build, deployed on Vercel.

**Production dependencies: `next`, `react`, `react-dom`, and five font
packages. That is the whole list.** No database, no ORM, no auth library, no UI
kit, no animation library, no state manager. This is deliberate and it is the
single most important thing to preserve. Every piece of behaviour below is
hand-written and tested; before adding a dependency, read §9.

---

## 2. Where portfolio content lives

**In `src/data/`, as TypeScript modules, read at build time.** There is no
runtime content fetch on any public page.

| File | Holds | Editable from admin? |
|---|---|---|
| `profile.json` + `profile.ts` | name, title, bio, contact, socials | **Yes** |
| `photo.json` + `photo.ts` | the portrait, and the two before it | **Yes** |
| `companies.json` + `companies.ts` | each employer, once — see ADR-002 | **Yes** |
| `experience.json` + `experience.ts` | roles, referencing a company by id | **Yes** |
| `skills.json` + `skills.ts` | the stack, grouped | **Yes** |
| `project-depth.json` | the deep per-project detail layer | **Yes** |
| `resume-registry.json` | which resume the site serves + history | **Yes** |
| `projects.ts` | the five case studies | Not yet |
| `skill-notes.ts` | per-skill explainer notes | Not yet |
| `impact.ts` | headline numbers | Not yet |
| `site.ts` | nav, themes, font sets, assistant modes | Not yet |
| `reporting.ts` | **invented demo data.** See §8 | No, and must not be |

Migrating the rest of these to admin-editable JSON is the in-progress work. The
pattern to copy is `profile.{json,ts}` — a JSON file, a validator beside it, a
typed accessor, and an entry in `src/lib/content/registry.ts`. Adding a file to
that registry is what gives it auth, rate limiting, a size cap, optimistic
concurrency and conflict handling; there is no second route to write.

**The photo and the resume are editable, but not from the profile form.** Each
has its own registry, because each is a file plus derived measurements rather
than prose. `photo.width`, `photo.height` and `blurDataURL` describe one
specific JPEG — put them in a text box and a save is one keystroke away from
layout shift — so they are computed at upload and stored beside the version they
describe. `profile.ts` merges both back in, which is why `profile.photo` and
`profile.resume` look exactly as they always did to every component.

---

## 3. How the admin writes content

```
Admin panel (browser)
    ↓ fetch, session cookie
middleware (edge: is a session cookie present?)
    ↓
/api/admin/*  →  origin check  →  checkAdminAccess  →  rate limit  →  validate
    ↓
ContentWriter          src/lib/admin/content-writer.ts
    ├─ local  (NODE_ENV !== production)  →  fs write
    └─ github (production)               →  GitHub Contents API commit
                                            conditional on the caller's sha
    ↓
push to main  →  Vercel rebuild  →  live in ~90s
```

**The repository is the database.** Rationale, alternatives and the conditions
that would reverse the decision are in `docs/adr/ADR-001` (also in the project
docs). Short version: the site stays fully static so visitors depend on nothing
that can fail, and versioning plus rollback come free from git.

`WRITABLE` in `content-writer.ts` is a **closed allow-list of paths**. Callers
pass a key or a validated target, never a path. Two families are parameterised —
resume files and portraits — and in both the id is produced server-side (a
timestamp for resumes, a content hash for photos), never taken from the upload,
and re-validated against `/^[a-z0-9][a-z0-9-]{0,63}$/` again at path
resolution.

### What you must know before changing this

- **A save is not live immediately.** `pendingDeploy: true` in a response means
  the commit landed and Vercel is rebuilding.
- **The local writer is chosen by `NODE_ENV`**, deliberately, even if GitHub
  credentials are present. There is a test for it.
- **Writes are conditional and you must pass the version through.** `read()`
  returns `{ content, version }`; the route sends `version` to the client; the
  client sends it back; `write()` quotes it. Skip any link in that chain and the
  write becomes an unconditional overwrite — which is what it silently was
  before CHANGE-002, when the writer fetched a fresh sha itself and the conflict
  could never fire.
- **`write()` returns the new version**, and the route must pass it back, or a
  second save from the same open form conflicts with its own first save.

---

## 4. Where uploads are stored

In the repository, under `public/`. Limits are enforced server-side **before**
the bytes are accepted.

| Kind | Cap | Validation | Path |
|---|---|---|---|
| Resume PDF | 8 MB | `%PDF-` magic bytes | `public/resume/<id>.pdf` |
| Resume DOCX | 8 MB | ZIP magic + `[Content_Types].xml` member | `public/resume/<id>.docx` |
| Portrait JPEG | 4 MB | `FF D8 FF` magic, plus width/height read from the JPEG header and bounded to 200–5000px | `public/profile/<sha256-16>.jpg` |

**The server never decodes an image.** `image-dimensions.ts` walks the JPEG's
marker structure and reads the size out of the SOF segment; the browser does the
resizing before upload. That is a deliberate security decision, not a missing
feature — see ADR-003 before reaching for `sharp`.

Retention: `MAX_RESUME_VERSIONS = 5` and `MAX_PHOTO_VERSIONS = 3` bound their
registries. **It does not reclaim
bytes** — anything committed stays in git history permanently. That is an
accepted cost of §3, not an oversight. If binaries ever grow past a few tens of
megabytes, the answer is object storage, not a cleverer prune.

Other upload kinds (project images, company logos, knowledge documents) are not
built yet. Follow the same shape: cap, magic-byte check, server-minted name.
Company logos are currently a *path* field, validated to a site-relative image
under this domain — there is no logo upload.

---

## 5. How authentication works

- **TOTP**, RFC 6238, hand-rolled in `src/lib/admin/totp.ts`, no dependency,
  verified against the published test vectors. Works with Google Authenticator.
- **Session**: a stateless HMAC-signed cookie `ag_admin`, 2 hours, `HttpOnly`,
  `SameSite=Strict`, `Secure` in production. Not a JWT. Signature is verified
  *before* the payload is parsed.
- **Guarding is two layers.** `src/middleware.ts` runs at the edge over
  `/admin/:path*` and `/api/admin/:path*` and checks that a session cookie is
  **present**; it cannot check that the cookie is *valid*, because the edge
  runtime has no `node:crypto` and the signature needs HMAC. So every route
  still calls `checkAdminAccess(request)` and verifies for itself. The
  middleware is a cheap early rejection, never the security boundary — do not
  remove a route's own guard because "middleware covers it".
  `/api/admin/login` is excluded (you cannot have a cookie before signing in),
  and `/admin` is allowed through so the sign-in form can render.
- **The local bypass needs two conditions**: `NODE_ENV !== 'production'` **and**
  `ADMIN_LOCAL_BYPASS=1`. Set the second in `.env.local` or a dev server will ask
  for a TOTP code. It used to be `NODE_ENV` alone, which meant any `test` build
  served an unauthenticated admin panel.
- **Origin is checked on every admin route**, before the bypass.
- **Writes are conditional.** `read()` returns a `version`; `write()` takes it back
  and raises `ConflictError` if anything landed in between.
- Secrets: `ADMIN_TOTP_SECRET`, `ADMIN_SESSION_SECRET` (≥32 chars),
  `ADMIN_GITHUB_TOKEN`, `ADMIN_GITHUB_REPO`. All server-only.

**Verified 2026-09-14:** no secret name appears in any file under
`.next/static`; every reference is in a module without `'use client'`; the only
`NEXT_PUBLIC_` variable is the site URL. Re-run:

```bash
grep -rl "ADMIN_GITHUB_TOKEN\|ADMIN_SESSION_SECRET\|ADMIN_TOTP_SECRET" .next/static | wc -l   # expect 0
```

---

## 6. How AI knowledge is loaded

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
Five honesty guards stop it answering about things Arvind has not done: a score
floor, a specific-term filter, a per-project focus filter, an unknown-entity
check, and empty-query rejection. **Do not loosen these to make an answer
appear.** A false claim about a man's experience is the worst bug this site can
ship.

`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` are optional. With no key the assistant
still works, extractively, from the same corpus.

Both `knowledgeBase` and the index are **module-level constants built once**.
There is no rebuild seam yet; adding uploaded documents requires one.

---

## 7. How deployment is triggered

Push to `main` → Vercel builds → live. Nothing else. There is no CI gate on the
deploy, so a broken `main` deploys.

Vercel Hobby limits that bound this design: **100 deployments/day**, 100
builds/hour, and Hobby cannot connect to a repo owned by a GitHub *organisation*
(this repo is personal, so it is fine — moving it under an org would break
deploys).

`PUSH-TO-GITHUB.bat` in the repo root exists because the push must run on
Windows, where the credential manager holds the token.

---

## 8. What must NOT be changed

Each of these is load-bearing and each has cost someone real time:

1. **`src/data/reporting.ts` is invented demo data** and is excluded from the AI
   knowledge base on purpose. The real dashboards it imitates contain third-party
   PII and regulated NBFC data. **Never feed it to the agent, never present it as
   real, never replace it with anything from a real system.** A test asserts no
   email, PAN-shaped string or bare 10-digit number can render there.
2. **No `will-change` on `.reveal`.** ~91 elements; adding it exhausted GPU
   memory on phones and made *other* layers paint blank.
3. **No `will-change` on the backdrop orbs**, for the same reason.
4. **The theme-transition rule in `globals.css` is deliberately unlayered.**
   Unlayered CSS outranks `@layer components`; inside the layer it silently did
   nothing.
5. **A 1px line must never be centred in an even-width box.** It lands on a
   half-pixel and shimmers on every repaint. Three separate flicker bugs came
   from this; the fix is a 3px box with a `background-size: 1px 100%` stripe.
6. **Reduced-motion is a two-part check**, in CSS *and* in JS: the OS preference
   AND the absence of `data-motion="full"`. Checking `matchMedia` alone broke the
   opt-in.
7. **The AI honesty guards** (§6).
8. **`parseDepth` / `parseResumeRegistry` drop bad fields rather than throwing.**
   A bad admin save must never be able to take the site down.

---

## 9. Conventions

- **Reuse before rebuild.** Search for existing behaviour first; extend it.
- **Comments explain *why*, including what was tried and failed.** The codebase
  is written so the next person does not repeat a debugging session. Match that.
- **Every claim in a comment should be checkable.** Prefer "measured X at 1440"
  over "should be fast".
- **Tests are the safety net for everything above** — 400 unit/API, 421 E2E
  across four viewports. Run them; never report results you did not run.
- **Before adding a dependency**: does existing code solve it? Does the platform?
  Is it maintained? What does it cost the bundle? The answer has been "no
  dependency" 100% of the time so far.

Useful commands:

```bash
npx tsc --noEmit                  # types
npx next lint                     # lint
npx vitest run                    # unit + API
npx next build                    # production build
npx playwright test               # E2E, four viewports
```

**The stale-server trap:** Playwright's `reuseExistingServer` will happily reuse
an old `next start` on port 3100 serving a previous build, producing a wall of
failures whose only symptom is that CSS and JS 404. `pgrep -f next-server` does
not find it. `fuser 3100/tcp` does. **Kill by port, not by name.** This has cost
four debugging sessions.

**The shared-`.next` trap:** `next dev` and `next start` write to the *same*
`.next` directory. Running a dev server while an E2E or UAT run is using a
production build overwrites the production middleware manifest with the dev one
— every `/api/admin/*` route then 404s against a build that is otherwise fine.
Symptom: the build is clean, the tests say the routes do not exist. **Run one
server at a time**, or give each its own `distDir`.

**The missing-browser trap:** the container ships a pinned Chromium that does
not always match the build Playwright wants. `playwright.config.ts` honours
`PLAYWRIGHT_CHROMIUM_PATH` for exactly this. It is a shell variable, so it does
not survive between commands — export it in the same command that runs the
suite, or every test fails in ~3 ms with "Executable doesn't exist".

---

## 10. Known limitations and open defects

Honest list. None of these is hypothetical.

| # | Issue | Impact |
|---|---|---|
| ~~1~~ | ~~GitHub 409 conflicts swallowed~~ | **Fixed, CHANGE-002.** The 409 could never fire — the writer fetched a fresh sha before every write. The caller's sha is now sent |
| ~~2~~ | ~~`NODE_ENV=test` serves an unauthenticated admin~~ | **Fixed, CHANGE-002.** Requires `ADMIN_LOCAL_BYPASS=1` as well |
| ~~3~~ | ~~`DELETE /api/admin/login` unauthenticated~~ | **Fixed, CHANGE-002.** Origin-checked (not authenticated — logging out with an expired cookie must work) |
| ~~4~~ | ~~No `middleware.ts`~~ | **Fixed, CHANGE-002.** Edge presence check; routes still verify |
| ~~5~~ | ~~`/api/admin/depth` has no rate limit~~ | **Fixed, CHANGE-002** |
| 6 | **The portrait is a 167 KB unoptimised JPG**, no WebP, no responsive sizes | Largest asset on the site |
| 7 | **`createGitHubWriter` has no unit test**; E2E only covers the no-credentials path | **The live save path has never been executed by a test** |
| ~~8~~ | ~~No admin UI for resume rollback~~ | **Fixed, CHANGE-003.** The Resume section lists every version, marks the live one and switches with one click |
| 9 | **No global loading / error / offline / 404 system** | Individual states exist; there is no shared infrastructure |
| 10 | **`skill-notes.ts` is 16 KB of data in the client bundle** for one component | Bundle weight |
| 11 | **Lighthouse has never been run** on this project | Every performance figure in the docs is a target, not a measurement, unless it says otherwise |
| 12 | **`tests/unit/data-integrity.test.ts` asserts the *order* of social links** | Now that socials are admin-editable, reordering them in the panel fails the unit suite even though the site is correct. The assertion's real intent is "no invented links". Relax it to a set comparison |
| 13 | **The content editors have no dirty-state guard** | Navigating between sections with unsaved changes in a form discards them silently. Now affects six sections rather than four |
| 14 | **Nothing rebuilds the site after a content save** | A save commits to the repository; the public page shows it on the next deployment. The deploy hook is not wired up (Phase 2) |
| 15 | **The responsibilities/achievements split of the existing roles is a first pass** | Two lines were classified as achievements by their wording. Arvind should review the split; it is content, not code |
| 16 | **Company logos are a path field, not an upload** | The validator accepts a site-relative image path. Nothing puts a file there yet |
| 17 | **The public experience section still renders one flat list** | Responsibilities and achievements are separate in the data and concatenated for display. Showing them as two labelled groups is a design decision, not an oversight |

---

## 11. Decisions worth knowing about

| ADR / change | Decision |
|---|---|
| ADR-001 | Content lives in the repo as JSON, written through `ContentWriter`, not in a managed database. Conditions that would reverse it are listed in the ADR |
| CHANGE-001 | Resume is a registry with version history; upload writes the file then the pointer, in that order |
| ADR-002 | A company is its own entity; roles reference it by id, and a dangling reference drops the role rather than rendering a blank employer |
| ADR-003 | The browser resizes uploaded images; the server validates them without ever decoding one. Read before reaching for `sharp` |

Change documents live in `docs/changes/`. Write one for anything non-trivial,
and record what was *actually* tested rather than what should pass.
