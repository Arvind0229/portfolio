import raw from '@/data/companies.json';
import { id as safeId, isRecord, safeUrl, str } from '@/lib/content/validate';

/**
 * The employers, as reusable entities.
 *
 * ## Why a company is not a field on a role
 *
 * The obvious model puts the company name inside each role, and it is wrong the
 * first time there are two roles at one employer — which is the ordinary shape
 * of a career, and the shape Arvind's is already heading towards. Two copies of
 * a company means two places to change its description and one of them will be
 * missed; three roles means three.
 *
 * There is a second reason, and it is the one that decided it. These
 * descriptions have a **different provenance** from everything else the site
 * says about him. The roles come from his resume. The company profiles do not —
 * the resume does not describe its own employers — so they were checked against
 * each company's own site and public reporting. Keeping them in their own file
 * keeps that line visible: `experience.json` is resume-sourced, `companies.json`
 * is externally sourced, and nobody has to remember which half of a merged
 * record is which.
 *
 * ## What a dangling reference does
 *
 * A role naming a company that is not here is dropped, not rendered with a
 * blank employer. See `experience.ts` — this is the first relationship in the
 * content model, and ADR-002 records why it resolves that way.
 */
export interface Company {
  readonly id: string;
  readonly name: string;
  readonly website: string;
  /** Site-relative path, or empty. No logo is a fine state; a broken one is not. */
  readonly logo: string;
  readonly location: string;
  readonly industry: string;
  readonly description: string;
  /**
   * Why this employer's context matters to what he does.
   *
   * Deliberately about the company and not about him — the achievements belong
   * to the role. Optional, because a future employer may not need the framing.
   */
  readonly relevance: string;
}

/** Only a site-relative image path, never an off-site URL. */
const LOGO = /^\/[a-z0-9][a-z0-9\-/]{0,120}\.(svg|png|jpg|webp)$/;

function parseCompany(key: string, value: unknown): Company | null {
  if (!isRecord(value)) return null;

  const id = safeId(key);
  const name = str(value.name, 120);
  // The name is the only field a company cannot do without: it is what the
  // section headline says and what the AI answers with.
  if (!id || !name) return null;

  const logo = str(value.logo, 200);

  return {
    id,
    name,
    // `safeUrl` refuses `javascript:` and plain http. A company without a
    // website simply has no link rather than a broken one.
    website: safeUrl(value.website) ?? '',
    logo: logo && LOGO.test(logo) ? logo : '',
    location: str(value.location, 120) ?? '',
    industry: str(value.industry, 120) ?? '',
    description: str(value.description, 2_000) ?? '',
    relevance: str(value.relevance, 2_000) ?? '',
  };
}

/**
 * Validate and drop, like every other parser here. A malformed company is
 * ignored rather than throwing, and the roles that referenced it are dropped in
 * turn — a role with a blank employer is worse than a role that is not shown.
 */
export function parseCompanies(value: unknown): readonly Company[] {
  /*
   * Three shapes, because this value travels a loop.
   *
   * On disk it is `{ companies: { sbfc: {...} } }` — keyed by id, so a
   * duplicate is unrepresentable rather than merely rejected. The admin route
   * returns the *parsed* value, which is an array with the id as a field, and
   * the panel PUTs that array straight back. A parser that only understood the
   * file would silently turn every save into an empty list.
   *
   * That is not hypothetical: it is exactly what was happening to `skills`
   * before this was written, undetected, because the round-trip test only ever
   * fed the parser the file shape.
   */
  const entries: Array<[string, unknown]> = Array.isArray(value)
    ? value
        .filter((entry): entry is Record<string, unknown> => isRecord(entry))
        .map((entry) => [typeof entry.id === 'string' ? entry.id : '', entry])
    : isRecord(value)
      ? Object.entries(isRecord(value.companies) ? value.companies : value)
      : [];

  const out: Company[] = [];
  const seen = new Set<string>();
  for (const [key, entry] of entries) {
    if (key.startsWith('$')) continue;
    const company = parseCompany(key, entry);
    if (!company || seen.has(company.id)) continue;
    seen.add(company.id);
    out.push(company);
  }
  return out;
}

export const companies: readonly Company[] = parseCompanies(raw);

/** Lookup by id. `null` rather than a placeholder — the caller decides. */
export function companyById(id: string): Company | null {
  return companies.find((company) => company.id === id) ?? null;
}
