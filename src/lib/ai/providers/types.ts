import type { ChatMessage } from '@/types';

export interface GenerateInput {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  provider: string;
}

export interface LlmProvider {
  id: string;
  /** False when the provider is not configured, so the agent can fall back. */
  isConfigured(): boolean;
  generate(input: GenerateInput): Promise<GenerateResult>;
}

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}
