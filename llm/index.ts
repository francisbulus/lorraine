// LLM provider abstraction — entry point.
// Export types and provider factories.

export type { LLMProvider, LLMMessage, LLMResponse } from './types.js';
export { createAnthropicProvider } from './anthropic.js';
export type { AnthropicConfig } from './anthropic.js';
