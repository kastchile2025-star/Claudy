import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.claudy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: Config = {
  opencode: {
    baseUrl: 'http://127.0.0.1:4096',
    defaultModel: 'anthropic/claude-sonnet-4',
    apiKey: '',
    username: 'opencode',
    password: '',
  },
  agent: {
    systemPrompt: 'Eres Claudy, un asistente de IA personal. Eres útil, honesto y seguro.',
    maxTokens: 4096,
    temperature: 0.7,
  },
  server: {
    port: 3001,
    host: '127.0.0.1',
  },
};

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): Config {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      opencode: { ...DEFAULT_CONFIG.opencode, ...(parsed.opencode || {}) },
      agent: { ...DEFAULT_CONFIG.agent, ...(parsed.agent || {}) },
      server: { ...DEFAULT_CONFIG.server, ...(parsed.server || {}) },
    };
  } catch (error) {
    console.error('Error loading config:', error);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function updateConfig(updates: Partial<Config>): void {
  const config = loadConfig();
  const merged = {
    ...config,
    ...updates,
    opencode: { ...config.opencode, ...updates.opencode },
    agent: { ...config.agent, ...updates.agent },
    server: { ...config.server, ...updates.server },
  };
  saveConfig(merged);
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getSessionsDir(): string {
  const dir = path.join(CONFIG_DIR, 'sessions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
