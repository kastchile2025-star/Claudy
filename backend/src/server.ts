import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { getConfig, saveConfig, refreshConfig } from "./config";
import { runAgent, listModels } from "./agent";
import { syncTelegramBot } from "./telegram";
import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  updateSessionModel,
} from "./sessions/store";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// CORS: permitir cualquier origen en desarrollo (incluyendo Codespaces)
app.use(cors({
  origin: true,
  credentials: false,
}));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

// Config
app.get("/api/config", (_req, res) => {
  const config = getConfig();
  res.json({
    opencode: {
      baseUrl: config.opencode.baseUrl,
      defaultModel: config.opencode.defaultModel,
      username: config.opencode.username || "opencode",
      passwordConfigured: Boolean(config.opencode.password),
    },
    telegram: {
      enabled: config.telegram.enabled,
      tokenConfigured: Boolean(config.telegram.botToken),
      allowedChatIds: config.telegram.allowedChatIds,
    },
    agent: config.agent,
    server: config.server,
  });
});

app.post("/api/config", (req, res) => {
  const updated = saveConfig(req.body);
  refreshConfig();
  syncTelegramBot();
  res.json(updated);
});

// Models
app.get("/api/models", async (_req, res) => {
  try {
    const models = await listModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Sessions
app.get("/api/sessions", (_req, res) => {
  res.json(listSessions());
});

app.post("/api/sessions", (req, res) => {
  const model = req.body.model || getConfig().opencode.defaultModel;
  const session = createSession(model);
  res.json(session);
});

app.get("/api/sessions/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

app.delete("/api/sessions/:id", (req, res) => {
  const ok = deleteSession(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ success: true });
});

app.patch("/api/sessions/:id/model", (req, res) => {
  const session = updateSessionModel(req.params.id, req.body.model);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

// WebSocket handling
wss.on("connection", (ws: WebSocket) => {
  console.log("[ws] Client connected");

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "chat") {
        const { sessionId, message, model } = msg;

        ws.send(
          JSON.stringify({ type: "status", status: "thinking", sessionId })
        );

        const result = await runAgent(
          sessionId,
          message,
          model || getConfig().opencode.defaultModel,
          (chunk) => {
            ws.send(JSON.stringify({ type: "chunk", content: chunk, sessionId }));
          }
        );

        if (result.success) {
          ws.send(JSON.stringify({ type: "done", sessionId }));
        } else {
          ws.send(
            JSON.stringify({ type: "error", message: result.error, sessionId })
          );
        }
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("[ws] Client disconnected");
  });
});

// Start server
const config = getConfig();
server.listen(config.server.port, config.server.host, () => {
  console.log(
    `Claudy backend running on http://${config.server.host}:${config.server.port}`
  );
  console.log(`WebSocket on ws://${config.server.host}:${config.server.port}/ws`);
  syncTelegramBot();
});
