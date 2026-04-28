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
  skills: {
    enabled: boolean;
    maxContextSkills: number;
  };
  memory: {
    enabled: boolean;
    maxResults: number;
    maxEntries: number;
  };
  tools: {
    enabled: boolean;
    allowRead: boolean;
    allowWrite: boolean;
    allowExec: boolean;
    allowBrowser: boolean;
    allowedRoot: string;
    commandTimeoutMs: number;
    maxOutputChars: number;
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

export interface MemoryStats {
  entries: number;
  enabled: boolean;
}

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
  source: "project" | "user";
  score?: number;
}
