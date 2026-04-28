import { useState, useEffect, useRef, useCallback } from "react";
import type { Session, ModelInfo, ClaudyConfig } from "../types";

// Detectar si estamos en GitHub Codespaces
const isCodespace = window.location.hostname.includes("github.dev");
const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

// En Codespaces, el backend esta en la misma URL base pero con puerto 3001
// Ejemplo: frontend = xxx-3000.github.dev, backend = xxx-3001.github.dev
let API_URL = '';
let WS_URL = `ws://${window.location.host}/ws`;

if (isCodespace) {
  const currentUrl = new URL(window.location.href);
  const hostname = currentUrl.hostname;
  // Reemplazar -3000. con -3001. en el hostname
  const backendHostname = hostname.replace('-3000.', '-3001.');
  API_URL = `https://${backendHostname}`;
  WS_URL = `wss://${backendHostname}/ws`;
} else if (isLocalhost) {
  API_URL = "http://127.0.0.1:3001";
  WS_URL = "ws://127.0.0.1:3001/ws";
}

function waitForSocketOpen(ws: WebSocket): Promise<void> {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
  if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
    return Promise.reject(new Error("La conexion WebSocket con el backend esta cerrada"));
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("No se pudo conectar al backend por WebSocket"));
    }, 5000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("error", handleError);
      ws.removeEventListener("close", handleClose);
    };

    const handleOpen = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Error conectando al backend por WebSocket"));
    };

    const handleClose = () => {
      cleanup();
      reject(new Error("Se cerro la conexion WebSocket con el backend"));
    };

    ws.addEventListener("open", handleOpen);
    ws.addEventListener("error", handleError);
    ws.addEventListener("close", handleClose);
  });
}

export function useChat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Session["messages"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [config, setConfig] = useState<ClaudyConfig | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);
  const currentContentRef = useRef("");

  const loadSessions = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/sessions`);
    const data = await res.json();
    setSessions(data);
  }, []);

  const loadConfig = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/config`);
    const data = await res.json();
    setConfig(data);
    setCurrentModel(data.opencode.defaultModel);
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/models`);
      const data = await res.json();
      setModels(Array.isArray(data) ? data : []);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadConfig();
    loadModels();
  }, [loadSessions, loadConfig, loadModels]);

  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find((s) => s.id === currentSessionId);
      if (session) {
        setMessages(session.messages);
        setCurrentModel(session.model);
      }
    }
  }, [currentSessionId, sessions]);

  const connectWebSocket = useCallback((): WebSocket => {
    const current = wsRef.current;
    if (
      current &&
      (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)
    ) {
      return current;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log("[ws] connected");
    ws.onerror = () => console.error("[ws] connection error");
    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (shouldReconnectRef.current) {
        window.setTimeout(connectWebSocket, 3000);
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "chunk") {
        currentContentRef.current += data.content;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, content: currentContentRef.current };
            return updated;
          }
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: currentContentRef.current,
              timestamp: Date.now(),
            },
          ];
        });
      } else if (data.type === "done") {
        setIsLoading(false);
        currentContentRef.current = "";
        loadSessions();
      } else if (data.type === "error") {
        setIsLoading(false);
        currentContentRef.current = "";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${data.message}`,
            timestamp: Date.now(),
          },
        ]);
      }
    };

    return ws;
  }, [loadSessions]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connectWebSocket();
    return () => {
      shouldReconnectRef.current = false;
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const createSession = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: currentModel }),
    });
    const session = await res.json();
    setSessions((prev) => [session, ...prev]);
    setCurrentSessionId(session.id);
    setMessages([]);
    return session.id;
  }, [currentModel]);

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    currentContentRef.current = "";
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      await fetch(`${API_URL}/api/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
    [currentSessionId]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await createSession();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content,
          timestamp: Date.now(),
        },
      ]);

      setIsLoading(true);
      currentContentRef.current = "";

      try {
        const ws = connectWebSocket();
        await waitForSocketOpen(ws);
        ws.send(
          JSON.stringify({
            type: "chat",
            sessionId,
            message: content,
            model: currentModel,
          })
        );
      } catch (error) {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: Date.now(),
          },
        ]);
      }
    },
    [currentSessionId, currentModel, createSession, connectWebSocket]
  );

  const changeModel = useCallback(
    async (model: string) => {
      setCurrentModel(model);
      if (currentSessionId) {
        await fetch(`${API_URL}/api/sessions/${currentSessionId}/model`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model }),
        });
      }
    },
    [currentSessionId]
  );

  return {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    models,
    currentModel,
    config,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
    changeModel,
    refreshSessions: loadSessions,
  };
}
