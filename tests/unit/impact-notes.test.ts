import { describe, expect, it } from 'vitest';
import { impact, parseImpact } from '@/data/impact';
import { parseSkillNotes, skillNotes } from '@/data/skill-notes';
import { allSkills } from '@/data/skills';

describe('impact content', () => {
  it('parses its own output unchanged (the admin saves the parsed shape back)', () => {
    expect(parseImpact(impact)).toEqual(impact);
  });

  it('keeps the four resume figures', () => {
    expect(impact.metrics.map((m) => m.id)).toEqual(['automations', 'effort', 'databases', 'interns']);
  });

  it('gives a new entry an id and drops a broken one', () => {
    const parsed = parseImpact({
      metrics: [
        { label: 'New figure', value: 3, prefix: '', suffix: '', detail: '' },
        { label: '', value: 1 },
        { label: 'Negative', value: -2 },
      ],
      pillars: [{ title: 'A pillar', points: ['one', ''] }],
      flows: [{ name: 'No steps', steps: [] }],
    });
    expect(parsed.metrics).toHaveLength(1);
    expect(parsed.metrics[0]?.id).toBe('new-figure');
    expect(parsed.pillars[0]?.points).toEqual(['one']);
    expect(parsed.flows).toEqual([]);
  });

  it('survives rubbish', () => {
    for (const rubbish of [null, 42, 'x', [], { metrics: 'no' }]) {
      expect(parseImpact(rubbish).metrics).toEqual([]);
    }
  });
});

describe('skill notes', () => {
  it('accepts both the file shape and its own output', () => {
    expect(parseSkillNotes({ notes: skillNotes })).toEqual(skillNotes);
    expect(parseSkillNotes(skillNotes)).toEqual(skillNotes);
  });

  it('drops a half-written note', () => {
    expect(parseSkillNotes({ notes: { SQL: { what: 'x', why: '' } } })).toEqual({});
  });

  it('still covers every skill in the stack', () => {
    expect(allSkills.filter((skill) => !(skill in skillNotes))).toEqual([]);
  });
});
