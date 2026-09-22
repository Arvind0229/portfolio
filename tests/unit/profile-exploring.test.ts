import { describe, expect, it } from 'vitest';
import { parseProfileContent, profile } from '@/data/profile';
import { knowledgeBase } from '@/lib/ai/knowledge';

/**
 * "Currently exploring" is learning, not shipped work.
 *
 * Arvind's rule is that a learning goal must never be turned into a completed
 * project. The page labels the field; these tests hold the other two places it
 * could leak: the parser, and the sentence the assistant is grounded on.
 */
describe('profile.exploring', () => {
  it('is parsed, bounded, and optional', () => {
    expect(parseProfileContent({ exploring: 'MARKER learning' }).exploring).toBe('MARKER learning');
    expect(parseProfileContent({}).exploring).toBe('');
    expect(parseProfileContent({ exploring: 'x'.repeat(500) }).exploring.length).toBeLessThanOrEqual(200);
  });

  it('reaches the assistant labelled as self-learning, never as production work', () => {
    const chunk = knowledgeBase.find((entry) => entry.id === 'profile-positioning');
    expect(chunk).toBeDefined();
    if (profile.exploring) {
      expect(chunk?.text).toContain(`as self-learning rather than production work: ${profile.exploring}`);
    } else {
      expect(chunk?.text).not.toMatch(/currently exploring/i);
    }
  });
});
