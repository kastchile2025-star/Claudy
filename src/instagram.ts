const GRAPH_API_VERSION = "v18.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type InstagramSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export class InstagramClient {
  constructor(private readonly pageAccessToken: string) {}

  async sendTextMessage(recipientId: string, text: string): Promise<InstagramSendResult> {
    const url = new URL(`${GRAPH_API_BASE}/me/messages`);
    url.searchParams.set("access_token", this.pageAccessToken);

    const body = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    };

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        const error =
          typeof json.error === "object" && json.error !== null
            ? (json.error as { message?: string }).message ?? JSON.stringify(json.error)
            : JSON.stringify(json);
        return { ok: false, error };
      }

      const messageId = typeof json.message_id === "string" ? json.message_id : "unknown";
      return { ok: true, messageId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async getUserProfile(userId: string): Promise<{ name?: string } | null> {
    const url = new URL(`${GRAPH_API_BASE}/${userId}`);
    url.searchParams.set("access_token", this.pageAccessToken);
    url.searchParams.set("fields", "name");

    try {
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const json = (await res.json()) as Record<string, unknown>;
      return { name: typeof json.name === "string" ? json.name : undefined };
    } catch {
      return null;
    }
  }
}
