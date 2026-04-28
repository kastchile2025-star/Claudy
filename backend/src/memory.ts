import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { getConfig } from "./config";

interface MemoryEntry {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  vector: number[];
}

interface MemoryStore {
  entries: MemoryEntry[];
}

const MEMORY_PATH = join(homedir(), ".claudy", "memory.json");
const VECTOR_DIMS = 256;
const MIN_MEMORY_LENGTH = 12;

function ensureMemoryDir() {
  const dir = join(homedir(), ".claudy");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadStore(): MemoryStore {
  ensureMemoryDir();
  if (!existsSync(MEMORY_PATH)) return { entries: [] };

  try {
    const parsed = JSON.parse(readFileSync(MEMORY_PATH, "utf-8")) as MemoryStore;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

function saveStore(store: MemoryStore) {
  ensureMemoryDir();
  writeFileSync(MEMORY_PATH, JSON.stringify(store, null, 2));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % VECTOR_DIMS;
}

function vectorize(text: string): number[] {
  const vector = Array.from({ length: VECTOR_DIMS }, () => 0);
  for (const token of tokenize(text)) {
    vector[hashToken(token)] += 1;
  }
  return vector;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < VECTOR_DIMS; i += 1) {
    dot += (a[i] || 0) * (b[i] || 0);
    normA += (a[i] || 0) ** 2;
    normB += (b[i] || 0) ** 2;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function rememberMessage(
  sessionId: string,
  role: "user" | "assistant",
  text: string
) {
  const config = getConfig();
  if (!config.memory.enabled) return;

  const normalized = normalizeText(text);
  if (normalized.length < MIN_MEMORY_LENGTH) return;
  if (normalized.startsWith("/")) return;

  const store = loadStore();
  store.entries.push({
    id: crypto.randomUUID(),
    sessionId,
    role,
    text: normalized.slice(0, 2_000),
    timestamp: Date.now(),
    vector: vectorize(normalized),
  });

  store.entries = store.entries.slice(-config.memory.maxEntries);
  saveStore(store);
}

export function searchMemories(query: string, limit?: number): MemoryEntry[] {
  const config = getConfig();
  if (!config.memory.enabled) return [];

  const queryVector = vectorize(query);
  return loadStore()
    .entries.map((entry) => ({ entry, score: cosine(queryVector, entry.vector) }))
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit || config.memory.maxResults)
    .map((item) => item.entry);
}

export function buildMemoryContext(userMessage: string): string {
  const memories = searchMemories(userMessage);
  if (memories.length === 0) return "";

  return [
    "Memorias relevantes recuperadas localmente. Uselas como contexto suave; si contradicen al usuario actual, prioriza al usuario actual.",
    ...memories.map((memory) => `- [${memory.role}] ${memory.text}`),
  ].join("\n");
}

export function getMemoryStats() {
  const store = loadStore();
  return {
    entries: store.entries.length,
    enabled: getConfig().memory.enabled,
  };
}
