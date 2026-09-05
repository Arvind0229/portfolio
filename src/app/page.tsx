import { Assistant } from '@/components/ai/assistant';
import { ArchitectureSection } from '@/components/sections/architecture-section';
import { ContactSection } from '@/components/sections/contact-section';
import { ExperienceSection } from '@/components/sections/experience-section';
import { Hero } from '@/components/sections/hero';
import { ImpactSection } from '@/components/sections/impact-section';
import { ProfileSection } from '@/components/sections/profile-section';
import { ProjectsSection } from '@/components/sections/projects-section';
import { SkillsSection } from '@/components/sections/skills-section';

/**
 * Single-page information architecture.
 *
 * The order is the argument being made: who he is, how he thinks, where he has
 * done it, what he built, what he built it with, how it is engineered, what it
 * changed, then the assistant to interrogate any of it, then how to reach him.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProfileSection />
      <ExperienceSection />
      <ProjectsSection />
      <SkillsSection />
      <ArchitectureSection />
      <ImpactSection />
      <Assistant />
      <ContactSection />
    </>
  );
}
