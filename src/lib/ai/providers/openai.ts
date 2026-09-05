import { ProviderUnavailableError, type GenerateInput, type GenerateResult, type LlmProvider } from '@/lib/ai/providers/types';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/** OpenAI provider — same contract, same server-side-only key handling. */
export function createOpenAiProvider(): LlmProvider {
  return {
    id: 'openai',

    isConfigured() {
      return Boolean(process.env.OPENAI_API_KEY);
    },

    async generate(input: GenerateInput): Promise<GenerateResult> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new ProviderUnavailableError('OpenAI provider is not configured.');
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
          max_tokens: input.maxTokens,
          temperature: input.temperature,
          messages: [
            { role: 'system', content: input.systemPrompt },
            ...input.messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        throw new ProviderUnavailableError(`OpenAI request failed with status ${response.status}`);
      }

      const data: unknown = await response.json();
      const text = extractText(data);
      if (!text) {
        throw new ProviderUnavailableError('OpenAI returned an empty response.');
      }

      return { text, provider: 'openai' };
    },
  };
}

function extractText(data: unknown): string {
  if (typeof data !== 'object' || data === null) return '';
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const first = choices[0];
  if (typeof first !== 'object' || first === null) return '';
  const message = (first as { message?: { content?: unknown } }).message;
  return typeof message?.content === 'string' ? message.content.trim() : '';
}
