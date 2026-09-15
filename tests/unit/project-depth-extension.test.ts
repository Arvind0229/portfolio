import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDepth } from '@/data/project-depth';
import { relatedProjects, projectRecords } from '@/data/projects';

/**
 * The fields G3 added to `ProjectDepth`, and the rules around them.
 *
 * The depth store is empty on this commit — nobody has written a case study
 * yet — so nothing here can be checked against the live data file. These tests
 * exercise the parser and the accessors directly, with fixtures that live only
 * in this file. A fixture is not content: none of it reaches the site.
 */

describe('parseDepth accepts the new fields', () => {
  it('keeps overview, business problem, architecture, workflow, lessons and future work', () => {
    const depth = parseDepth({
      overview: 'What it is.',
      businessProblem: 'The long form.',
      architecture: ['Orchestrator', 'Queue'],
      workflow: ['Read the queue', 'Post the result'],
      lessonsLearned: ['Log the input, not just the error.'],
      futureEnhancements: ['Move the schedule into the orchestrator.'],
    });

    expect(depth).toBeDefined();
    expect(depth?.overview).toBe('What it is.');
    expect(depth?.businessProblem).toBe('The long form.');
    expect(depth?.architecture).toEqual(['Orchestrator', 'Queue']);
    expect(depth?.workflow).toEqual(['Read the queue', 'Post the result']);
    expect(depth?.lessonsLearned).toEqual(['Log the input, not just the error.']);
    expect(depth?.futureEnhancements).toEqual(['Move the schedule into the orchestrator.']);
  });

  it('drops a malformed field rather than throwing', () => {
    /*
     * Validate-and-drop. One bad save must lose one field, never the site —
     * this file is written by an HTTP route, so "it cannot be malformed" is
     * not an available assumption.
     */
    const depth = parseDepth({
      overview: 42,
      architecture: 'not a list',
      workflow: [1, 'kept', null],
      lessonsLearned: [],
    });

    expect(depth?.overview).toBeUndefined();
    expect(depth?.architecture).toBeUndefined();
    expect(depth?.workflow).toEqual(['kept']);
    expect(depth?.lessonsLearned).toBeUndefined();
  });
});

describe('metrics', () => {
  it('requires both a figure and a label', () => {
    // A number with nothing naming it is not a claim anyone can read, and a
    // label with no number is a heading over an empty box. Either half alone
    // is dropped.
    const depth = parseDepth({
      metrics: [
        { value: '4 hours a day', label: 'Manual effort removed', note: 'approx.' },
        { value: '90%' },
        { label: 'Accuracy' },
        'not an object',
      ],
    });

    expect(depth?.metrics).toEqual([
      { value: '4 hours a day', label: 'Manual effort removed', note: 'approx.' },
    ]);
  });

  it('keeps a metric without a note', () => {
    const depth = parseDepth({ metrics: [{ value: '12', label: 'Branches' }] });
    expect(depth?.metrics).toEqual([{ value: '12', label: 'Branches' }]);
  });
});

describe('visibility', () => {
  it('defaults to public when absent', () => {
    /*
     * The direction of this default is the whole point. If an absent
     * `visibility` meant "internal", every record written before G3 would
     * vanish from the site on the day this shipped — a silent content loss
     * that looks like a rendering bug.
     */
    expect(parseDepth({ overview: 'x' })?.visibility).toBe('public');
  });

  it('treats an unrecognised value as public rather than guessing', () => {
    // Deliberate: the alternative is a typo silently hiding published work.
    // Hiding is the *safe* default for confidentiality and the *unsafe* one
    // for correctness, and this field is set from a two-option select, so a
    // stray value means corruption, not intent.
    expect(parseDepth({ overview: 'x', visibility: 'secret' })?.visibility).toBe('public');
  });

  it('keeps an explicit internal marking', () => {
    expect(parseDepth({ overview: 'x', visibility: 'internal' })?.visibility).toBe('internal');
  });

  it('does not count as content on its own', () => {
    // A record holding only a visibility choice is no record at all.
    expect(parseDepth({ visibility: 'internal' })).toBeUndefined();
    expect(parseDepth({ visibility: 'public' })).toBeUndefined();
  });
});

describe('the parser accepts its own output', () => {
  it('round-trips every new field through JSON', () => {
    /*
     * The rule that was learned the hard way: a save is parse → store →
     * parse, so a parser that rejects its own output silently discards the
     * thing that was just saved. `parseSkillGroups` did exactly that and
     * nobody noticed for a release.
     */
    const first = parseDepth({
      overview: 'What it is.',
      businessProblem: 'The long form.',
      architecture: ['Orchestrator'],
      workflow: ['Read the queue'],
      metrics: [{ value: '4 hours a day', label: 'Manual effort removed', note: 'approx.' }],
      lessonsLearned: ['Log the input.'],
      futureEnhancements: ['Move the schedule.'],
      visibility: 'internal',
    });

    const second = parseDepth(JSON.parse(JSON.stringify(first)));
    expect(second).toEqual(first);
  });
});

describe('related projects', () => {
  const ids = projectRecords.map((record) => record.id);

  it('never returns the project itself', () => {
    for (const id of ids) {
      expect(relatedProjects(id).map((project) => project.id)).not.toContain(id);
    }
  });

  it('respects the limit and returns no duplicates', () => {
    for (const id of ids) {
      const related = relatedProjects(id, 3);
      expect(related.length).toBeLessThanOrEqual(3);
      expect(new Set(related.map((project) => project.id)).size).toBe(related.length);
    }
  });

  it('returns nothing for an id that does not exist', () => {
    expect(relatedProjects('no-such-project')).toEqual([]);
  });

  it('ranks by what two projects share, not by where they sit in the file', () => {
    /*
     * The behaviour this replaced was `projects[(index + 1) % length]`, which
     * would send a reader from a compliance bot to whatever happened to be
     * stored next. The assertion has to be about references, so it is built
     * from the records rather than from a hand-picked pair: for every project,
     * the first suggestion must share at least one reference with it — unless
     * it shares nothing with anything, in which case there is nothing to
     * suggest and the list is empty.
     */
    for (const record of projectRecords) {
      const [first] = relatedProjects(record.id, 1);
      if (!first) continue;

      const other = projectRecords.find((entry) => entry.id === first.id);
      expect(other).toBeDefined();

      const shares =
        (other?.companyId && other.companyId === record.companyId) ||
        other?.skillIds.some((id) => record.skillIds.includes(id)) ||
        other?.experienceIds.some((id) => record.experienceIds.includes(id)) ||
        other?.category === record.category;

      expect(shares).toBe(true);
    }
  });
});

describe('the unfiltered depth store has no public callers', () => {
  it('is not imported anywhere under src/app or src/components', () => {
    /*
     * `publicDepthFor` only protects what goes through it. The docstring in
     * `project-depth.ts` says that is "checked by grep, not by hope" — this is
     * the grep, so the claim is enforced rather than asserted.
     *
     * A page that needs depth reads `project.depth`, which the join already
     * filtered. Reaching for `projectDepth` on a public surface is the one
     * mistake that would leak an internal record, and it would leak it
     * silently.
     */
    const offenders = ['src/app', 'src/components']
      .flatMap((root) => listFiles(path.join(process.cwd(), root)))
      // The admin API is server-side and behind the session check. It is the
      // one place allowed to read the store unfiltered, because showing Arvind
      // what he wrote is the point of it.
      .filter((file) => !file.includes(path.join('app', 'api', 'admin')))
      .filter((file) => /\bprojectDepth\b/.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}
