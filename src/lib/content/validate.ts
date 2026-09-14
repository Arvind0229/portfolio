/**
 * The shared shape-checking used by every content validator.
 *
 * ## The contract these enforce, which is the important part
 *
 * Content files are written by an admin panel over a network. Even with one
 * author that makes them untrusted input, and the rule set by `parseDepth` and
 * followed since is: **validate and drop, never throw.** One malformed field
 * must never be able to take the site down.
 *
 * The consequence is deliberate and worth stating plainly: a save that contains
 * a bad field succeeds, and the bad field is silently absent. The alternative —
 * refusing the whole save — means a single typo in one of forty fields loses
 * the other thirty-nine, and it means a file that somehow became malformed
 * takes the *public site* down rather than just looking wrong in the panel.
 *
 * Falling back to a known-good value is the other rejected option. A field that
 * quietly reverts to something the admin did not type is worse than one that is
 * missing, because the person sees what they expect and the site shows
 * something else.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A non-empty trimmed string, or null. Empty is treated as absent. */
export function str(value: unknown, max = 4_000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

/**
 * A list of non-empty strings.
 *
 * Bad entries are dropped individually rather than invalidating the list — a
 * stray blank line in a textarea should not lose the six good lines above it,
 * and a textarea is exactly how these are edited.
 */
export function strList(value: unknown, max = 200, maxItems = 60): readonly string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const text = str(entry, max);
    if (text) out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * A URL safe to put in an `href`.
 *
 * An allow-list, not a block-list: `javascript:` is not a hypothetical here,
 * because these values are typed into a form and rendered straight into a link,
 * and a block-list is only ever as complete as the last scheme someone thought
 * of. `http:` is refused too — a portfolio linking out over plaintext in 2026
 * is a downgrade with no upside.
 *
 * `tel:` earns its place the hard way. The first version of this function
 * allowed only `https:` and `mailto:`, which silently dropped the phone link
 * out of the footer the moment the profile moved behind this validator — the
 * page still rendered, it just stopped offering a way to ring him. All three
 * schemes hand the string to the operating system to open a mail client, a
 * dialler or a browser; none of them execute it. That is the line.
 */
const SAFE_PROTOCOLS = new Set(['https:', 'mailto:', 'tel:']);

export function safeUrl(value: unknown): string | null {
  const text = str(value, 2_000);
  if (!text) return null;
  try {
    return SAFE_PROTOCOLS.has(new URL(text).protocol) ? text : null;
  } catch {
    return null;
  }
}

/**
 * An identifier safe to use as a key, a `data-testid` and a URL fragment.
 *
 * Deliberately narrow. These ids end up in markup and in object keys, and the
 * cost of a permissive pattern is discovering later that one of them broke a
 * selector or collided with a prototype property.
 */
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function id(value: unknown): string | null {
  const text = str(value, 64);
  if (!text || !ID.test(text)) return null;
  // `__proto__` and friends cannot match the pattern above, but the object this
  // becomes a key on is built with a null prototype anyway — see `keyedBy`.
  return text;
}

/** Builds a prototype-less record, so a key can never reach Object.prototype. */
export function keyedBy<T>(entries: Iterable<[string, T]>): Record<string, T> {
  const out = Object.create(null) as Record<string, T>;
  for (const [key, value] of entries) out[key] = value;
  return out;
}
