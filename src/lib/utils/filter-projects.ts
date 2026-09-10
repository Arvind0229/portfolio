import type { ProjectCaseStudy } from '@/types';

export interface ProjectFilter {
  category: string;
  query: string;
}

/**
 * Project filtering, extracted from the component so it can be unit tested
 * without rendering React. Search covers title, both audience views, and the
 * technology list — a visitor typing "python" should find the mailer project
 * even though the word never appears in its title.
 */
export function filterProjects(
  input: readonly ProjectCaseStudy[],
  { category, query }: ProjectFilter,
): ProjectCaseStudy[] {
  const needle = query.trim().toLowerCase();

  return input.filter((project) => {
    if (category !== 'All' && project.category !== category) return false;
    if (needle.length === 0) return true;

    const haystack = [
      project.title,
      project.category,
      project.businessView,
      project.technicalView,
      project.problem,
      project.solution,
      ...project.technologies,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
}
