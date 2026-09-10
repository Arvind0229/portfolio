import type { MetadataRoute } from 'next';
import { projects } from '@/data/projects';
import { siteConfig, sitemapRoutes } from '@/data/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Built from real routes, never from `navigation` — those are anchors now,
  // and `/#projects` is the same document as `/` to a crawler.
  const pages = sitemapRoutes.map((href) => ({
    url: `${siteConfig.url}${href === '/' ? '' : href}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: href === '/' ? 1 : 0.8,
  }));

  const caseStudies = projects.map((project) => ({
    url: `${siteConfig.url}/projects/${project.id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...pages, ...caseStudies];
}
