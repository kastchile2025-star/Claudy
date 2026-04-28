import { useState, useEffect, useRef, useCallback } from "react";
import type { Session, ModelInfo, ClaudyConfig } from "../types";

// Detectar si estamos en GitHub Codespaces
const isCodespace = window.location.hostname.includes('github.dev');

// En Codespaces, el backend esta en la misma URL pero con puerto 3001
// Ejemplo: frontend = xxx-3000.github.dev, backend = xxx-3001.github.dev
const API_URL = isCodespace
  ? window.location.origin.replace('-3000.', '-3001.')
  : '';

const WS_URL = isCodespace
  ? window.location.href.replace('-3000.', '-3001.').replace('https://', 'wss://').replace(/\/$/, '') + '/ws'
  : `ws://${window.location.host}/ws`;

export function useChat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Session["messages"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [config, setConfig] = useState<ClaudyConfig | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
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
    setCurrentModel(data.openrouter.defaultModel);
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/models`);
      const data = await res.json();
      setModels(data);
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

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log("[ws] connected");
    ws.onclose = () => setTimeout(connectWebSocket, 3000);

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
  }, [loadSessions]);

  useEffect(() => {
    connectWebSocket();
    return () => wsRef.current?.close();
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

      wsRef.current?.send(
        JSON.stringify({
          type: "chat",
          sessionId,
          message: content,
          model: currentModel,
        })
      );
    },
    [currentSessionId, currentModel, createSession]
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
