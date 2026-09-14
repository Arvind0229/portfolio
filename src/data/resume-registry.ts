import type { ResumeRegistry, ResumeVersion } from '@/types';
import raw from '@/data/resume-registry.json';

/**
 * Which resume the site serves, and every version that came before it.
 *
 * ## The bug this exists to fix
 *
 * Uploading a resume used to write `public/resume.pdf`, while every download
 * button on the site pointed at `/resume/Arvind-Gupta-RPA-Developer.pdf`. Two
 * paths, no connection between them. The upload succeeded, reported success,
 * and changed nothing a visitor could see — and because it *looked* like it
 * worked, nothing would ever have flagged it. The DOCX could not be replaced
 * at all.
 *
 * The root cause was not a wrong string. It was that **the uploader and the
 * renderer each held their own idea of where the resume lives.** Fixing the
 * string would have left that intact, and the next feature would have broken it
 * again. So there is now exactly one answer to "which file is the resume", both
 * sides read it, and it is data rather than a constant in a component.
 *
 * ## Why versions are kept rather than overwritten
 *
 * Each upload lands at `/resume/<id>.<ext>` with a fresh id and nothing is ever
 * overwritten. Two things fall out of that for free:
 *
 *   - **Rollback** is changing which id is active. The previous file is still
 *     there, byte for byte. No restore procedure to write, and none to forget
 *     to test.
 *   - **A stale CDN copy cannot serve the wrong resume.** A new upload is a new
 *     URL, so there is no cache to bust — the failure mode where a recruiter
 *     downloads last month's resume because an edge node held the old bytes
 *     simply cannot happen.
 *
 * The cost is that old files accumulate. A resume is tens of kilobytes and he
 * uploads a few a year, so the arithmetic says this is not a problem for a very
 * long time. `active` is the only field that decides what the site serves.
 *
 * ## Validation
 *
 * Same contract as `parseDepth`: this file is written by an admin panel over a
 * network, so it is untrusted input even though only one person can write it.
 * A malformed entry is **dropped, not thrown on** — a bad save must never be
 * able to take the site down, and a resume section missing one historical
 * version is a far better outcome than a page that will not render.
 */

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseVersion(value: unknown): ResumeVersion | null {
  if (!isRecord(value)) return null;

  const id = str(value.id);
  const pdf = str(value.pdf);
  if (!id || !ID.test(id) || !pdf) return null;

  // A version with no PDF is not a resume anyone can download, so the PDF is
  // required and the DOCX is not — he has always offered both, but the DOCX is
  // a convenience and its absence should not invalidate the entry.
  const docx = str(value.docx);
  const label = str(value.label) ?? 'Résumé';
  const uploadedAt = str(value.uploadedAt);
  const bytes = typeof value.bytes === 'number' && value.bytes > 0 ? value.bytes : null;

  return {
    id,
    label,
    pdf,
    ...(docx ? { docx } : {}),
    ...(uploadedAt ? { uploadedAt } : {}),
    ...(bytes ? { bytes } : {}),
  };
}

export function parseResumeRegistry(value: unknown): ResumeRegistry {
  const empty: ResumeRegistry = { active: null, versions: [] };
  if (!isRecord(value)) return empty;

  const list = Array.isArray(value.versions) ? value.versions : [];
  const versions: ResumeVersion[] = [];
  const seen = new Set<string>();

  for (const entry of list) {
    const parsed = parseVersion(entry);
    // A duplicate id would make `active` ambiguous, which is the one thing this
    // structure must never be. First one wins.
    if (parsed && !seen.has(parsed.id)) {
      seen.add(parsed.id);
      versions.push(parsed);
    }
  }

  /*
   * `active` must name a version that survived validation. If it points at
   * something that was dropped — or at nothing — fall back to the newest entry
   * rather than leaving the site with no resume. An out-of-date resume is a
   * small problem; a Download button that 404s in front of a recruiter is not.
   */
  const claimed = str(value.active);
  const active =
    claimed && seen.has(claimed) ? claimed : (versions[versions.length - 1]?.id ?? null);

  return { active, versions };
}

export const resumeRegistry: ResumeRegistry = parseResumeRegistry(raw);

export function activeResume(
  registry: ResumeRegistry = resumeRegistry,
): ResumeVersion | null {
  if (!registry.active) return null;
  return registry.versions.find((version) => version.id === registry.active) ?? null;
}
