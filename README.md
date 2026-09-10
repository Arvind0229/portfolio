# Arvind Gupta — Portfolio & Grounded AI Assistant

A production-grade personal portfolio for **Arvind Gupta, RPA Developer** (banking, NBFC and retail lending automation), with an integrated AI assistant that answers questions about his professional background — and only from his resume.

Built with Next.js 15 (App Router), React 19 and TypeScript in strict mode.

---

## Table of contents

- [What this is](#what-this-is)
- [Features](#features)
- [Architecture](#architecture)
- [The AI layer](#the-ai-layer)
- [Technology stack](#technology-stack)
- [Folder structure](#folder-structure)
- [Environment variables](#environment-variables)
- [Local setup](#local-setup)
- [Commands](#commands)
- [Testing](#testing)
- [Security](#security)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Deployment](#deployment)
- [Production checklist](#production-checklist)
- [Design decisions](#design-decisions)
- [Future enhancements](#future-enhancements)

---

## What this is

Two products in one application:

1. **The portfolio** — a page set, not a single scroll: home, about, expertise, experience, projects (with a route per case study), technology stack, architecture, impact, education, assistant, contact and resume. Each area has a URL that can be linked, shared and landed on directly, which is what a recruiter forwarding "his projects" actually needs.
2. **The agentic AI layer** — a retrieval-grounded assistant with four conversation modes (Recruiter, Technical, Business, General), built into the site rather than bolted on as a chat widget.

Every fact on the site comes from one typed data layer derived from the resume. **No content is invented.** A test suite enforces this: `tests/unit/data-integrity.test.ts` fails the build if a project claims a technology that is not in the skills data, if a case study contains a per-project metric the resume does not state, or if an AI starter question references a technology Arvind has not worked with.

---

## Features

**Design system**

- A signature midnight-blue palette with electric blue and cyan accents, in both dark and light. Where a specified hex did not clear WCAG AA as text, it was lifted by the smallest amount that passes and the original kept for gradients and glow, where contrast does not apply — the shift is imperceptible and documented inline.
- A **pendant bulb on a cord** as the dark/light control: click it, pull the cord, or focus it and press Enter. It is a real `role="switch"` underneath, so a screen reader announces state and a keyboard operates it normally; the swing and the light wash are presentation layered on top and vanish under reduced motion.
- An **automation pipeline** drawn in inline SVG — manual queue to bot to processing to validation to result, with data packets riding the real path and each stage lighting as work reaches it. One component, reused in the hero, the architecture page and each case study. Paused while off-screen.
- The name splits into characters that rise on entry, in two solid colours rather than a clipped gradient (a transformed character creates a containing block, and `background-clip: text` does not paint into one — the gradient version rendered the name invisible).
- Selective glass on the navigation, featured project, assistant and metric panels; pointer-reactive card edges; a sliding navigation indicator and a scroll-progress hairline.

**Portfolio**

- Three genuinely distinct themes — **Midnight** (the signature dark, electric blue and cyan), **Enterprise** (restrained, executive) and **Studio** (editorial, typographic) — each with its own light and dark palette, background language, motion intensity and type treatment.
- Three typography sets — **Precision** (Space Grotesk display over Inter), **Technical** (JetBrains Mono headings), **Editorial** (Fraunces + Sora) — switchable from the header, on every page.
- Theme, mode and font persist across visits and are applied **before first paint**, so there is no flash and no layout shift.
- Experience timeline with progressive disclosure; project case studies with category filter, full-text search, and a **business view / technical view** toggle so the same work reads correctly to a recruiter and to an engineer.
- Each case study is its own route — a URL to forward, not modal state to describe.
- Animated impact counters, staged project reveals and micro-interactions — all disabled under `prefers-reduced-motion`.
- An **automated-reporting showcase** on the impact page, reproducing the mail-body dashboard formats described in the resume. Every figure there is invented — see "Content policy" below.

**AI assistant**

- Retrieval-grounded answers with the source sections shown.
- Four modes that measurably change the framing of an answer.
- Conversation memory for follow-ups ("which of those used Python?").
- Says plainly when something is not in the profile, and names what it could not find.
- Prompt-injection defence, output validation, rate limiting and session expiry.
- **Works with no API key at all** — see below.

---

## Architecture

```text
Browser
  │
  ├── Static page (RSC + minimal client islands)
  │
  └── POST /api/ai/chat
        │
        ├── content-type / body-size validation
        ├── rate limiter            (sliding window + burst, per client)
        ├── session store           (bounded, TTL, server-owned history)
        │
        └── Agent orchestrator
              ├── sanitize          (normalise, strip control + zero-width, length cap)
              ├── injection check   (instruction override, prompt extraction, secret probe)
              ├── intent detection  (deterministic rules → one tool)
              ├── tool execution    (read-only, permission-bounded retrieval)
              ├── grounded context  (BM25-style lexical retrieval over the resume)
              ├── generation        (LLM provider  ─or─  deterministic composer)
              └── output validation (leak patterns, empty responses)
```

Layers are separated: UI (`components/`) → application logic (`hooks/`, `lib/`) → services (`lib/ai`, `lib/security`, `lib/session`) → data (`data/`). No component imports the agent; no data file imports a component.

---

## The AI layer

### Grounding

The knowledge base (`lib/ai/knowledge.ts`) is built from the same typed data the page renders — roughly 45 chunks covering profile, experience, projects, skills, achievements, domain, education and contact. Retrieval is **lexical (BM25-style) with query expansion**, not vector search.

That is a deliberate decision. The corpus is one resume. A lexical retriever over it is deterministic, runs in microseconds, needs no embedding service or vector database, is exactly unit-testable, and cannot be poisoned. Adding pgvector "because RAG" would be infrastructure for its own sake. The retrieval interface is isolated in `lib/ai/retrieval.ts`, so swapping in embeddings later touches one file.

Two properties matter and are tested:

- A query whose only in-vocabulary words are generic ("did he work with **Kubernetes**?") retrieves **nothing** and gets an explicit "not in his profile" answer.
- Named entities absent from the profile are called out by name before anything else is said.

### Providers

`AI_PROVIDER` selects `anthropic`, `openai` or `local`. With no key configured, the assistant falls back to a **deterministic grounded composer** that assembles answers from sentences that already exist in the resume data.

The fallback is not a stub. It exists because:

1. **It cannot hallucinate** — it can only emit source sentences. That is the correctness floor an LLM answer is measured against.
2. **Availability** — the assistant keeps working when a key is missing, a provider is down, or an upstream limit is hit. A portfolio that shows "AI unavailable" to a recruiter has failed at the only moment that mattered.
3. **Cost** — most visitor questions are answered well without a paid call.

Add a key and answers become conversational; remove it and they stay correct.

### Safety

- Visitor input is untrusted: normalised, stripped of control and zero-width characters, length-capped, and checked against targeted injection patterns (not a blunt keyword filter — "what instructions did the business give him?" is a legitimate question and is allowed).
- Retrieved context is wrapped in an explicit data boundary and the model is told, in the system role, that it is reference data rather than instructions.
- Generated output is scanned for leak patterns before it is returned.
- Tools are read-only and permission-bounded: each declares the chunk kinds it may surface, enforced on both sides of retrieval. There is no tool that touches the filesystem, network, environment or any mutable state.
- The system prompt is never included in any response shape.

---

## Technology stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15, App Router | Server components for the content, one API route for the assistant, standalone output for Docker |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | Content and AI contracts are typed end to end |
| Styling | Tailwind CSS v4 over CSS custom properties | Utilities for layout; every colour comes from a design token so themes override tokens, not components |
| Fonts | Fontsource (self-hosted) | No third-party request, no font host in the CSP, hermetic builds |
| Animation | CSS keyframes + `IntersectionObserver` | A scroll reveal is one observer and one class; a 30 KB animation runtime would cost more than it delivers |
| Testing | Vitest + Testing Library, Playwright, axe-core | Unit/component/API in-process; E2E against a real production build |
| Runtime deps | **3** (`next`, `react`, `react-dom`) | Everything else is a dev dependency |

---

## Folder structure

```text
src/
  app/
    page.tsx                 Home: hero, featured work, directory
    about/ expertise/ experience/ projects/ architecture/
    impact/ education/ assistant/ contact/ stack/ resume/
    projects/[id]/           One static route per case study
    api/ai/chat/route.ts     Assistant endpoint: validation, rate limit, session, agent
    api/health/route.ts      Readiness probe for load balancers
    layout.tsx               Fonts, metadata, JSON-LD, theme bootstrap
    globals.css              Design tokens, themes, animation, reduced motion
    error.tsx / not-found.tsx
  components/
    ai/                      Assistant UI
    layout/                  Navbar, footer, appearance controls
    sections/                Hero, profile, experience, projects, skills, architecture, impact, contact
    ui/                      Button, Badge, Reveal, SplitText, Section
    visuals/                 Per-theme backdrop, automation pipeline
  data/                      SINGLE SOURCE OF TRUTH (profile, experience, projects, skills, impact, site)
  hooks/                     use-appearance, use-in-view, use-active-section
  lib/
    ai/                      knowledge, retrieval, intent, tools, guardrails, prompt, agent, providers/
    security/                rate-limit
    session/                 store
    theme/                   tokens + pre-paint bootstrap script
    utils/                   cn, filter-projects
  types/                     Domain and AI types
tests/
  unit/  component/  api/  e2e/
public/resume/               PDF and DOCX
```

**To update the site after a resume change, edit `src/data/`.** No component changes are required, and the AI assistant picks up the change automatically because it reads the same files.

---

## Environment variables

Copy `.env.example` to `.env.local`. Every value is optional — the site runs correctly with all of them unset.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical URL, Open Graph, sitemap |
| `AI_PROVIDER` | No | `anthropic` \| `openai` \| `local`. Unset = first configured provider, else local |
| `ANTHROPIC_API_KEY` | No | Server-side only |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-4-5` |
| `OPENAI_API_KEY` | No | Server-side only |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |

**Never** prefix an API key with `NEXT_PUBLIC_` — that ships it to the browser.

---

## Local setup

```bash
npm install
cp .env.example .env.local     # optional: add a key to enable LLM answers
npm run dev                    # http://localhost:3000
```

Node 20 or newer.

---

## Commands

```bash
npm run dev         # development server
npm run build       # production build
npm start           # serve the production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # unit + component + API tests
npm run test:e2e    # Playwright (requires: npm run build first)
npm run verify      # typecheck + lint + test + build
```

---

## Testing

Tests are not decoration here — several defects in this codebase were found and fixed by them, including a retriever that answered "does he know Kubernetes?" with unrelated content, a nameless navigation link on small screens, and invalid list markup in the architecture section.

```bash
npm test                                  # 165 tests
npm run build && npm run test:e2e         # 233 tests across 4 viewports
```

**Unit / component / API** (Vitest, jsdom)

- Retrieval: tokenisation, synonym expansion, ranking, determinism, generic-term rejection, unknown-entity detection
- Guardrails: sanitisation, 12 injection shapes blocked, 8 legitimate questions allowed, output leak patterns
- Intent routing and tool permission boundaries
- Agent: grounding, refusal, modes, follow-up context, provider failure fallback, key-leak canary
- Rate limiter and session store, including expiry and bounded growth
- **Content integrity** — no fabricated employers, metrics, technologies or starter questions
- Components: appearance controls, project filtering and dialog, assistant transcript and error states
- API route: validation, 415/413/400/405 paths, forged session id, rate limiting, no stack traces

**End-to-end** (Playwright, production build, viewports 1440 / 768 / 390 / 320)

- Full journey: hero → navigation → theme switch → font switch → projects → filter → case study → resume → assistant → mode change → follow-up → contact
- Assistant: grounded answer, honest refusal, context retention, injection refusal, server error, network failure, keyboard-only operation
- Responsive: no horizontal overflow at any width, no element exceeding the viewport, mobile menu, touch target sizes
- Accessibility: axe WCAG 2.0/2.1 A + AA across **all six theme/mode combinations**, dialog audit, skip link, focus trapping and restoration, reduced motion
- Security: headers, secret scan of delivered HTML, endpoint method/type/size validation, rate limiting, no stack traces, XSS rendering
- Visual capture across every theme and section (see note in `tests/e2e/visual.spec.ts` on why these capture rather than compare)

---

## Security

| Control | Implementation |
| --- | --- |
| Secrets | Server-side only; `.env.example` holds placeholders; CI greps for committed keys |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, no `X-Powered-By` |
| Input validation | Content type, declared and actual body size, JSON shape, message type and length, mode allow-list |
| Session integrity | Server-generated opaque ids, format-validated; a forged id is discarded, not trusted |
| Rate limiting | Sliding window (20 / 5 min) plus burst ceiling (5 / 15 s), bounded key count |
| Prompt injection | Pattern detection in, leak-pattern validation out, explicit data boundary around context |
| Tool safety | Read-only, permission-bounded, no filesystem/network/env access |
| Error handling | Friendly messages; digests logged, stack traces never rendered |
| Logging | Structured and non-sensitive — visitor messages are never logged |

**Known limitation, stated honestly:** the rate limiter and session store are in-process. On a single instance (one container, or Vercel with low concurrency) they behave exactly as designed. Across N instances each enforces its own window, so the effective ceiling is N × limit and a visitor may land on an instance without their history — which degrades gracefully to an answer without follow-up context. Both modules are written against a store interface; implementing it over Redis is the only change needed. Running Redis for a portfolio was not judged worth it.

---

## Performance

- **103 kB shared first-load JS**; the heaviest route is the projects list at 112 kB.
- Zero runtime UI dependencies; animation is CSS, revealed by `IntersectionObserver`.
- Fonts self-hosted, `display: swap`, unicode-range subsetting.
- No canvas or WebGL; decorative layers are GPU-composited gradients and one small inline SVG.
- Scroll handling is a passive listener flipping a boolean — no layout reads per frame.
- Static page, dynamic API route, `no-store` on all API responses.

Lighthouse was **not** run in this environment (no Chrome UI available here). Run it against your deployment before quoting a score — this README will not quote one it has not measured.

---

## Accessibility

Semantic landmarks, skip link, visible focus rings, keyboard operation throughout, ARIA only where it earns its place, live regions for filter results and the assistant transcript, focus trapping and restoration in dialogs, and full `prefers-reduced-motion` support.

Colour tokens were tuned against measured contrast ratios — every text token clears **4.5:1 on its darkest surface**, most at 5:1 or better. axe reports zero WCAG A/AA violations in all six theme/mode combinations.

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub.
2. Import it in Vercel — the framework is detected automatically.
3. Set environment variables: `NEXT_PUBLIC_SITE_URL`, and `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) if you want LLM answers.
4. Deploy.

### Docker

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.com -t arvind-portfolio .
docker run -p 3000:3000 --env-file .env.local arvind-portfolio
```

The image is multi-stage, runs as a non-root user, exposes only port 3000, and has a `HEALTHCHECK` against `/api/health`.

### Any Node host

```bash
npm ci && npm run build
node .next/standalone/server.js     # honours PORT and HOSTNAME
```

Put HTTPS and a CDN in front. If you terminate TLS at a proxy, make sure it sets `X-Forwarded-For` — the rate limiter reads it.

---

## Production checklist

- [ ] `NEXT_PUBLIC_SITE_URL` set to the real domain
- [ ] API key set in the host's environment (not committed)
- [ ] `npm run verify` green
- [ ] `npm run test:e2e` green
- [ ] `/api/health` reachable from the load balancer
- [ ] HTTPS and HSTS active
- [ ] `X-Forwarded-For` set by the proxy
- [ ] Lighthouse run against the deployment
- [ ] Resume PDF/DOCX in `public/resume/` current
- [ ] Social links added to `src/data/profile.ts` when they exist

---

## Design decisions

Recorded because the reasoning matters more than the outcome.

**Lexical retrieval over vector search.** One resume, ~45 chunks. Deterministic, testable, free, offline-capable. The interface is isolated so embeddings remain a one-file change.

**A deterministic composer as the fallback, not an error page.** Availability and a correctness floor, in that order.

**Rules for intent, not a model call.** Routing over a fixed label set is accurate, instant and unit-testable with rules. Calling a model to decide which retriever to call is a tool call for its own sake.

**No animation library.** CSS keyframes plus one hook. The bundle stayed at 119 kB.

**No contact backend.** A form would need SMTP credentials, spam defence and a retention story to do what `mailto:` already does — with the visitor keeping their own copy and nothing stored anywhere. Build `/api/contact` when there is a reason to collect submissions server-side.

**No proficiency percentages on skills.** They are invented numbers. The projects section shows where each technology was actually used, which is the evidence a reviewer wants.

**Architecture diagrams are labelled.** Both flows shown are marked "Reflects delivered systems" because both describe work the resume states was delivered. Anything conceptual carries `verified: false` in the data and renders as "Illustrative".

**In-process rate limiting and sessions.** Documented above with the exact trade-off and the exact upgrade path.

---

## Future enhancements

- Redis-backed rate limiter and session store when traffic justifies horizontal scaling
- Streaming assistant responses for faster perceived latency once an LLM key is configured
- Visual regression baselines generated in CI on a fixed image
- Open Graph image generation from the profile data
- Optional analytics with a privacy-preserving provider

---

## Content policy

**Nothing on this site comes from a real report, system or customer record.**

The resume describes MIS reports delivered as formatted HTML mail-body dashboards, and the impact page shows what those look like. The layouts are real; the data is not. Every figure, region name and status in `src/data/reporting.ts` is invented, and the UI labels the panels as illustrative.

That is deliberate. The production versions of those reports contain employee names, official email addresses, PAN and mobile numbers, insider-trading designated-person lists and branch-level portfolio figures — third-party personal data and regulated internal information belonging to an NBFC. None of it may appear on a public site, and an end-to-end test asserts that nothing shaped like an email address, a PAN or a mobile number ever renders in that section.

All portfolio content derives from Arvind Gupta's resume. No employer, client, project, certification, technology, date or metric appears anywhere in this application that is not present in that document. The AI assistant is constrained to the same corpus and refuses questions it cannot ground.
