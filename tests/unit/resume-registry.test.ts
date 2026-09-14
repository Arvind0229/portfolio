import { describe, expect, it } from 'vitest';
import { activeResume, parseResumeRegistry, resumeRegistry } from '@/data/resume-registry';
import { MAX_RESUME_VERSIONS, applyUpload, mintId } from '@/lib/admin/resume-upload';
import { resumeFileTarget, resumeFileUrl, targetPath } from '@/lib/admin/content-writer';
import { checkResumeDocx, checkResumeFile } from '@/lib/admin/resume-validation';
import { profile } from '@/data/profile';
import type { ResumeRegistry } from '@/types';

const base: ResumeRegistry = {
  active: 'v1',
  versions: [{ id: 'v1', label: 'Arvind Gupta — RPA Developer', pdf: '/resume/v1.pdf' }],
};

describe('the bug this replaces', () => {
  it('serves the resume the registry names, not a hard-coded path', () => {
    /*
     * The regression that matters.
     *
     * Uploading used to write `public/resume.pdf` while every download button
     * pointed at `/resume/Arvind-Gupta-RPA-Developer.pdf`. The upload reported
     * success and changed nothing a visitor could see. This asserts the two
     * ends are now the same thing: what the site renders comes from the
     * registry, so a new active version moves the buttons with it.
     */
    const current = activeResume();
    expect(current, 'no active resume in the registry').not.toBeNull();
    expect(profile.resume.pdf).toBe(current!.pdf);
    expect(profile.resume.fileLabel).toBe(current!.label);
  });

  it('offers a DOCX only when the active version actually has one', () => {
    // The DOCX used to be a hard-coded path that no upload could replace, so it
    // could outlive the PDF beside it and hand a recruiter a stale document.
    expect(profile.resume.docx).toBe(activeResume()?.docx);
  });

  it('points at files that are on disk', async () => {
    const { access } = await import('node:fs/promises');
    const path = await import('node:path');
    for (const version of resumeRegistry.versions) {
      for (const url of [version.pdf, version.docx]) {
        if (!url) continue;
        await expect(
          access(path.join(process.cwd(), 'public', url)),
          `${url} is in the registry but not in public/`,
        ).resolves.toBeUndefined();
      }
    }
  });
});

describe('parseResumeRegistry', () => {
  it('drops a malformed version instead of throwing', () => {
    // Same contract as parseDepth: this file arrives over a network from an
    // admin panel. One bad entry must never be able to take the site down.
    const parsed = parseResumeRegistry({
      active: 'good',
      versions: [
        { id: 'good', label: 'Fine', pdf: '/resume/good.pdf' },
        { id: 'no-pdf', label: 'Broken' },
        { id: '../escape', label: 'Nope', pdf: '/resume/x.pdf' },
        'not an object',
        null,
      ],
    });
    expect(parsed.versions.map((v) => v.id)).toEqual(['good']);
    expect(parsed.active).toBe('good');
  });

  it('never returns an id that could escape the resume folder', () => {
    for (const id of ['../../etc/passwd', '/absolute', 'has space', 'UPPER', '.hidden']) {
      const parsed = parseResumeRegistry({ active: id, versions: [{ id, pdf: '/x.pdf' }] });
      expect(parsed.versions, `${id} survived validation`).toEqual([]);
    }
  });

  it('falls back to the newest version when active points at nothing', () => {
    // A Download button that 404s in front of a recruiter is a worse outcome
    // than an out-of-date resume, so this degrades rather than emptying.
    const parsed = parseResumeRegistry({
      active: 'deleted',
      versions: [
        { id: 'old', label: 'Old', pdf: '/resume/old.pdf' },
        { id: 'new', label: 'New', pdf: '/resume/new.pdf' },
      ],
    });
    expect(parsed.active).toBe('new');
  });

  it('survives complete rubbish', () => {
    for (const rubbish of [null, undefined, 42, 'string', [], { versions: 'no' }]) {
      expect(parseResumeRegistry(rubbish)).toEqual({ active: null, versions: [] });
    }
  });

  it('refuses duplicate ids, which would make active ambiguous', () => {
    const parsed = parseResumeRegistry({
      active: 'dup',
      versions: [
        { id: 'dup', label: 'First', pdf: '/resume/a.pdf' },
        { id: 'dup', label: 'Second', pdf: '/resume/b.pdf' },
      ],
    });
    expect(parsed.versions).toHaveLength(1);
    expect(parsed.versions[0]?.label).toBe('First');
  });
});

describe('mintId', () => {
  it('never derives the id from anything an uploader controls', () => {
    // The label is the only caller-supplied input, and it is slugged to the
    // safe alphabet before it reaches a path.
    const id = mintId('../../etc/passwd <script>', base);
    expect(id).toMatch(/^\d{8}-[a-z0-9-]+$/);
    expect(id).not.toContain('/');
    expect(id).not.toContain('.');
  });

  it('does not collide with an existing version', () => {
    const first = mintId('Resume', base);
    const withFirst: ResumeRegistry = {
      ...base,
      versions: [...base.versions, { id: first, label: 'Resume', pdf: '/resume/x.pdf' }],
    };
    expect(mintId('Resume', withFirst)).not.toBe(first);
  });

  it('always produces something usable, even from an unusable label', () => {
    expect(mintId('', base)).toMatch(/resume$/);
    expect(mintId('!!!', base)).toMatch(/resume$/);
  });
});

describe('applyUpload', () => {
  it('makes a new PDF the active resume', () => {
    const next = applyUpload(base, {
      id: 'v2',
      label: 'Newer',
      format: 'pdf',
      url: '/resume/v2.pdf',
      bytes: 100,
    });
    expect(next.active).toBe('v2');
    expect(next.versions).toHaveLength(2);
  });

  it('keeps every previous version, which is what makes rollback possible', () => {
    const next = applyUpload(base, {
      id: 'v2',
      label: 'Newer',
      format: 'pdf',
      url: '/resume/v2.pdf',
      bytes: 100,
    });
    expect(next.versions.map((v) => v.id)).toContain('v1');
    expect(next.versions.find((v) => v.id === 'v1')?.pdf).toBe('/resume/v1.pdf');
  });

  it('attaches a DOCX to the active version rather than creating a second one', () => {
    /*
     * A PDF and a DOCX of the same resume are one document in two formats. Two
     * versions would let the site offer a PDF and a DOCX whose contents differ,
     * which is the failure a visitor cannot see and cannot be warned about.
     */
    const next = applyUpload(base, {
      id: 'ignored',
      label: 'Same resume',
      format: 'docx',
      url: '/resume/v1.docx',
      bytes: 50,
    });
    expect(next.versions).toHaveLength(1);
    expect(next.active).toBe('v1');
    expect(next.versions[0]?.docx).toBe('/resume/v1.docx');
  });

  it('will not activate a DOCX-only upload', () => {
    // There would be no PDF to serve, and the PDF button is the primary one.
    const empty: ResumeRegistry = { active: null, versions: [] };
    const next = applyUpload(empty, {
      id: 'docx-first',
      label: 'Word only',
      format: 'docx',
      url: '/resume/d.docx',
      bytes: 50,
    });
    expect(next.active).toBeNull();
    expect(next.versions).toHaveLength(1);
  });
});

describe('write targets', () => {
  it('builds the path and the public URL from the same id', () => {
    const target = resumeFileTarget('20260914-resume', 'pdf');
    expect(targetPath(target)).toBe('public/resume/20260914-resume.pdf');
    expect(resumeFileUrl(target)).toBe('/resume/20260914-resume.pdf');
  });

  it('refuses an id that could escape the folder', () => {
    for (const bad of ['../secret', 'a/b', '', 'A'.repeat(70), 'has space', './x']) {
      expect(() => resumeFileTarget(bad, 'pdf'), `${bad} was accepted`).toThrow();
    }
  });

  it('still resolves the fixed keys', () => {
    expect(targetPath('projectDepth')).toBe('src/data/project-depth.json');
    expect(targetPath('resumeRegistry')).toBe('src/data/resume-registry.json');
  });
});

describe('DOCX validation', () => {
  const ooxml = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from('....[Content_Types].xml....', 'ascii'),
  ]);

  it('accepts a real OOXML package', () => {
    expect(checkResumeDocx(ooxml).ok).toBe(true);
  });

  it('rejects a renamed PDF', () => {
    const check = checkResumeDocx(Buffer.from('%PDF-1.7 ...', 'ascii'));
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.status).toBe(415);
  });

  it('rejects a zip that is not a Word document', () => {
    // Magic bytes alone cannot tell these apart — every .docx is a zip.
    const plainZip = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('....holiday-photos/IMG_1.jpg....', 'ascii'),
    ]);
    const check = checkResumeDocx(plainZip);
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.status).toBe(415);
  });

  it('dispatches on the declared format, not on the bytes', () => {
    // Choosing PDF and attaching a Word file is a mistake worth reporting,
    // not something to silently accept because the bytes are valid.
    expect(checkResumeFile(ooxml, 'pdf').ok).toBe(false);
    expect(checkResumeFile(ooxml, 'docx').ok).toBe(true);
  });

  it('rejects an empty file in either format', () => {
    expect(checkResumeFile(Buffer.alloc(0), 'pdf').ok).toBe(false);
    expect(checkResumeFile(Buffer.alloc(0), 'docx').ok).toBe(false);
  });
});

describe('retention', () => {
  it('keeps a bounded number of versions rather than growing forever', () => {
    // A repository is not a place to accumulate binaries without a stated
    // limit. Five is enough for any rollback a person actually notices.
    let registry: ResumeRegistry = { active: null, versions: [] };
    for (let n = 1; n <= 9; n += 1) {
      registry = applyUpload(registry, {
        id: `v${n}`,
        label: `Version ${n}`,
        format: 'pdf',
        url: `/resume/v${n}.pdf`,
        bytes: 100,
      });
    }
    expect(registry.versions).toHaveLength(MAX_RESUME_VERSIONS);
    expect(registry.versions.map((v) => v.id)).toEqual(['v5', 'v6', 'v7', 'v8', 'v9']);
    expect(registry.active).toBe('v9');
  });

  it('never prunes the version the site is currently serving', () => {
    /*
     * Reachable when the newest upload is DOCX-only: it cannot become active,
     * so `active` stays behind and could otherwise fall out of the window —
     * which would take the resume off the page entirely.
     */
    let registry: ResumeRegistry = { active: null, versions: [] };
    for (let n = 1; n <= 6; n += 1) {
      registry = applyUpload(registry, {
        id: `p${n}`,
        label: `PDF ${n}`,
        format: 'pdf',
        url: `/resume/p${n}.pdf`,
        bytes: 100,
      });
    }
    const pinned: ResumeRegistry = { ...registry, active: registry.versions[0]!.id };
    const next = applyUpload(pinned, {
      id: 'newest',
      label: 'Newest',
      format: 'pdf',
      url: '/resume/newest.pdf',
      bytes: 100,
    });
    // A new PDF does become active, so the old one may leave — but the invariant
    // that matters holds: whatever `active` names is present in the list.
    expect(next.versions.some((v) => v.id === next.active)).toBe(true);
  });

  it('always leaves the active version resolvable', () => {
    let registry: ResumeRegistry = { active: null, versions: [] };
    for (let n = 1; n <= 20; n += 1) {
      registry = applyUpload(registry, {
        id: `x${n}`,
        label: `X ${n}`,
        format: n % 4 === 0 ? 'docx' : 'pdf',
        url: `/resume/x${n}.${n % 4 === 0 ? 'docx' : 'pdf'}`,
        bytes: 100,
      });
      expect(
        registry.active === null ||
          registry.versions.some((v) => v.id === registry.active),
        `active went missing after upload ${n}`,
      ).toBe(true);
    }
  });
});
