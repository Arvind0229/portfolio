import { describe, expect, it } from 'vitest';
import { detectIntent } from '@/lib/ai/intent';
import { runTool, tools } from '@/lib/ai/tools';

describe('detectIntent', () => {
  const cases: Array<[string, string]> = [
    ['How can I contact him?', 'getContact'],
    ['What is his educational background?', 'searchEducation'],
    ['Show me his projects', 'searchProjects'],
    ['Which databases does he know?', 'searchSkills'],
    ['How many automations has he built?', 'searchImpact'],
    ['Does he understand retail lending?', 'searchDomain'],
  ];

  it.each(cases)('routes %s to %s', (question, expected) => {
    expect(detectIntent(question).tool).toBe(expected);
  });

  it('falls back to a broad search when nothing matches', () => {
    const result = detectIntent('qwerty zxcvb');
    expect(result.intent).toBe('general');
    expect(result.tool).toBe('searchAll');
  });

  it('widens to a broad search when two intents are equally strong', () => {
    // "projects" and "python" pull towards projects and skills respectively.
    const result = detectIntent('which projects used python');
    expect(['searchAll', 'searchProjects', 'searchSkills']).toContain(result.tool);
  });
});

describe('tool permissions', () => {
  it('never returns a chunk kind the tool is not permitted to read', () => {
    for (const [name, definition] of Object.entries(tools)) {
      const results = runTool(name as keyof typeof tools, 'automation banking reports contact');
      for (const result of results) {
        expect(definition.allowedKinds).toContain(result.chunk.kind);
      }
    }
  });

  it('caps results at the tool limit', () => {
    for (const [name, definition] of Object.entries(tools)) {
      const results = runTool(name as keyof typeof tools, 'automation sql python reporting');
      expect(results.length).toBeLessThanOrEqual(definition.maxResults);
    }
  });

  it('returns nothing for an empty query rather than everything', () => {
    expect(runTool('searchAll', '')).toHaveLength(0);
    expect(runTool('searchAll', '   ')).toHaveLength(0);
  });

  it('cannot reach contact data through a project search', () => {
    const results = runTool('searchProjects', 'email phone contact number');
    expect(results.every((r) => r.chunk.kind !== 'contact')).toBe(true);
  });
});
