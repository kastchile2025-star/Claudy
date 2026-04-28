import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Session, Message } from "./types";

const SESSIONS_DIR = join(homedir(), ".claudy", "sessions");

function ensureDir() {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function sessionPath(id: string): string {
  return join(SESSIONS_DIR, `${id}.json`);
}

export function createSession(model: string): Session {
  ensureDir();
  const session: Session = {
    id: crypto.randomUUID(),
    title: "Nueva conversacion",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model,
  };
  writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2));
  return session;
}

export function getSession(id: string): Session | null {
  ensureDir();
  const path = sessionPath(id);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  ensureDir();
  session.updatedAt = Date.now();
  writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2));
}

export function listSessions(): Session[] {
  ensureDir();
  const files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"));
  const sessions: Session[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(join(SESSIONS_DIR, file), "utf-8");
      sessions.push(JSON.parse(raw) as Session);
    } catch {
      // skip invalid
    }
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteSession(id: string): boolean {
  ensureDir();
  const path = sessionPath(id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

export function addMessage(sessionId: string, message: Message): Session | null {
  const session = getSession(sessionId);
  if (!session) return null;
  session.messages.push(message);
  if (session.messages.length === 1 && message.role === "user") {
    session.title = message.content.slice(0, 60) || "Nueva conversacion";
  }
  saveSession(session);
  return session;
}

export function updateSessionModel(sessionId: string, model: string): Session | null {
  const session = getSession(sessionId);
  if (!session) return null;
  session.model = model;
  saveSession(session);
  return session;
}
