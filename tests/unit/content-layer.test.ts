import { describe, expect, it } from 'vitest';
import { profile, parseProfileContent } from '@/data/profile';
import { skillGroups, parseSkillGroups } from '@/data/skills';
import { CONTENT, contentDefinition } from '@/lib/content/registry';
import { WRITABLE } from '@/lib/admin/content-writer';
import { id, safeUrl, str, strList } from '@/lib/content/validate';
import rawProfile from '@/data/profile.json';
import rawSkills from '@/data/skills.json';

describe('the migration changed nothing the site renders', () => {
  /*
   * The regression that matters for this change.
   *
   * Profile and skills moved from TypeScript literals to JSON read through a
   * validator. If the validator drops or renames anything, the site quietly
   * loses content and no other test would say so — the page still renders, it
   * just says less about him.
   */
  it('keeps every profile field the site reads', () => {
    expect(profile.name).toBe('Arvind Gupta');
    expect(profile.title).toBe('RPA Developer');
    expect(profile.email).toContain('@');
    expect(profile.phone.length).toBeGreaterThan(10);
    expect(profile.location.length).toBeGreaterThan(0);
    expect(profile.summary.length).toBeGreaterThan(200);
    expect(profile.summaryThirdPerson.length).toBeGreaterThan(200);
    expect(profile.positioning.length).toBeGreaterThan(20);
    expect(profile.focusAreas.length).toBeGreaterThan(3);
    expect(profile.socials.length).toBeGreaterThan(0);
  });

  it('survives the round trip through its own parser', () => {
    // Parsing what was just parsed must be a no-op, or a save would slowly
    // erode the content it rewrites each time.
    const once = parseProfileContent(rawProfile);
    const twice = parseProfileContent({ ...once });
    expect(twice).toEqual(once);
  });

  it('keeps every social link that is actually in the file', () => {
    /*
     * The test that was missing, and the one that would have caught the defect.
     *
     * The round-trip test above parses already-parsed output, so anything the
     * first parse dropped is invisible to it — and the first parse is exactly
     * where a too-narrow validator loses a link. `tel:` was refused by
     * `safeUrl`, so moving the profile behind the validator quietly removed the
     * phone link from the footer: the page still rendered, it just stopped
     * offering a way to ring him, and every other test still passed.
     *
     * Counting the source entries against the parsed ones is the check that
     * fails loudly the next time a validator is narrowed.
     */
    const declared = (rawProfile as { socials: Array<{ id: string; href: string }> }).socials;
    expect(profile.socials).toHaveLength(declared.length);
    for (const social of declared) {
      expect(
        profile.socials.some((parsed) => parsed.href === social.href),
        `social ${social.id} (${social.href}) was dropped by the parser`,
      ).toBe(true);
    }
  });

  it('still offers a phone link in the footer', () => {
    // Named explicitly, because "the counts match" would also be satisfied by
    // deleting the entry from the file. This is the behaviour, not the shape.
    const phone = profile.socials.find((social) => social.href.startsWith('tel:'));
    expect(phone, 'no tel: link — the footer lost its call action').toBeDefined();
  });

  it('keeps every skill group and every skill', () => {
    const fromFile = (rawSkills as { groups: Array<{ id: string; skills: string[] }> }).groups;
    expect(skillGroups).toHaveLength(fromFile.length);
    for (const group of fromFile) {
      const parsed = skillGroups.find((entry) => entry.id === group.id);
      expect(parsed, `group ${group.id} was dropped`).toBeDefined();
      expect(parsed?.skills).toHaveLength(group.skills.length);
    }
  });

  it('leaves the photo out of the editable layer', () => {
    /*
     * Deliberate. `width`, `height` and `blurDataURL` are measured properties
     * of a specific file — a unit test opens the JPEG and checks them. In a
     * text box they are a save away from layout shift or a failed build, with
     * nothing on screen to explain why. They are derived data, not content.
     */
    expect(Object.keys(rawProfile)).not.toContain('photo');
    expect(profile.photo.width).toBeGreaterThan(0);
    expect(profile.photo.blurDataURL.startsWith('data:image/')).toBe(true);
  });

  it('leaves the resume out of the editable layer too', () => {
    // It has its own registry, with version history the profile form has no
    // business overwriting.
    expect(Object.keys(rawProfile)).not.toContain('resume');
    expect(profile.resume.pdf.length).toBeGreaterThan(0);
  });
});

describe('profile validation', () => {
  it('drops a malformed field instead of throwing', () => {
    const parsed = parseProfileContent({
      name: 'Someone',
      email: 12345,
      focusAreas: ['good', '', null, 'also good'],
      socials: 'not an array',
    });
    expect(parsed.name).toBe('Someone');
    expect(parsed.email).toBe('');
    expect(parsed.focusAreas).toEqual(['good', 'also good']);
    expect(parsed.socials).toEqual([]);
  });

  it('falls back only for fields the page cannot render without', () => {
    /*
     * `name` and `title` are in the h1, the metadata and the JSON-LD. An empty
     * one is not a degraded page, it is a broken one — so those fall back.
     * Everything else is allowed to be empty, because an absent line is honest
     * and a substituted one is not.
     */
    const parsed = parseProfileContent({});
    expect(parsed.name).toBe('Arvind Gupta');
    expect(parsed.title).toBe('RPA Developer');
    expect(parsed.summary).toBe('');
    expect(parsed.availability).toBe('');
  });

  it('survives complete rubbish', () => {
    for (const rubbish of [null, undefined, 42, 'text', []]) {
      expect(() => parseProfileContent(rubbish)).not.toThrow();
      expect(parseProfileContent(rubbish).name).toBe('Arvind Gupta');
    }
  });

  it('refuses a social link that is not a safe URL', () => {
    /*
     * The one that would actually hurt. These values are typed into a form and
     * rendered straight into an href, so `javascript:` is not hypothetical.
     */
    const parsed = parseProfileContent({
      socials: [
        { label: 'Bad', href: 'javascript:alert(1)' },
        { label: 'Also bad', href: 'data:text/html,<script>alert(1)</script>' },
        { label: 'Insecure', href: 'http://example.com' },
        { label: 'Fine', href: 'https://example.com' },
        { label: 'Mail', href: 'mailto:a@b.com' },
        { label: 'Call', href: 'tel:+911234567890' },
      ],
    });
    expect(parsed.socials.map((social) => social.label)).toEqual(['Fine', 'Mail', 'Call']);
  });

  it('gives every social link an id without asking anyone to type one', () => {
    const parsed = parseProfileContent({
      socials: [{ label: 'GitHub Profile', href: 'https://github.com/x' }],
    });
    expect(parsed.socials[0]?.id).toBe('github-profile');
  });

  it('caps list lengths so one save cannot bloat the bundle', () => {
    const parsed = parseProfileContent({
      focusAreas: Array.from({ length: 500 }, (_, n) => `area ${n}`),
      socials: Array.from({ length: 500 }, (_, n) => ({
        label: `L${n}`,
        href: 'https://example.com',
      })),
    });
    expect(parsed.focusAreas.length).toBeLessThanOrEqual(12);
    expect(parsed.socials.length).toBeLessThanOrEqual(12);
  });
});

describe('skills validation', () => {
  it('drops a group with no skills rather than rendering an empty card', () => {
    // A heading with nothing under it reads as a loading state that never
    // finished — worse than the group being absent.
    const parsed = parseSkillGroups({
      groups: [
        { id: 'a', name: 'Has skills', skills: ['One'] },
        { id: 'b', name: 'Empty', skills: [] },
        { id: 'c', name: 'No skills key' },
      ],
    });
    expect(parsed.map((group) => group.id)).toEqual(['a']);
  });

  it('refuses a duplicate id, which would collide as a React key', () => {
    const parsed = parseSkillGroups({
      groups: [
        { id: 'dup', name: 'First', skills: ['x'] },
        { id: 'dup', name: 'Second', skills: ['y'] },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.name).toBe('First');
  });

  it('refuses an id that is not safe as a key or a selector', () => {
    for (const bad of ['../x', 'has space', 'UPPER', '__proto__', '']) {
      const parsed = parseSkillGroups({ groups: [{ id: bad, name: 'X', skills: ['y'] }] });
      expect(parsed, `${bad} survived`).toEqual([]);
    }
  });

  it('survives complete rubbish', () => {
    for (const rubbish of [null, undefined, 42, 'text', [], { groups: 'no' }]) {
      expect(parseSkillGroups(rubbish)).toEqual([]);
    }
  });
});

describe('the content registry', () => {
  it('resolves only keys it declares', () => {
    expect(contentDefinition('profile')).not.toBeNull();
    expect(contentDefinition('skills')).not.toBeNull();
    expect(contentDefinition('nope')).toBeNull();
  });

  it('cannot be tricked into resolving an inherited property', () => {
    // A bare lookup would return a function for these and treat it as a
    // definition — the key comes straight from a URL.
    for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(contentDefinition(key), `${key} resolved`).toBeNull();
    }
  });

  it('points every definition at a declared writable target', () => {
    // A definition naming a target the writer does not know is a save that
    // fails at the last step, after the person has typed everything.
    for (const [key, definition] of Object.entries(CONTENT)) {
      expect(Object.keys(WRITABLE), `${key} has no writable target`).toContain(
        definition.target,
      );
    }
  });

  it('round-trips through serialize and parse without loss', () => {
    for (const [key, definition] of Object.entries(CONTENT)) {
      const source = key === 'profile' ? rawProfile : rawSkills;
      const parsed = definition.parse(source);
      const serialized = definition.serialize(parsed);
      expect(definition.parse(serialized), `${key} lost data on a round trip`).toEqual(parsed);
    }
  });

  it('accepts its own output, because that is what a save sends back', () => {
    /*
     * The test that was missing, and the bug it would have caught.
     *
     * A save is a loop: GET returns `definition.parse(file)`, the panel edits
     * that value, and PUT sends it back to `definition.parse` again. So the
     * parser must accept its own output, not only the file it came from.
     *
     * `parseSkillGroups` did not. It read `value.groups`, an `isRecord` guard
     * rejected the bare array the panel sends, and parsing produced `[]` — so
     * saving skills silently did nothing. Nothing threw, nothing logged, and
     * the round-trip test above passed the whole time because it only ever fed
     * the parser the *file* shape, which was never the broken one.
     *
     * It shipped. It was found when the company editor hit the same wall during
     * UAT, which is later than it should have been — hence this test, over
     * every key rather than the one that failed.
     */
    for (const [key, definition] of Object.entries(CONTENT)) {
      const source = key === 'profile' ? rawProfile : rawSkills;
      const fromGet = definition.parse(source);
      expect(definition.parse(fromGet), `a save of ${key} would be dropped`).toEqual(fromGet);
    }
  });

  it('never throws, whatever it is given', () => {
    for (const definition of Object.values(CONTENT)) {
      for (const rubbish of [null, undefined, 42, 'text', [], { a: 1 }]) {
        expect(() => definition.parse(rubbish)).not.toThrow();
      }
    }
  });
});

describe('the shared validators', () => {
  it('treats an empty or over-long string as absent', () => {
    expect(str('')).toBeNull();
    expect(str('   ')).toBeNull();
    expect(str('x'.repeat(10_000), 100)).toBeNull();
    expect(str('  trimmed  ')).toBe('trimmed');
  });

  it('accepts only the three schemes that hand off rather than execute', () => {
    expect(safeUrl('https://x.test')).toBe('https://x.test');
    expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(safeUrl('tel:+911234567890')).toBe('tel:+911234567890');
    for (const bad of ['javascript:alert(1)', 'http://x.test', 'data:text/html,x', 'file:///etc', 'not a url']) {
      expect(safeUrl(bad), `${bad} was accepted`).toBeNull();
    }
  });

  it('keeps ids narrow enough to be safe as keys and selectors', () => {
    expect(id('rpa')).toBe('rpa');
    expect(id('a-b-1')).toBe('a-b-1');
    for (const bad of ['-leading', 'UPPER', 'has space', 'a/b', '__proto__', '']) {
      expect(id(bad), `${bad} was accepted`).toBeNull();
    }
  });

  it('drops bad entries individually rather than losing the list', () => {
    // A stray blank line in a textarea should not lose the six good lines
    // above it, and a textarea is exactly how these are edited.
    expect(strList(['a', '', null, 'b', 42, '  c  '])).toEqual(['a', 'b', 'c']);
    expect(strList('not an array')).toEqual([]);
  });
});
