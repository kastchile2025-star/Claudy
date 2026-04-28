import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface ClaudyConfig {
  openrouter: {
    apiKey: string;
    defaultModel: string;
  };
  opencode: {
    baseUrl: string;
    defaultModel: string;
    username?: string;
    password?: string;
  };
  telegram: {
    enabled: boolean;
    botToken: string;
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

const DEFAULT_CONFIG: ClaudyConfig = {
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "anthropic/claude-sonnet-4",
  },
  opencode: {
    baseUrl: process.env.OPENCODE_BASE_URL || "http://127.0.0.1:4096",
    defaultModel: process.env.OPENCODE_MODEL || "opencode-go/qwen3.6-plus",
    username: process.env.OPENCODE_SERVER_USERNAME,
    password: process.env.OPENCODE_SERVER_PASSWORD,
  },
  telegram: {
    enabled: process.env.TELEGRAM_BOT_ENABLED === "true",
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    allowedChatIds: (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .map(Number)
      .filter(Number.isFinite),
  },
  skills: {
    enabled: process.env.CLAUDY_SKILLS_ENABLED !== "false",
    maxContextSkills: Number(process.env.CLAUDY_MAX_CONTEXT_SKILLS || 3),
  },
  memory: {
    enabled: process.env.CLAUDY_MEMORY_ENABLED !== "false",
    maxResults: Number(process.env.CLAUDY_MEMORY_MAX_RESULTS || 5),
    maxEntries: Number(process.env.CLAUDY_MEMORY_MAX_ENTRIES || 500),
  },
  tools: {
    enabled: process.env.CLAUDY_TOOLS_ENABLED !== "false",
    allowRead: process.env.CLAUDY_TOOL_READ !== "false",
    allowWrite: process.env.CLAUDY_TOOL_WRITE === "true",
    allowExec: process.env.CLAUDY_TOOL_EXEC === "true",
    allowBrowser: process.env.CLAUDY_TOOL_BROWSER !== "false",
    allowedRoot: process.env.CLAUDY_TOOLS_ROOT || join(process.cwd(), ".."),
    commandTimeoutMs: Number(process.env.CLAUDY_TOOL_TIMEOUT_MS || 10_000),
    maxOutputChars: Number(process.env.CLAUDY_TOOL_MAX_OUTPUT_CHARS || 20_000),
  },
  agent: {
    systemPrompt:
      "Eres Claudy, un asistente de IA personal, util, directo y amigable. Responde en el idioma del usuario. Usa markdown para formatear tus respuestas. Cuando necesites buscar informacion actual, usa la herramienta de busqueda web.",
    maxTokens: 4096,
    temperature: 0.7,
  },
  server: {
    port: 3001,
    host: "0.0.0.0",
  },
};

function getConfigPath(): string {
  const configDir = join(homedir(), ".claudy");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  return join(configDir, "config.json");
}

export function loadConfig(): ClaudyConfig {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<ClaudyConfig>;
      return {
        openrouter: { ...DEFAULT_CONFIG.openrouter, ...parsed.openrouter },
        opencode: { ...DEFAULT_CONFIG.opencode, ...parsed.opencode },
        telegram: {
          ...DEFAULT_CONFIG.telegram,
          ...parsed.telegram,
          allowedChatIds:
            parsed.telegram?.allowedChatIds || DEFAULT_CONFIG.telegram.allowedChatIds,
        },
        skills: { ...DEFAULT_CONFIG.skills, ...parsed.skills },
        memory: { ...DEFAULT_CONFIG.memory, ...parsed.memory },
        tools: { ...DEFAULT_CONFIG.tools, ...parsed.tools },
        agent: { ...DEFAULT_CONFIG.agent, ...parsed.agent },
        server: { ...DEFAULT_CONFIG.server, ...parsed.server },
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Partial<ClaudyConfig>): ClaudyConfig {
  const current = loadConfig();
  const updated: ClaudyConfig = {
    openrouter: { ...current.openrouter, ...config.openrouter },
    opencode: { ...current.opencode, ...config.opencode },
    telegram: { ...current.telegram, ...config.telegram },
    skills: { ...current.skills, ...config.skills },
    memory: { ...current.memory, ...config.memory },
    tools: { ...current.tools, ...config.tools },
    agent: { ...current.agent, ...config.agent },
    server: { ...current.server, ...config.server },
  };
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(updated, null, 2));
  return updated;
}

let _config: ClaudyConfig | null = null;

export function getConfig(): ClaudyConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export function refreshConfig(): ClaudyConfig {
  _config = loadConfig();
  return _config;
}
