# Architecture — read this first

For whoever picks this project up next, human or agent. It answers the questions
you would otherwise spend an hour of reading to answer, and it names the things
that will bite you.

**Last verified:** 2026-09-14, against commit on `main` after CHANGE-001.
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
| `profile.ts` | name, title, bio, contact, socials | Not yet |
| `projects.ts` | the five case studies | Not yet |
| `project-depth.json` | the deep per-project detail layer | **Yes** |
| `resume-registry.json` | which resume the site serves + history | **Yes** |
| `skills.ts`, `skill-notes.ts` | the stack, and per-skill notes | Not yet |
| `experience.ts`, `impact.ts` | roles and headline numbers | Not yet |
| `site.ts` | nav, themes, font sets, assistant modes | Not yet |
| `reporting.ts` | **invented demo data.** See §8 | No, and must not be |

Migrating the rest of these to admin-editable JSON is the in-progress work. The
pattern to copy is `resume-registry.{json,ts}` — a JSON file, a validator beside
it, and a typed accessor.

---

## 3. How the admin writes content

```
Admin panel (browser)
    ↓ fetch, session cookie
/api/admin/*  →  checkAdminAccess  →  rate limit  →  validate
    ↓
ContentWriter          src/lib/admin/content-writer.ts
    ├─ local  (NODE_ENV !== production)  →  fs write
    └─ github (production)               →  GitHub Contents API commit
    ↓
push to main  →  Vercel rebuild  →  live in ~90s
```

**The repository is the database.** Rationale, alternatives and the conditions
that would reverse the decision are in `docs/adr/ADR-001` (also in the project
docs). Short version: the site stays fully static so visitors depend on nothing
that can fail, and versioning plus rollback come free from git.

`WRITABLE` in `content-writer.ts` is a **closed allow-list of paths**. Callers
pass a key or a validated target, never a path. The one parameterised family is
resume files, and its id is minted server-side and re-validated at resolution.

### What you must know before changing this

- **A save is not live immediately.** `pendingDeploy: true` in a response means
  the commit landed and Vercel is rebuilding.
- **The local writer is chosen by `NODE_ENV`**, deliberately, even if GitHub
  credentials are present. There is a test for it.
- **GitHub 409 conflicts are currently swallowed** into a generic 502. Two admin
  tabs can still clobber each other. This is a known open defect — see §10.

---

## 4. Where uploads are stored

In the repository, under `public/`. Limits are enforced server-side **before**
the bytes are accepted.

| Kind | Cap | Validation | Path |
|---|---|---|---|
| Resume PDF | 8 MB | `%PDF-` magic bytes | `public/resume/<id>.pdf` |
| Resume DOCX | 8 MB | ZIP magic + `[Content_Types].xml` member | `public/resume/<id>.docx` |

Retention: `MAX_RESUME_VERSIONS = 5` bounds the registry. **It does not reclaim
bytes** — anything committed stays in git history permanently. That is an
accepted cost of §3, not an oversight. If binaries ever grow past a few tens of
megabytes, the answer is object storage, not a cleverer prune.

Other upload kinds (photo, project images, logos, knowledge documents) are not
built yet. Follow the same shape: cap, magic-byte check, server-minted name.

---

## 5. How authentication works

- **TOTP**, RFC 6238, hand-rolled in `src/lib/admin/totp.ts`, no dependency,
  verified against the published test vectors. Works with Google Authenticator.
- **Session**: a stateless HMAC-signed cookie `ag_admin`, 2 hours, `HttpOnly`,
  `SameSite=Strict`, `Secure` in production. Not a JWT. Signature is verified
  *before* the payload is parsed.
- **Guarding**: `checkAdminAccess(request)` in every admin route. **There is no
  `middleware.ts`** — each route guards itself.
- **`NODE_ENV !== 'production'` disables auth entirely.** That is the whole
  local-development story and it is also a sharp edge — see §10.
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
- **Tests are the safety net for everything above** — 303 unit/API, 412 E2E
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

---

## 10. Known limitations and open defects

Honest list. None of these is hypothetical.

| # | Issue | Impact |
|---|---|---|
| 1 | **GitHub 409 conflicts are swallowed** into a generic 502 | Two admin tabs silently clobber each other. Must be fixed before more content moves to admin control |
| 2 | **`NODE_ENV=test` serves an unauthenticated admin panel** — `isLocalAdmin()` keys off `!== 'production'` | A non-production build exposes admin. Narrow to an explicit opt-in |
| 3 | **`DELETE /api/admin/login` is unauthenticated** and never receives the request | Low — it only clears a cookie |
| 4 | **No `middleware.ts`** | Every route guards itself; a new route that forgets is unprotected |
| 5 | **`/api/admin/depth` has no rate limit** | The resume route now does; depth does not |
| 6 | **The portrait is a 167 KB unoptimised JPG**, no WebP, no responsive sizes | Largest asset on the site |
| 7 | **`createGitHubWriter` has no unit test**; E2E only covers the no-credentials path | **The live save path has never been executed by a test** |
| 8 | **No admin UI for resume rollback** | The API and data model support it; the panel does not expose it |
| 9 | **No global loading / error / offline / 404 system** | Individual states exist; there is no shared infrastructure |
| 10 | **`skill-notes.ts` is 16 KB of data in the client bundle** for one component | Bundle weight |
| 11 | **Lighthouse has never been run** on this project | Every performance figure in the docs is a target, not a measurement, unless it says otherwise |

---

## 11. Decisions worth knowing about

| ADR / change | Decision |
|---|---|
| ADR-001 | Content lives in the repo as JSON, written through `ContentWriter`, not in a managed database. Conditions that would reverse it are listed in the ADR |
| CHANGE-001 | Resume is a registry with version history; upload writes the file then the pointer, in that order |

Change documents live in `docs/changes/`. Write one for anything non-trivial,
and record what was *actually* tested rather than what should pass.
