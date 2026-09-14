import type { ResumeFormat } from '@/lib/admin/resume-validation';
import type { ResumeRegistry, ResumeVersion } from '@/types';

/**
 * The two decisions an upload makes, as pure functions.
 *
 * They live here rather than in the route for the same reason
 * `resume-validation.ts` does: a route handler can only be tested by
 * round-tripping a multipart body, and the interesting behaviour — what the
 * registry looks like afterwards — has nothing to do with HTTP. Next.js also
 * refuses non-route exports from a route file, so the alternative was leaving
 * them untested.
 */

/** Server-minted, collision-proof, and never derived from the upload. */
export function mintId(label: string, registry: ResumeRegistry): string {
  const slug =
    label
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'resume';
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const base = `${stamp}-${slug}`.slice(0, 60);

  let id = base;
  let n = 2;
  const taken = new Set(registry.versions.map((version) => version.id));
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

/**
 * Folds an upload into the registry.
 *
 * Uploading a DOCX for a version that already has a PDF **adds to that version**
 * rather than creating a second one — the two files are one resume in two
 * formats, and treating them as separate versions would let the site offer a
 * PDF and a DOCX with different content in them.
 */
export function applyUpload(
  registry: ResumeRegistry,
  upload: { id: string; label: string; format: ResumeFormat; url: string; bytes: number },
): ResumeRegistry {
  const current = registry.versions.find((version) => version.id === registry.active);
  const extendsActive =
    upload.format === 'docx' && current !== undefined && current.docx === undefined;

  if (extendsActive && current) {
    return {
      active: current.id,
      versions: registry.versions.map((version) =>
        version.id === current.id ? { ...version, docx: upload.url } : version,
      ),
    };
  }

  const version: ResumeVersion = {
    id: upload.id,
    label: upload.label,
    pdf: upload.format === 'pdf' ? upload.url : '',
    ...(upload.format === 'docx' ? { docx: upload.url } : {}),
    uploadedAt: new Date().toISOString(),
    bytes: upload.bytes,
  };

  // A DOCX-only first upload has no PDF, so it cannot become active — the site
  // would advertise a PDF download pointing at nothing.
  const canActivate = version.pdf.length > 0;
  const active = canActivate ? version.id : registry.active;

  return {
    active,
    versions: prune([...registry.versions, version], active),
  };
}

/**
 * How many resume versions the registry keeps.
 *
 * Not unbounded. A repository is not a place to accumulate binaries without a
 * stated limit, and "we keep everything forever" is a decision by default rather
 * than a decision. Five is enough that rollback covers any mistake a person
 * actually notices — the previous resume, and a few before it — while bounding
 * what the registry can grow into.
 *
 * **What this does and does not reclaim.** It bounds the *list*, so the site
 * and the admin panel stay predictable. It does not delete files: the bytes
 * remain in `public/` and, more to the point, in git history, where they are
 * permanent regardless of what any future code does. That is a property of the
 * storage choice recorded in ADR-001 and it is the honest limit of this rule.
 * At ~60 KB per resume the arithmetic stays comfortable for many years; if that
 * ever stops being true, the answer is object storage, not a cleverer prune.
 */
export const MAX_RESUME_VERSIONS = 5;

function prune(versions: readonly ResumeVersion[], active: string | null): ResumeVersion[] {
  if (versions.length <= MAX_RESUME_VERSIONS) return [...versions];

  // Oldest first, but never drop the active one — trimming the version the site
  // is currently serving would take the resume off the page.
  const kept = versions.slice(-MAX_RESUME_VERSIONS);
  if (active && !kept.some((version) => version.id === active)) {
    const current = versions.find((version) => version.id === active);
    if (current) return [current, ...kept.slice(1)];
  }
  return kept;
}

