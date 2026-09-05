import { describe, expect, it } from 'vitest';
import { knowledgeBase } from '@/lib/ai/knowledge';
import { expandQuery, retrieve, tokenize, unknownEntities } from '@/lib/ai/retrieval';

describe('tokenize', () => {
  it('lowercases, drops stop words and keeps technical tokens intact', () => {
    expect(tokenize('What is PL/SQL and Power BI?')).toEqual(['pl/sql', 'power', 'bi']);
  });

  it('drops the subject name so it never dominates scoring', () => {
    expect(tokenize('Tell me about Arvind Gupta')).toEqual([]);
  });
});

describe('expandQuery', () => {
  it('bridges vocabulary gaps with synonyms', () => {
    const expanded = expandQuery(tokenize('what bots has he built'));
    expect(expanded).toContain('rpa');
    expect(expanded).toContain('trubot');
  });

  it('leaves unknown terms untouched', () => {
    expect(expandQuery(['kubernetes'])).toEqual(['kubernetes']);
  });
});

describe('retrieve', () => {
  it('has a non-empty knowledge base built from the resume', () => {
    expect(knowledgeBase.length).toBeGreaterThan(20);
  });

  it('finds database experience', () => {
    const results = retrieve('which databases has he worked with');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.chunk.text.toLowerCase().includes('oracle'))).toBe(true);
  });

  it('finds project work for a technology mentioned only in the tech list', () => {
    const results = retrieve('projects using Python');
    expect(results.some((r) => r.chunk.kind === 'project')).toBe(true);
  });

  it('finds contact information', () => {
    const results = retrieve('how do I contact him');
    expect(results.some((r) => r.chunk.kind === 'contact')).toBe(true);
  });

  it('returns nothing when the query matches only generic vocabulary', () => {
    // "work" appears everywhere; "kubernetes" appears nowhere. Matching the
    // former is not evidence, so nothing should come back.
    expect(retrieve('did he work with kubernetes')).toHaveLength(0);
    expect(retrieve('kubernetes helm service mesh')).toHaveLength(0);
  });

  it('flags entity names that appear nowhere in the profile', () => {
    expect(unknownEntities('Does he have experience with Salesforce Apex?')).toEqual([
      'Salesforce',
      'Apex',
    ]);
    expect(unknownEntities('Has he used Kubernetes?')).toEqual(['Kubernetes']);
  });

  it('does not flag ordinary words or the leading word of a question', () => {
    expect(unknownEntities('Explain his most impactful project')).toEqual([]);
    expect(unknownEntities('Which databases has he used?')).toEqual([]);
    expect(unknownEntities('Kubernetes is what I am asking about')).toEqual([]);
  });

  it('respects the kind filter', () => {
    const results = retrieve('compliance exception alerting', { kinds: ['project'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.chunk.kind === 'project')).toBe(true);
  });

  it('respects the result limit', () => {
    expect(retrieve('sql python reporting automation', { limit: 2 }).length).toBeLessThanOrEqual(2);
  });

  it('treats a single generic word as noise rather than a query', () => {
    // "automation" appears in most of the corpus; on its own it carries no
    // signal, and returning half the profile for it would be worse than
    // returning nothing.
    expect(retrieve('automation')).toHaveLength(0);
  });

  it('is deterministic — the same query always ranks the same way', () => {
    const first = retrieve('power bi dashboards').map((r) => r.chunk.id);
    const second = retrieve('power bi dashboards').map((r) => r.chunk.id);
    expect(first).toEqual(second);
  });

  it('returns nothing for an empty query', () => {
    expect(retrieve('')).toHaveLength(0);
    expect(retrieve('   the and of  ')).toHaveLength(0);
  });
});
