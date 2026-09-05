import { knowledgeBase } from '@/lib/ai/knowledge';
import type { KnowledgeChunk, KnowledgeKind, RetrievedChunk } from '@/types';

/**
 * Lexical retrieval (BM25-style) over the resume knowledge base.
 *
 * Why not embeddings: see the note in knowledge.ts. This retriever is
 * deterministic, runs in microseconds, needs no network call, and can be unit
 * tested exactly — properties that matter far more than semantic nuance on a
 * corpus this small and this well-controlled.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'did', 'do', 'does', 'for', 'from',
  'had', 'has', 'have', 'he', 'her', 'him', 'his', 'how', 'i', 'in', 'is', 'it', 'its', 'me', 'my',
  'of', 'on', 'or', 'our', 'she', 'so', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
  'they', 'this', 'to', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will',
  'with', 'you', 'your', 'about', 'tell', 'give', 'show', 'please', 'would', 'could', 'should',
  'arvind', 'gupta',
]);

/**
 * Query expansion. Recruiters and engineers ask for the same thing in
 * different words; this bridges the vocabulary gap without an embedding model.
 */
const SYNONYMS: Record<string, string[]> = {
  bot: ['rpa', 'automation', 'trubot'],
  bots: ['rpa', 'automation', 'trubot'],
  rpa: ['trubot', 'automation', 'automate', 'uipath', 'automation edge'],
  automate: ['rpa', 'automation', 'trubot'],
  automations: ['rpa', 'automation', 'trubot'],
  db: ['database', 'sql', 'oracle'],
  database: ['oracle', 'sql', 'mysql', 'postgresql', 'redshift', 'server'],
  databases: ['oracle', 'sql', 'mysql', 'postgresql', 'redshift', 'server'],
  api: ['integration', 'sms', 'whatsapp', 'apis'],
  apis: ['integration', 'sms', 'whatsapp', 'api'],
  reporting: ['mis', 'report', 'dashboard', 'power bi', 'excel'],
  report: ['mis', 'reporting', 'dashboard', 'mailer'],
  dashboard: ['power bi', 'mis', 'reporting'],
  bi: ['power bi', 'dashboard', 'reporting'],
  script: ['python', 'vba', 'scripting'],
  scripting: ['python', 'sql', 'vba'],
  code: ['python', 'sql', 'plsql', 'vba'],
  coding: ['python', 'sql', 'plsql'],
  cloud: ['s3', 'amazon', 'redshift', 'sftp'],
  bank: ['banking', 'nbfc', 'lending', 'finance'],
  banking: ['bank', 'nbfc', 'lending', 'finance', 'los', 'lms'],
  lending: ['loan', 'los', 'lms', 'retail', 'nbfc'],
  loan: ['lending', 'los', 'lms', 'emi', 'disbursement'],
  fit: ['experience', 'skills', 'achievements', 'role'],
  hire: ['contact', 'email', 'phone', 'recruiter'],
  hiring: ['contact', 'experience', 'skills', 'recruiter'],
  strongest: ['skills', 'expertise', 'strength'],
  best: ['achievements', 'impact', 'strength'],
  impactful: ['impact', 'achievements', 'results'],
  team: ['mentor', 'interns', 'trained'],
  lead: ['mentor', 'interns', 'trained', 'ownership'],
  mentoring: ['mentor', 'interns', 'trained'],
  education: ['degree', 'college', 'graduate'],
  salary: ['contact'],
  notice: ['contact'],
  experience: ['years', 'work', 'career', 'employment'],
  excel: ['advanced excel', 'pivot', 'spreadsheet'],
  sql: ['plsql', 'pl/sql', 'query', 'oracle'],
  python: ['script', 'scripting', 'calculation'],
  compliance: ['regulatory', 'exception', 'alert', 'audit'],
  security: ['compliance', 'access', 'deactivation'],
};

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[-./]+|[-./]+$/g, ''))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function expandQuery(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const synonyms = SYNONYMS[token];
    if (!synonyms) continue;
    for (const synonym of synonyms) {
      for (const part of synonym.split(/\s+/)) {
        if (part.length > 1) expanded.add(part);
      }
    }
  }
  return Array.from(expanded);
}

interface IndexedChunk {
  chunk: KnowledgeChunk;
  termFrequency: Map<string, number>;
  length: number;
}

function buildIndex(): {
  documents: IndexedChunk[];
  documentFrequency: Map<string, number>;
  averageLength: number;
} {
  const documents: IndexedChunk[] = knowledgeBase.map((chunk) => {
    // Keywords are repeated so a curated alias outweighs an incidental mention.
    const tokens = [
      ...tokenize(chunk.title),
      ...tokenize(chunk.title),
      ...tokenize(chunk.text),
      ...tokenize(chunk.keywords.join(' ')),
      ...tokenize(chunk.keywords.join(' ')),
    ];
    const termFrequency = new Map<string, number>();
    for (const token of tokens) {
      termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
    }
    return { chunk, termFrequency, length: tokens.length };
  });

  const documentFrequency = new Map<string, number>();
  for (const doc of documents) {
    for (const term of doc.termFrequency.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const averageLength =
    documents.reduce((sum, doc) => sum + doc.length, 0) / Math.max(documents.length, 1);

  return { documents, documentFrequency, averageLength };
}

const index = buildIndex();

const K1 = 1.4;
const B = 0.72;

/**
 * A term is "generic" when it appears in a large share of the corpus — "work",
 * "automation", "experience". Matching only generic terms is not evidence, and
 * treating it as evidence is how a retriever ends up answering "does he know
 * Kubernetes?" with a paragraph about mentoring interns.
 */
const GENERIC_DF_RATIO = 0.32;

function isSpecificTerm(term: string): boolean {
  const df = index.documentFrequency.get(term) ?? 0;
  return df > 0 && df / index.documents.length < GENERIC_DF_RATIO;
}

/**
 * Terms the visitor used that do not exist anywhere in the profile. Only
 * entity-shaped tokens count: a capitalised word or an acronym, ignoring the
 * first word of the message (every sentence starts capitalised). This is what
 * lets the agent say "Kubernetes isn't in his profile" without misfiring on an
 * ordinary adjective like "impactful".
 */
export function unknownEntities(message: string): string[] {
  const words = message.trim().split(/\s+/).slice(1);
  const unknown: string[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    const cleaned = word.replace(/[^A-Za-z0-9.+#-]/g, '');
    const isEntityShaped = /^[A-Z][A-Za-z0-9.+#-]{2,}$/.test(cleaned) || /^[A-Z]{2,}$/.test(cleaned);
    if (!isEntityShaped) continue;

    const [token] = tokenize(cleaned);
    if (!token || seen.has(token)) continue;
    seen.add(token);

    if ((index.documentFrequency.get(token) ?? 0) === 0) unknown.push(cleaned);
  }

  return unknown;
}

export interface RetrieveOptions {
  limit?: number;
  /** Restrict retrieval to certain kinds — this is how tool permissions bite. */
  kinds?: readonly KnowledgeKind[];
  /** Scores below this are treated as noise rather than evidence. */
  minScore?: number;
}

export function retrieve(query: string, options: RetrieveOptions = {}): RetrievedChunk[] {
  // 2.0 is not arbitrary: measured against this corpus, a question whose only
  // in-vocabulary word is generic ("did he work with Kubernetes?") tops out
  // around 1.1, while every genuinely answerable question scores 3 or above.
  // The gap is wide, so the floor sits in the middle of it.
  const { limit = 5, kinds, minScore = 2.0 } = options;
  const terms = expandQuery(tokenize(query));
  if (terms.length === 0) return [];

  const candidates = kinds
    ? index.documents.filter((doc) => kinds.includes(doc.chunk.kind))
    : index.documents;

  const totalDocs = index.documents.length;

  const specificTerms = terms.filter(isSpecificTerm);

  const scored: Array<RetrievedChunk & { specificMatches: number }> = candidates.map((doc) => {
    let score = 0;
    let specificMatches = 0;
    for (const term of terms) {
      const tf = doc.termFrequency.get(term);
      if (!tf) continue;
      if (specificTerms.includes(term)) specificMatches += 1;
      const df = index.documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
      const norm = tf * (K1 + 1);
      const denom = tf + K1 * (1 - B + (B * doc.length) / index.averageLength);
      score += idf * (norm / denom);
    }
    return { chunk: doc.chunk, score, specificMatches };
  });

  return scored
    .filter((result) => result.score >= minScore)
    // A chunk that matched only generic vocabulary is noise, not an answer.
    .filter((result) => specificTerms.length === 0 || result.specificMatches > 0)
    .map(({ chunk, score }) => ({ chunk, score }))
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, limit);
}
