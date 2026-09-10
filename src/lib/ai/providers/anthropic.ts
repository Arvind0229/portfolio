import { ProviderUnavailableError, type GenerateInput, type GenerateResult, type LlmProvider } from '@/lib/ai/providers/types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-5';

/**
 * Anthropic provider.
 *
 * Called only from server code. The key is read from the environment at call
 * time and never travels to the browser — the client talks to /api/ai/chat and
 * nothing else.
 *
 * Implemented against the HTTP API directly rather than pulling in an SDK: one
 * POST with a stable request shape does not justify another dependency, its
 * transitive tree, or its bundle and audit surface.
 */
export function createAnthropicProvider(): LlmProvider {
  return {
    id: 'anthropic',

    isConfigured() {
      return Boolean(process.env.ANTHROPIC_API_KEY);
    },

    async generate(input: GenerateInput): Promise<GenerateResult> {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new ProviderUnavailableError('Anthropic provider is not configured.');
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
          max_tokens: input.maxTokens,
          temperature: input.temperature,
          system: input.systemPrompt,
          messages: input.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        // The upstream body may contain account or request detail. It is logged
        // with a status code only and never forwarded to the visitor.
        throw new ProviderUnavailableError(`Anthropic request failed with status ${response.status}`);
      }

      const data: unknown = await response.json();
      const text = extractText(data);
      if (!text) {
        throw new ProviderUnavailableError('Anthropic returned an empty response.');
      }

      return { text, provider: 'anthropic' };
    },
  };
}

function extractText(data: unknown): string {
  if (typeof data !== 'object' || data === null) return '';
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  return content
    .map((block) =>
      typeof block === 'object' && block !== null && (block as { type?: string }).type === 'text'
        ? String((block as { text?: string }).text ?? '')
        : '',
    )
    .join('')
    .trim();
}
