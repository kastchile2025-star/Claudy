import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { getConfig } from "./config";
import { runAgent } from "./agent";
import { createSession, getSession } from "./sessions/store";

interface TelegramChat {
  id: number;
  type: string;
  username?: string;
  first_name?: string;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface TelegramState {
  lastUpdateId?: number;
  chats: Record<string, string>;
}

const STATE_PATH = join(homedir(), ".claudy", "telegram-sessions.json");
const TELEGRAM_LIMIT = 4096;

let pollingGeneration = 0;
let polling = false;

function loadState(): TelegramState {
  if (!existsSync(STATE_PATH)) {
    return { chats: {} };
  }

  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf-8")) as TelegramState;
  } catch {
    return { chats: {} };
  }
}

function saveState(state: TelegramState) {
  const dir = join(homedir(), ".claudy");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function apiUrl(method: string): string {
  const token = getConfig().telegram.botToken;
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramRequest<T>(
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  const data = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram error ${response.status}`);
  }

  return data.result;
}

function isChatAllowed(chatId: number): boolean {
  const allowed = getConfig().telegram.allowedChatIds;
  return allowed.length === 0 || allowed.includes(chatId);
}

async function sendMessage(chatId: number, text: string, replyToMessageId?: number) {
  const safeText = text || "(Sin respuesta)";
  for (let start = 0; start < safeText.length; start += TELEGRAM_LIMIT) {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: safeText.slice(start, start + TELEGRAM_LIMIT),
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    });
  }
}

async function sendTyping(chatId: number) {
  try {
    await telegramRequest("sendChatAction", {
      chat_id: chatId,
      action: "typing",
    });
  } catch {
    // Typing indicators are nice-to-have; message delivery still matters.
  }
}

function getOrCreateSession(chatId: number): string {
  const state = loadState();
  const chatKey = String(chatId);
  const existingSessionId = state.chats[chatKey];

  if (existingSessionId && getSession(existingSessionId)) {
    return existingSessionId;
  }

  const session = createSession(getConfig().opencode.defaultModel);
  state.chats[chatKey] = session.id;
  saveState(state);
  return session.id;
}

function resetSession(chatId: number): string {
  const state = loadState();
  const session = createSession(getConfig().opencode.defaultModel);
  state.chats[String(chatId)] = session.id;
  saveState(state);
  return session.id;
}

async function handleMessage(message: TelegramMessage) {
  const text = message.text?.trim();
  const chatId = message.chat.id;

  if (!text) return;
  if (!isChatAllowed(chatId)) return;

  if (text === "/start") {
    getOrCreateSession(chatId);
    await sendMessage(
      chatId,
      "Hola, soy Claudy. Escribeme cualquier mensaje y lo responderé usando el agente local.",
      message.message_id
    );
    return;
  }

  if (text === "/reset") {
    resetSession(chatId);
    await sendMessage(chatId, "Listo, cree una conversacion nueva.", message.message_id);
    return;
  }

  await sendTyping(chatId);
  const sessionId = getOrCreateSession(chatId);
  const chunks: string[] = [];
  const result = await runAgent(
    sessionId,
    text,
    getConfig().opencode.defaultModel,
    (chunk) => chunks.push(chunk)
  );

  if (!result.success) {
    await sendMessage(chatId, `Error: ${result.error || "No pude responder."}`, message.message_id);
    return;
  }

  await sendMessage(chatId, chunks.join(""), message.message_id);
}

async function pollTelegram(generation: number) {
  const state = loadState();
  let offset = state.lastUpdateId ? state.lastUpdateId + 1 : undefined;

  console.log("[telegram] Bot polling started");

  while (pollingGeneration === generation) {
    try {
      const updates = await telegramRequest<TelegramUpdate[]>("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        state.lastUpdateId = update.update_id;
        saveState(state);

        if (update.message) {
          await handleMessage(update.message);
        }
      }
    } catch (error) {
      console.error("[telegram]", error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log("[telegram] Bot polling stopped");
}

export function syncTelegramBot() {
  const config = getConfig().telegram;
  const shouldRun = config.enabled && Boolean(config.botToken);

  if (!shouldRun) {
    if (polling) {
      pollingGeneration += 1;
      polling = false;
      console.log("[telegram] Bot disabled");
    }
    return;
  }

  if (polling) return;

  polling = true;
  const generation = ++pollingGeneration;
  void pollTelegram(generation).finally(() => {
    if (pollingGeneration === generation) {
      polling = false;
    }
  });
}
