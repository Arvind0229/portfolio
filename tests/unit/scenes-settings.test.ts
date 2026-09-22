import { describe, expect, it } from 'vitest';
import { defaultScenes, parseScenes, SCENE_IMAGES, sceneImage } from '@/data/scenes';
import { parseSiteSettings } from '@/data/site-settings';

describe('scenes', () => {
  it('falls back to the shipped text for anything missing', () => {
    expect(parseScenes({})).toEqual(defaultScenes);
    expect(parseScenes(null)).toEqual(defaultScenes);
  });

  it('keeps an edit, and drops an image id that is not a real file', () => {
    const edited = parseScenes({
      human: { title: 'MARKER heading', image: '../../etc/passwd' },
      build: { stages: [{ title: 'MARKER stage', image: 'build-3' }] },
    });
    expect(edited.human.title).toBe('MARKER heading');
    expect(edited.human.image).toBe(defaultScenes.human.image);
    expect(edited.build.stages[0]?.title).toBe('MARKER stage');
    expect(edited.build.stages[0]?.image).toBe('build-3');
    // An admin edits chapters; the number of chapters is fixed.
    expect(edited.build.stages).toHaveLength(defaultScenes.build.stages.length);
  });

  it('every image id resolves to a file with real dimensions', () => {
    for (const image of SCENE_IMAGES) {
      expect(sceneImage(image.id).src).toMatch(/^[a-z0-9-]+\.webp$/);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
  });

  it('carries no numbers the source images claimed', () => {
    const text = JSON.stringify(defaultScenes).toLowerCase();
    for (const claim of ['better accuracy', 'faster processes', 'reduced manual effort', '%']) {
      expect(text).not.toContain(claim);
    }
  });
});

describe('site settings', () => {
  it('accepts the known values and falls back on anything else', () => {
    expect(parseSiteSettings({ defaultTheme: 'clay', defaultMode: 'light', defaultFont: 'editorial' })).toEqual({
      defaultTheme: 'clay',
      defaultMode: 'light',
      defaultFont: 'editorial',
      robots: true,
      maintenance: false,
    });
    expect(parseSiteSettings({ defaultTheme: 'neon', defaultMode: 'purple', defaultFont: 1 })).toEqual({
      defaultTheme: 'engineering',
      defaultMode: 'auto',
      defaultFont: 'precision',
      robots: true,
      maintenance: false,
    });
    expect(parseSiteSettings({ robots: false }).robots).toBe(false);
    expect(parseSiteSettings({ robots: 'no' }).robots).toBe(true);
  });
});
