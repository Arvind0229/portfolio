# Getting this on GitHub and online

The repository in this folder is already a git repository with one clean commit — nothing to initialise, nothing to tidy. `node_modules`, `.next`, `.env*` and test output are all ignored.

## 1. The GitHub account

I can't create a GitHub account on your behalf: signing up requires verifying **your** email address and accepting GitHub's terms as you, which only you can do. It takes about two minutes:

1. Go to <https://github.com/signup>
2. Use `guptaarvind29042000@gmail.com`
3. Pick a username — `arvind-gupta-rpa` or `arvindgupta-automation` reads well on a resume; the username becomes part of every repo URL, so prefer your name over a nickname
4. Verify the email, then enable two-factor authentication (Settings → Password and authentication)

## 2. Create the repository

On GitHub: **New repository** → name it `portfolio` → **Public** → do **not** add a README, .gitignore or licence (this repo already has what it needs).

## 3. Push

From this folder:

```bash
git remote add origin https://github.com/<your-username>/portfolio.git
git branch -M main
git push -u origin main
```

GitHub will ask for a password — use a **personal access token**, not your account password:
Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → scope `repo`.

## 4. Put it online (Vercel, free)

1. <https://vercel.com/signup> → **Continue with GitHub**
2. **Add New → Project** → import `portfolio`
3. Environment variables:
   - `NEXT_PUBLIC_SITE_URL` = the URL Vercel gives you (e.g. `https://portfolio-arvind.vercel.app`)
   - `ANTHROPIC_API_KEY` = your key — **optional**. Without it the assistant still answers correctly from your resume; with it the answers become more conversational.
4. **Deploy**

Every later `git push` redeploys automatically.

## 5. Once it is live

- Add the URL to your resume, your email signature and your LinkedIn profile.
- Add your LinkedIn and GitHub links to `src/data/profile.ts` → `socials`. The footer, contact section and AI assistant all read from that one array, so they update together.
- Run Lighthouse on the deployed URL (Chrome DevTools → Lighthouse) and keep the number you actually measure.

## Updating the site later

Everything the site says lives in `src/data/`. Change a job, add a project, add a skill — edit the data file and push. No component needs touching, and the AI assistant picks up the change automatically because it reads the same files.

Before pushing a change:

```bash
npm run verify        # types, lint, 152 tests, production build
```
