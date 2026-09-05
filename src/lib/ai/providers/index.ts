import { createAnthropicProvider } from '@/lib/ai/providers/anthropic';
import { createOpenAiProvider } from '@/lib/ai/providers/openai';
import type { LlmProvider } from '@/lib/ai/providers/types';

export type ProviderId = 'anthropic' | 'openai' | 'local';

/**
 * Provider selection.
 *
 * AI_PROVIDER pins a provider explicitly. With no pin, the first configured
 * provider wins, and if none is configured the agent uses the deterministic
 * local composer. That ordering means the site is fully functional on a fresh
 * clone with an empty .env, and gets more conversational the moment a key is
 * added — no code change, no redeploy of anything but the environment.
 */
export function resolveProvider(): LlmProvider | null {
  const requested = (process.env.AI_PROVIDER ?? '').toLowerCase() as ProviderId | '';

  if (requested === 'local') return null;

  const anthropic = createAnthropicProvider();
  const openai = createOpenAiProvider();

  if (requested === 'anthropic') return anthropic.isConfigured() ? anthropic : null;
  if (requested === 'openai') return openai.isConfigured() ? openai : null;

  if (anthropic.isConfigured()) return anthropic;
  if (openai.isConfigured()) return openai;
  return null;
}

export type { LlmProvider };
