import raw from '@/data/photo.json';
import { isRecord, str } from '@/lib/content/validate';
import { validateBlurDataUrl, validateFacePosition } from '@/lib/admin/photo-validation';
import type { ProfilePhoto } from '@/types';

/**
 * Which portrait the site serves, and the ones it used to.
 *
 * ## Why the photo has a registry rather than a field
 *
 * The obvious design is `profile.json` holding a photo path. It fails the first
 * time the photo is replaced: the new file either overwrites the old one — in
 * which case every CDN and browser that cached the old bytes keeps showing them
 * and the change appears not to have worked — or it lands beside it under a
 * name nothing tracks, and going back means knowing which file was which.
 *
 * Naming each file after a hash of its contents solves the caching half, and a
 * registry naming the active one solves the other half. Replacing the photo
 * becomes a write of this file; going back becomes a write of this file. The
 * images are never mutated at all.
 *
 * ## Why the derived fields live here and not in the form
 *
 * `width`, `height` and `blurDataURL` are measurements of one specific file, not
 * opinions about it. They are computed at upload — the dimensions by the server
 * from the file's own header, the blur by the browser that already decoded the
 * image to show a preview — and stored beside the version they describe. A
 * text box around them would be a save away from a page that reflows.
 *
 * `alt` and `facePosition` are the two a person should set, because only a
 * person can say what the photograph shows and where the face sits.
 */
export interface PhotoVersion extends ProfilePhoto {
  readonly id: string;
  readonly label: string;
  readonly uploadedAt: string;
}

export interface PhotoRegistry {
  readonly active: string;
  readonly versions: readonly PhotoVersion[];
}

/**
 * How many versions are kept.
 *
 * Three: the live one and the two before it. Enough that an accidental replace
 * is one click to undo, small enough that the repository does not accumulate
 * portraits nobody will look at again. Every committed file stays in git history
 * regardless — see `docs/architecture.md` §4 — so this bounds the working set,
 * not the repository.
 */
export const MAX_PHOTO_VERSIONS = 3;

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** Only a site-relative path under the directory the writer commits to. */
const SRC = /^\/profile\/[a-z0-9][a-z0-9-]{0,63}\.jpg$/;

function parseVersion(value: unknown): PhotoVersion | null {
  if (!isRecord(value)) return null;

  const id = str(value.id, 64);
  const src = str(value.src, 200);
  const alt = str(value.alt, 200);
  const blurDataURL = validateBlurDataUrl(value.blurDataURL);
  const facePosition = validateFacePosition(value.facePosition);
  const width = typeof value.width === 'number' ? Math.trunc(value.width) : 0;
  const height = typeof value.height === 'number' ? Math.trunc(value.height) : 0;

  // Every one of these is required, because a photo missing any of them renders
  // worse than no photo: no dimensions reflows the page, no alt is inaccessible,
  // and a src outside the committed directory is not ours to serve.
  if (!id || !ID.test(id)) return null;
  if (!src || !SRC.test(src)) return null;
  if (!alt) return null;
  if (width <= 0 || height <= 0) return null;

  return {
    id,
    label: str(value.label, 80) ?? 'Portrait',
    uploadedAt: str(value.uploadedAt, 40) ?? '',
    src,
    width,
    height,
    alt,
    // A missing blur is survivable — the image simply appears without a
    // placeholder — so unlike the fields above it falls back rather than
    // dropping the whole version.
    blurDataURL: blurDataURL ?? '',
    facePosition: facePosition ?? '50% 50%',
  };
}

/**
 * Validate and drop, like every other parser here: a malformed version is
 * ignored, and a registry that is rubbish end to end yields no versions rather
 * than throwing. One bad save must never be able to take the site down.
 */
export function parsePhotoRegistry(value: unknown): PhotoRegistry {
  if (!isRecord(value)) return { active: '', versions: [] };

  const seen = new Set<string>();
  const versions: PhotoVersion[] = [];
  if (Array.isArray(value.versions)) {
    for (const entry of value.versions) {
      const parsed = parseVersion(entry);
      if (!parsed || seen.has(parsed.id)) continue;
      seen.add(parsed.id);
      versions.push(parsed);
    }
  }

  const declared = str(value.active, 64);
  // A pointer at a version that is not here is the one failure that must not
  // blank the portrait, so it falls back to the newest rather than to nothing.
  const active = declared && seen.has(declared) ? declared : (versions[0]?.id ?? '');

  return { active, versions };
}

export const photoRegistry: PhotoRegistry = parsePhotoRegistry(raw);

/**
 * The portrait the site serves.
 *
 * Returns the shape `profile.photo` has always had, so every component that
 * shows his face is unchanged by this file existing.
 */
export function activePhoto(): ProfilePhoto {
  const version = photoRegistry.versions.find((entry) => entry.id === photoRegistry.active);
  if (version) {
    const { id: _id, label: _label, uploadedAt: _uploadedAt, ...photo } = version;
    return photo;
  }

  /*
   * Nothing usable in the registry at all.
   *
   * The page still has to render — a portfolio whose h1 sits above a broken
   * image is worse than one with a gap — so this returns the committed file
   * with honest metadata rather than throwing during the build.
   */
  return {
    src: '/profile/arvind-gupta.jpg',
    width: 1081,
    height: 1351,
    alt: 'Arvind Gupta',
    blurDataURL: '',
    facePosition: '50% 8%',
  };
}
