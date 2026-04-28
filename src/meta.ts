import crypto from "node:crypto";

export type MetaWebhookEntry = {
  id: string;
  time: number;
  messaging?: InstagramMessagingEvent[];
};

export type InstagramMessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{ type: string; payload: { url: string } }>;
  };
  postback?: {
    mid: string;
    payload: string;
    title?: string;
  };
};

export type MetaWebhookBody = {
  object: string;
  entry: MetaWebhookEntry[];
};

export function verifyWebhookSignature(
  appSecret: string,
  body: string,
  signatureHeader: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest("hex");
  const signature = signatureHeader.replace("sha256=", "");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

export function parseMessagingEvents(payload: MetaWebhookBody): InstagramMessagingEvent[] {
  if (payload.object !== "instagram") return [];
  const events: InstagramMessagingEvent[] = [];
  for (const entry of payload.entry) {
    if (entry.messaging) {
      events.push(...entry.messaging);
    }
  }
  return events;
}
