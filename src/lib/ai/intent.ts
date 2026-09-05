import type { ToolName } from '@/lib/ai/tools';

/**
 * Intent detection.
 *
 * A deterministic classifier, not a model call. Rule 24 of the operating
 * instructions applies: do not call a tool (or a model) unnecessarily. Intent
 * here is a routing decision over a fixed, tiny label set, and rules do it
 * accurately, instantly and for free — and they are unit-testable.
 */

export type Intent =
  | 'profile'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'impact'
  | 'domain'
  | 'education'
  | 'contact'
  | 'general';

interface IntentRule {
  intent: Intent;
  tool: ToolName;
  patterns: readonly RegExp[];
  weight: number;
}

const RULES: readonly IntentRule[] = [
  {
    intent: 'contact',
    tool: 'getContact',
    weight: 3,
    patterns: [
      /\b(contact|reach|email|e-mail|phone|call|mobile|number|get in touch|connect|hire him|available)\b/i,
      /\b(resume|cv)\b.*\b(download|get|send|share|copy)\b/i,
      /\b(download|get|send|share)\b.*\b(resume|cv)\b/i,
    ],
  },
  {
    intent: 'education',
    tool: 'searchEducation',
    weight: 3,
    // Stems, not whole words: "educational background" must still route here.
    patterns: [/\b(educat|degree|college|university|graduat|qualification|studied|study|bsc|b\.sc)/i],
  },
  {
    intent: 'projects',
    tool: 'searchProjects',
    weight: 2,
    patterns: [
      /\b(project|projects|case stud|built|build|delivered|automation[s]?\b.*\bwork|portfolio of work)\b/i,
      /\b(show me|which)\b.*\b(project|projects|automations)\b/i,
      /\b(mis|mailer|compliance|dashboard|user id|hr)\b.*\b(automation|project|bot)\b/i,
    ],
  },
  {
    intent: 'skills',
    tool: 'searchSkills',
    weight: 2,
    patterns: [
      /\b(skill|skills|technolog|tech stack|stack|tool|tools|language|platform|framework|know|worked with|experience with|familiar|proficient)\b/i,
      /\b(python|sql|pl\/?sql|trubot|uipath|automation edge|power ?bi|excel|vba|oracle|mysql|postgres|postgresql|redshift|s3|sftp|api|apis|whatsapp|sms|ocr|git|kubernetes|docker|java|javascript|aws|azure|salesforce|blue prism)\b/i,
    ],
  },
  {
    // A "how many / how much" question is asking for a figure. That signal is
    // stronger than the topic word next to it, which would otherwise tie.
    intent: 'impact',
    tool: 'searchImpact',
    weight: 4,
    patterns: [/\b(how many|how much)\b/i],
  },
  {
    intent: 'impact',
    tool: 'searchImpact',
    weight: 2,
    patterns: [
      /\b(impact|achieve|achievement|result|outcome|metric|number|saved|savings|reduce|reduced|efficien|roi|value|benefit|improv)\b/i,
      /\b(most impactful|biggest|best project|proud)\b/i,
    ],
  },
  {
    intent: 'domain',
    tool: 'searchDomain',
    weight: 2,
    patterns: [
      /\b(banking|bank|nbfc|lending|loan|loans|finance|financial|kyc|ekyc|esign|collection|collections|npa|delinquen|disbursement|emi|foreclosure|lap|mortgage|gold loan|los\b|lms\b|account aggregator|domain|industry|sector)\b/i,
    ],
  },
  {
    intent: 'experience',
    tool: 'searchExperience',
    weight: 2,
    patterns: [
      /\b(experience|worked|work history|employment|job|jobs|career|company|companies|employer|role|roles|position|tenure|years|sbfc|harjai|currently|current job|responsibilit|day to day|recruiter)\b/i,
    ],
  },
  {
    intent: 'profile',
    tool: 'searchProfile',
    weight: 1,
    patterns: [
      /\b(who is|about him|tell me about|summary|summarise|summarize|overview|introduce|background|specialis|specializ|strength|good fit|why should|suitable|hiring for|fit for)\b/i,
    ],
  },
];

export interface IntentResult {
  intent: Intent;
  tool: ToolName;
  confidence: number;
}

export function detectIntent(message: string): IntentResult {
  const scores = new Map<Intent, { score: number; tool: ToolName }>();

  for (const rule of RULES) {
    let matches = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) matches += 1;
    }
    if (matches === 0) continue;
    const score = matches * rule.weight;
    const existing = scores.get(rule.intent);
    if (!existing || score > existing.score) {
      scores.set(rule.intent, { score, tool: rule.tool });
    }
  }

  if (scores.size === 0) {
    return { intent: 'general', tool: 'searchAll', confidence: 0 };
  }

  const ranked = Array.from(scores.entries()).sort((a, b) => b[1].score - a[1].score);
  const top = ranked[0];
  if (!top) return { intent: 'general', tool: 'searchAll', confidence: 0 };

  const [intent, { score, tool }] = top;
  const second = ranked[1]?.[1].score ?? 0;

  // Two strong, competing intents (e.g. "which projects used Python?") are
  // better served by the broader search than by guessing between them.
  if (second > 0 && score - second < 1 && ranked.length > 1) {
    return { intent: 'general', tool: 'searchAll', confidence: 0.4 };
  }

  return { intent, tool, confidence: Math.min(1, score / 6) };
}
