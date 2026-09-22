# Change: Admin save errors say why (CHANGE-014)

## Date
2026-09-22

## Request
Saving from the live admin showed "This site defaults was changed somewhere else after this form was opened. Reload…" again after Reload.

## Current State (root cause)
`createGitHubWriter.write` turned every 409 and 422 from GitHub into `ConflictError`. GitHub also uses those statuses for refusals no reload can fix: a repository rule that blocks direct commits (409) or a branch that does not exist (422). The real reason was hidden.

## Proposed Solution
- 409/422 stay a conflict only when GitHub's `message` is not about a rule or a missing branch.
- Every other refusal throws `GitHubWriteError(status, kind)` with a kind of auth, forbidden, not-found, rule or other.
- `describeWriteFailure(error, mode)` turns it into a sentence saying what to fix (token, repository access, ADMIN_GITHUB_REPO/BRANCH, or branch rule).
- It is used by the content, depth, resume and photo routes.

## Security Impact
GitHub's response text is matched, never shown or logged, because it can echo the request. A test asserts that the token and GitHub's text never appear in the message.

## Testing Performed
- `tsc` clean and ESLint clean.
- Vitest: 36 files, 489 tests passed. That includes the new `content-writer-failures.test.ts` (8 cases) and the existing concurrency tests, unchanged.

## Rollback
Revert to tag `pre-change-014`.

## Final Status
Implemented and tested in the cloud copy and applied to the laptop. Not deployed; it goes live with the next push.

## Follow-up: CHANGE-015 (same day)

### Save still read "changed somewhere else" after CHANGE-014
- 409/422 is now a conflict only when GitHub's message names a stale sha ("does not match" / "but expected"), or when there is no message at all.
- Any other refusal shows GitHub's short reason. Token-shaped strings are removed from it and it is cut to 200 characters. The admin page is behind MFA.
- The reason is also written to the Vercel function logs as `GitHub write refused: <status> <reason>`. Conflicts are logged too, as `GitHub write conflict: <status> (sent sha …)`.
- The two existing concurrency tests used made-up messages ("conflict", "sha mismatch"). They now use GitHub's real wording.

### Resume file "disappears" after choosing it
- Root cause: an upload starts as soon as a file is chosen, and the picker is then cleared. The result message was rendered only inside the Projects tab's save bar, so on the Resume tab nothing appeared.
- Fix: the Resume section now has its own status line (`admin-resume-status`), showing "Uploading…" and then the result. On success the version list updates straight away.

### Testing
- `tsc` clean and ESLint clean.
- Vitest: 36 files, 490 tests passed.
- Playwright `admin.spec.ts`: 24 passed across desktop-1440 and mobile-390. That includes the new resume-status test.

### Rollback
Revert to tag `pre-change-015`.
