type ClassValue = string | number | null | undefined | false | ClassValue[];

/**
 * Minimal class-name joiner.
 *
 * `clsx` would do the same job in 240 bytes, but this is 8 lines with no
 * dependency, no version to track and no supply-chain surface. When the
 * project needs conditional variant merging beyond this, revisit the decision.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }
  return out.join(' ');
}
