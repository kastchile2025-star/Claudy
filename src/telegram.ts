const API_BASE = "https://api.telegram.org/bot";

export type TelegramSendResult =
  | { ok: true; messageId: number }
  | { ok: false; error: string };

export class TelegramClient {
  constructor(private readonly botToken: string) {}

  private get baseUrl(): string {
    return `${API_BASE}${this.botToken}`;
  }

  async sendMessage(chatId: number, text: string): Promise<TelegramSendResult> {
    try {
      const res = await fetch(`${this.baseUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });

      const json = (await res.json()) as Record<string, unknown>;

      if (!json.ok) {
        return {
          ok: false,
          error: typeof json.description === "string" ? json.description : JSON.stringify(json),
        };
      }

      const result = json.result as { message_id: number };
      return { ok: true, messageId: result.message_id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async getMe(): Promise<{ id: number; username: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/getMe`);
      const json = (await res.json()) as Record<string, unknown>;

      if (!json.ok) return null;

      const result = json.result as { id: number; username: string };
      return { id: result.id, username: result.username };
    } catch {
      return null;
    }
  }
}
