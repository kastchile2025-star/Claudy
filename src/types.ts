export interface Config {
  openrouter: {
    apiKey: string;
    defaultModel: string;
  };
  agent: {
    systemPrompt: string;
    maxTokens: number;
    temperature: number;
  };
  server?: {
    port: number;
    host: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  name: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: number;
    completion: number;
  };
  context_length?: number;
}

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  model: string;
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

export interface ChatResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}
