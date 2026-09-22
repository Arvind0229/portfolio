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
