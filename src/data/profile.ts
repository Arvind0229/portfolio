import type { EducationItem, Profile, SocialLink } from '@/types';
import { activePhoto } from '@/data/photo';
import { activeResume } from '@/data/resume-registry';
import rawProfile from '@/data/profile.json';
import { isRecord, safeUrl, str, strList } from '@/lib/content/validate';

/**
 * Source of truth: Arvind Gupta — RPA Developer resume.
 * Nothing in this file may be added that is not supported by that document.
 * Wording is edited for the web; facts, employers, dates and numbers are not.
 *
 * One figure is more precise than the resume: the years of experience. The
 * resume says "2+ years", which was written at a point in time and has been
 * true for a while; Arvind states it is **2.9 years**, and he is the authority
 * on his own tenure. Stated exactly rather than rounded to "3 years" — a
 * rounded figure a reader can check against the dates below and find wrong is
 * worse than a precise one.
 */
/**
 * Everything the site says about him.
 *
 * ## What is editable and what is not
 *
 * The prose, the contact details and the social links come from
 * `profile.json`, which the admin panel writes. The photo and the resume do
 * not, and that is a deliberate line rather than an omission.
 *
 * `photo.width`, `photo.height` and `blurDataURL` are measured properties of a
 * specific file — a unit test opens the JPEG and asserts the numbers match. Put
 * them in a text box and a save can silently cause layout shift, or fail the
 * build, with nothing on screen to explain why. They are derived data, not
 * content, so they are computed at upload and stored beside the version they
 * describe, in `photo.json`. `activePhoto()` reads it.
 *
 * The resume is absent for the same reason: its own registry, and
 * `resolveResume()` reads it.
 *
 * ## Why the shape is unchanged
 *
 * `Profile` is what forty-odd components and the whole AI knowledge layer read.
 * Moving the *source* of these values behind a validator changed no consumer,
 * which is the entire point of doing it this way.
 */
export const profile: Profile = {
  ...parseProfileContent(rawProfile),
  // The portrait, from the registry that the upload writes. One entry, read by
  // every component that shows his face, so a new photograph is a pointer change
  // rather than a hunt through JSX.
  //
  // The seeded version is a 4:5 crop of the studio headshot he supplied,
  // re-encoded from a 1.9 MB PNG to a 167 KB progressive JPEG — a photograph
  // stored as PNG is many times the bytes for no visible gain, and `next/image`
  // negotiates AVIF/WebP from whatever is stored, per request.
  photo: activePhoto(),

  resume: resolveResume(),
};

export const education: readonly EducationItem[] = [
  {
    id: 'bsc-it',
    qualification: "Bachelor's Degree, Information Technology",
    institution: 'Ghanshyam Das Saraf College, Mumbai',
    period: '2018 – 2021',
  },
  {
    id: 'hsc',
    qualification: 'HSC (Science)',
    institution: 'Durgadevi Saraf College, Mumbai',
    period: '2018',
  },
  {
    id: 'ssc',
    qualification: 'SSC',
    institution: 'Our Lady of Remedy High School, Mumbai',
    period: '2016',
  },
];

export const domainKnowledge: readonly string[] = [
  'Loan Origination',
  'Loan Servicing',
  'Disbursement & Closure',
  'EMI Management',
  'Customer Onboarding & Lifecycle',
  'Collections',
  'Delinquency & NPA Monitoring',
  'Retail Lending',
  'Gold / Mortgage / Business Loans',
  'Loan Against Property (LAP)',
  'Foreclosure',
  'KYC / eKYC / eSign',
  'Account Aggregator',
  'Loan Documentation',
  'Banking Operations & Compliance',
];

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * The resume the site currently serves.
 *
 * Read from the registry rather than written here. These three values used to
 * be literals while the admin upload wrote to a different path entirely, so
 * replacing the resume changed nothing a visitor could see. See
 * `src/data/resume-registry.ts` for the whole story.
 */
function resolveResume(): Profile['resume'] {
  const current = activeResume();
  if (current) {
    return {
      pdf: current.pdf,
      ...(current.docx ? { docx: current.docx } : {}),
      fileLabel: current.label,
    };
  }

  /*
   * No active version. Reachable only if the registry is emptied or corrupted,
   * and the honest answer is an empty path rather than a stale literal that
   * pretends a file is there. The resume section renders an unavailable state
   * from this.
   */
  return { pdf: '', fileLabel: 'Résumé' };
}

/**
 * The editable half of the profile, checked on the way in.
 *
 * Same contract as `parseDepth`: drop what is malformed, never throw. A save
 * that would otherwise take the public site down instead loses one field.
 *
 * The one place that is not true is a **field the site cannot render without**.
 * `name` and `title` appear in the `<h1>`, the page metadata and the JSON-LD;
 * an empty one is not a degraded page, it is a broken one. Those fall back to
 * the value shipped in the repository, which is always a real value because it
 * is what the file was seeded with.
 */
type EditableProfile = Omit<Profile, 'photo' | 'resume'>;

const PROFILE_FALLBACK = {
  name: 'Arvind Gupta',
  shortName: 'Arvind',
  title: 'RPA Developer',
} as const;

function parseSocial(value: unknown): SocialLink | null {
  if (!isRecord(value)) return null;
  const label = str(value.label, 40);
  const href = safeUrl(value.href);
  // A link with no destination is not a link, and an unlabelled one is an
  // anchor a screen reader announces as "link".
  if (!label || !href) return null;

  /*
   * The id is derived from the label rather than typed.
   *
   * It exists to be a React key and a test handle — it is not content, and
   * asking a person to invent a slug is asking them to get it wrong. Deriving
   * it means one less field in the form and one less thing a save can break.
   */
  const slug =
    str(value.id, 64)?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ??
    label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return {
    id: slug || 'link',
    label,
    href,
    handle: str(value.handle, 120) ?? label,
  };
}

export function parseProfileContent(value: unknown): EditableProfile {
  const raw = isRecord(value) ? value : {};

  const socials: SocialLink[] = [];
  if (Array.isArray(raw.socials)) {
    for (const entry of raw.socials) {
      const social = parseSocial(entry);
      if (social) socials.push(social);
      if (socials.length >= 12) break;
    }
  }

  return {
    name: str(raw.name, 80) ?? PROFILE_FALLBACK.name,
    shortName: str(raw.shortName, 40) ?? PROFILE_FALLBACK.shortName,
    title: str(raw.title, 80) ?? PROFILE_FALLBACK.title,
    positioning: str(raw.positioning) ?? '',
    positioningThirdPerson: str(raw.positioningThirdPerson) ?? '',
    summary: str(raw.summary) ?? '',
    summaryThirdPerson: str(raw.summaryThirdPerson) ?? '',
    location: str(raw.location, 120) ?? '',
    email: str(raw.email, 254) ?? '',
    phone: str(raw.phone, 40) ?? '',
    availability: str(raw.availability, 200) ?? '',
    focusAreas: strList(raw.focusAreas, 120, 12),
    socials,
  };
}
