export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  model?: string;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
  opencodeSessionId?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
}

export interface ClaudyConfig {
  opencode: {
    baseUrl: string;
    defaultModel: string;
    username?: string;
    passwordConfigured?: boolean;
  };
  telegram: {
    enabled: boolean;
    tokenConfigured: boolean;
    allowedChatIds: number[];
  };
  agent: {
    systemPrompt: string;
    maxTokens: number;
    temperature: number;
  };
  server: {
    port: number;
    host: string;
  };
}
