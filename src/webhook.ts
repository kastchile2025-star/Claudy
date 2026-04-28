import { Hono } from "hono";
import { logger } from "hono/logger";
import type { Env } from "./env.js";
import { TelegramClient } from "./telegram.js";
import { OpenAIClient } from "./openai-client.js";

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string; first_name?: string; username?: string };
    text?: string;
    date: number;
  };
};

export function createApp(env: Env) {
  const app = new Hono();
  const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
  const openai = new OpenAIClient(env.OPENAI_API_KEY);

  app.use(logger());

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/webhook", (c) => c.text("OK"));

  app.post("/webhook", async (c) => {
    let update: TelegramUpdate;
    try {
      update = await c.req.json();
    } catch {
      return c.text("Invalid JSON", 400);
    }

    const message = update.message;
    if (!message?.text || !message?.chat?.id) {
      return c.text("EVENT_RECEIVED", 200);
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const userName = message.from?.first_name ?? message.chat.first_name ?? "User";
    const username = message.from?.username;

    console.log(`[telegram] message from ${username ?? userName} (${chatId}): ${text}`);

    try {
      const systemPrompt = `You are a helpful assistant. User: ${userName}${username ? ` (@${username})` : ""}. Be concise and friendly.`;
      const reply = await openai.chat(env.OPENAI_MODEL, text, systemPrompt);

      const result = await telegram.sendMessage(chatId, reply);
      if (result.ok) {
        console.log(`[telegram] reply sent (mid: ${result.messageId})`);
      } else {
        console.error(`[telegram] send failed: ${result.error}`);
      }
    } catch (err) {
      console.error("[telegram/openai] error:", err);
    }

    return c.text("EVENT_RECEIVED", 200);
  });

  return app;
}
