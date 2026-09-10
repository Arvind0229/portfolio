# Getting this on GitHub and online

The repository in this folder is already a git repository — nothing to initialise, nothing to tidy. `node_modules`, `.next`, `.env*` and test output are all ignored, and the working tree has been checked: the only strings that look like credentials are placeholders (`github_pat_...` in the setup script, `ghp_not_a_real_token` in a test, and the deliberately public E2E secrets in `playwright.config.ts`). There is nothing real to leak.

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

GitHub will ask for a password. **Your account password will not work** — GitHub stopped accepting it for pushes in 2021. Use a **personal access token** instead:

Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
- Repository access: **Only select repositories** → `portfolio`
- Permissions → Repository permissions → **Contents: Read and write**
- Nothing else. A token that can only touch this one repository is a token whose loss costs you this one repository.

Paste the token when git asks for the password. Windows will remember it after the first time.

*(Classic tokens with the `repo` scope also work, but that scope grants access to **every** repository you own — including private ones you make later. Fine-grained is the better habit.)*

## 4. Put it online (Vercel, free)

1. <https://vercel.com/signup> → **Continue with GitHub**
2. **Add New → Project** → import `portfolio`
3. Environment variables:
   - `NEXT_PUBLIC_SITE_URL` = the URL Vercel gives you (e.g. `https://portfolio-arvind.vercel.app`)
   - `ANTHROPIC_API_KEY` = your key — **optional**. Without it the assistant still answers correctly from your resume; with it the answers become more conversational.
4. **Deploy**

### Turning on the admin page for the live site

Optional, and the site works fully without it. Skip it until you actually want to edit from somewhere other than your laptop — on your own machine `/admin` never asks for a code.

Run `npm run admin:secret` locally. It prints everything and writes nothing to disk, deliberately: a script that helpfully saved secrets into a file is a script that eventually saves them into a commit. Then in Vercel → Settings → Environment Variables:

| Variable | What it is |
| --- | --- |
| `ADMIN_TOTP_SECRET` | The key you also type into your authenticator app |
| `ADMIN_SESSION_SECRET` | Signs the login cookie. Changing it signs you out everywhere — that is the whole "log me out" button |
| `ADMIN_GITHUB_REPO` | `your-username/portfolio` |
| `ADMIN_GITHUB_TOKEN` | The fine-grained token from step 3 above |
| `ADMIN_GITHUB_BRANCH` | `main` |

Without the three `ADMIN_GITHUB_*` values the admin page still opens and still refuses to save — and says exactly which variable is missing rather than failing quietly.

**How a live edit reaches the site:** you save → it commits to this repository → Vercel sees the commit and redeploys → the change is live in a minute or two. There is no database and no second copy of your content. `src/data` stays the only source of truth, and every edit is in your git history where you can read it or undo it.

Every later `git push` redeploys automatically.

## 5. Once it is live

- Add the URL to your resume, your email signature and your LinkedIn profile.
- Add your LinkedIn and GitHub links to `src/data/profile.ts` → `socials`. The footer, contact section and AI assistant all read from that one array, so they update together.
- Run Lighthouse on the deployed URL (Chrome DevTools → Lighthouse) and keep the number you actually measure.

## Updating the site later

Everything the site says lives in `src/data/`. Change a job, add a project, add a skill — edit the data file and push. No component needs touching, and the AI assistant picks up the change automatically because it reads the same files.

Two ways to make those edits:

- **The admin page.** `npm run dev`, then <http://localhost:3000/admin>. No sign-in on your own machine — that page is not reachable from the internet. Fill the form, Save, then push. Project detail written here is what lets the assistant answer follow-up questions instead of repeating the resume.
- **The files directly**, in VS Code, if you prefer.

Before pushing a change:

```bash
npm run verify        # types, lint, unit tests, production build, dev console check
```
