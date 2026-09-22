import raw from '@/data/scenes.json';

/**
 * Every word and every picture in the cinematic sections — landing, mission,
 * build, human + automation, closing — in one admin-editable file.
 *
 * ## Images are chosen, not typed
 *
 * A scene names an image by id from `SCENE_IMAGES`, the closed list of files
 * that actually exist in `public/journey/` with their real pixel sizes. The
 * admin panel offers that list as a picker; the parser drops any id not in it
 * and falls back to the built-in choice. So a save can never point a scene at
 * a missing file, and a component always knows an image's true dimensions —
 * which is what keeps every picture from being shown larger than it is.
 *
 * ## Validate-and-drop
 *
 * Like every content file: a missing or malformed field falls back to the
 * shipped text, so one bad save can never blank a section.
 */

export interface SceneImage {
  id: string;
  label: string;
  /** Large file under /journey/. */
  src: string;
  /** Optional ~720px variant. */
  small?: string;
  width: number;
  height: number;
}

export const SCENE_IMAGES: readonly SceneImage[] = [
  { id: 'landing', label: 'Landing — data into the bot', src: 'landing.webp', width: 1672, height: 941 },
  { id: 'mission', label: 'Robot at the pipeline', src: '01-mission-lg.webp', small: '01-mission-sm.webp', width: 1505, height: 941 },
  { id: 'sources', label: 'Streams converging', src: '02-sources-lg.webp', small: '02-sources-sm.webp', width: 1200, height: 750 },
  { id: 'processing', label: 'Streams into a core', src: '03-processing-lg.webp', small: '03-processing-sm.webp', width: 1200, height: 750 },
  { id: 'report', label: 'Robot and data tree', src: '04-report-lg.webp', small: '04-report-sm.webp', width: 1024, height: 640 },
  { id: 'distribution', label: 'Robot over the city', src: '05-distribution-lg.webp', small: '05-distribution-sm.webp', width: 1110, height: 694 },
  { id: 'ideas', label: 'Arvind with the blueprint', src: 'ideas.webp', width: 722, height: 941 },
  { id: 'build-1', label: 'Robot parts', src: 'build-1.webp', width: 476, height: 620 },
  { id: 'build-2', label: 'Robot being assembled', src: 'build-2.webp', width: 476, height: 620 },
  { id: 'build-3', label: 'Robot wired up', src: 'build-3.webp', width: 476, height: 620 },
  { id: 'build-4', label: 'Robot powered on', src: 'build-4.webp', width: 476, height: 620 },
  { id: 'build-5', label: 'Robot walking out', src: 'build-5.webp', width: 476, height: 620 },
  { id: 'human', label: 'Arvind at his desk with the robot', src: 'human.webp', small: 'human-sm.webp', width: 1464, height: 1074 },
  { id: 'closing', label: 'Robot looking over the city', src: 'next-chapter.webp', width: 555, height: 532 },
];

export function sceneImage(id: string): SceneImage {
  return SCENE_IMAGES.find((image) => image.id === id) ?? (SCENE_IMAGES[0] as SceneImage);
}

export interface SceneText {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
}

export interface BuildStage extends SceneText {
  step: string;
  detail: string;
}

export interface Scenes {
  landing: { tagline: string; image: string };
  mission: SceneText[];
  build: { eyebrow: string; title: string; stages: BuildStage[] };
  human: SceneText & { alt: string };
  closing: SceneText & { cta: string };
}

const str = (value: unknown, fallback: string, max = 600): string =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;

const img = (value: unknown, fallback: string): string =>
  typeof value === 'string' && SCENE_IMAGES.some((image) => image.id === value) ? value : fallback;

const obj = (value: unknown): Record<string, unknown> =>
  (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;

function text(value: unknown, fallback: SceneText): SceneText {
  const r = obj(value);
  return {
    eyebrow: str(r.eyebrow, fallback.eyebrow, 80),
    title: str(r.title, fallback.title, 160),
    body: str(r.body, fallback.body),
    image: img(r.image, fallback.image),
  };
}

/** A list keeps the shipped length: an admin edits chapters, not how many there are. */
function list<T>(value: unknown, fallback: readonly T[], each: (v: unknown, f: T) => T): T[] {
  const items = Array.isArray(value) ? value : [];
  return fallback.map((f, i) => each(items[i], f));
}

export function parseScenes(value: unknown, fallback: Scenes = DEFAULTS): Scenes {
  const r = obj(value);
  const landing = obj(r.landing);
  const build = obj(r.build);
  const human = obj(r.human);
  const closing = obj(r.closing);
  return {
    landing: {
      tagline: str(landing.tagline, fallback.landing.tagline, 240),
      image: img(landing.image, fallback.landing.image),
    },
    mission: list(r.mission, fallback.mission, text),
    build: {
      eyebrow: str(build.eyebrow, fallback.build.eyebrow, 80),
      title: str(build.title, fallback.build.title, 120),
      stages: list(build.stages, fallback.build.stages, (v, f) => ({
        ...text(v, f),
        step: str(obj(v).step, f.step, 24),
        detail: str(obj(v).detail, f.detail, 120),
      })),
    },
    human: { ...text(human, fallback.human), alt: str(human.alt, fallback.human.alt, 200) },
    closing: { ...text(closing, fallback.closing), cta: str(closing.cta, fallback.closing.cta, 60) },
  };
}

/*
 * The shipped text. Everything here is from facts Arvind confirmed; there are
 * no numbers because none were measured.
 */
const DEFAULTS: Scenes = {
  landing: {
    tagline: 'Data in from every source. Reports out to every region. The bot in between is what I build.',
    image: 'landing',
  },
  mission: [
    { eyebrow: 'The mission', title: 'One report, from its sources to every region’s inbox', body: 'A TruBot bot runs the path a person used to walk by hand — fetch, process, apply the rules, build the report, send it out. Scroll to follow it.', image: 'mission' },
    { eyebrow: '01 — Sources', title: 'It starts wherever the data lives', body: 'SFTP, FTP, Amazon S3, a reporting database, a mailbox, Excel or CSV. Each report uses only the sources it actually needs.', image: 'sources' },
    { eyebrow: '02 — Processing', title: 'SQL, Python and the business rules', body: 'SQL filters on the database side. Python takes over where the Excel logic or the transformation gets heavy. Then the business rules, lookup and mapping, and validation.', image: 'processing' },
    { eyebrow: '03 — The report', title: 'The Excel the business works in', body: 'Pivots, formatting and business-specific layouts, with a summary built region by region.', image: 'report' },
    { eyebrow: '04 — Distribution', title: 'Out to the whole country, on time', body: 'Pan-India email with region-wise summaries — and, on the automations that need them, WhatsApp and SMS through the APIs integrated in TruBot.', image: 'distribution' },
  ],
  build: {
    eyebrow: 'How an automation gets built',
    title: 'From parts to production',
    stages: [
      { step: 'Ideas', eyebrow: '', title: 'Ideas take shape', body: 'Requirement discussions with the business users who own the process, then a BRD — fields, rules, frequency, distribution — and a sign-off before anything is built.', detail: 'Requirement · BRD · Sign-off', image: 'ideas' },
      { step: 'Components', eyebrow: '', title: 'Components in motion', body: 'The bot is developed in Datamatics TruBot, with Python where the Excel logic or the transformation gets heavy, and reusable pieces wherever a pattern repeats.', detail: 'TruBot · Python · Reusable components', image: 'build-1' },
      { step: 'Assembly', eyebrow: '', title: 'Precision assembly', body: 'SQL against the reporting databases, files from SFTP, FTP or S3, and the WhatsApp, SMS and ID creation and deactivation APIs where a process needs them.', detail: 'SQL · SFTP / FTP / S3 · APIs', image: 'build-2' },
      { step: 'Alive', eyebrow: '', title: 'It comes alive — once it is tested', body: 'Unit testing, functional testing and UAT with the business, and exception handling so a bad input is caught rather than passed along.', detail: 'Testing · UAT · Exceptions', image: 'build-4' },
      { step: 'Ready', eyebrow: '', title: 'Ready to run, and looked after', body: 'Deployed to production, put on its schedule, checked, and supported afterwards — the part that decides whether an automation keeps working.', detail: 'Deployment · Schedule · Support', image: 'build-5' },
    ],
  },
  human: {
    eyebrow: 'Human + automation',
    title: 'The bot runs the process. The judgement stays human.',
    body: 'Understanding the process, agreeing the rules in a BRD, deciding what is worth automating and checking that the output is right — that is the part of RPA that no bot does for you. It is the part I spend most of my time on.',
    image: 'human',
    alt: 'Illustration of Arvind Gupta at his desk with a laptop and a small robot',
  },
  closing: {
    eyebrow: 'A brighter tomorrow',
    title: 'Same vision. Bigger possibilities.',
    body: '',
    image: 'closing',
    cta: 'Let’s build together',
  },
};

export const defaultScenes: Scenes = DEFAULTS;
export const scenes: Scenes = parseScenes(raw);
