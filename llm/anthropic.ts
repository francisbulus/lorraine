// Anthropic provider — first LLM provider implementation.
// Uses the Anthropic Messages API via fetch. No SDK dependency.

import type { LLMProvider, LLMMessage, LLMResponse } from './types.js';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export function createAnthropicProvider(config: AnthropicConfig): LLMProvider {
  const model = config.model ?? 'claude-sonnet-4-20250514';
  const maxTokens = config.maxTokens ?? 4096;

  return {
    async complete(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse> {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${body}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };
      const textBlock = data.content.find(c => c.type === 'text');
      if (!textBlock) {
        throw new Error('Anthropic API returned no text content');
      }

      return { content: textBlock.text };
    },
  };
}
