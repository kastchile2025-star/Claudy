import "dotenv/config";
import { serve } from "@hono/node-server";
import { loadEnv } from "./env.js";
import { createApp } from "./webhook.js";

async function main() {
  const env = loadEnv();
  const app = createApp(env);

  console.log(`[claudy] starting on port ${env.PORT}...`);

  serve({
    fetch: app.fetch,
    port: Number(env.PORT),
  });

  console.log(`[claudy] listening on http://localhost:${env.PORT}`);
  console.log(`[claudy] webhook: /webhook`);
}

main().catch((err) => {
  console.error("[claudy] fatal:", err);
  process.exit(1);
});
