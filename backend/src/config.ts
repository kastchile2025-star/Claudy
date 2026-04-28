import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

export interface ClaudyConfig {
  openrouter: {
    apiKey: string;
    defaultModel: string;
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
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
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
