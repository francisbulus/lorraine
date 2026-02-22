// LLM provider abstraction — what the engine services need from a language model.
// The services layer constructs prompts and parses responses.
// The LLM layer just handles the API call.

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
}

export interface LLMProvider {
  complete(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse>;
}
