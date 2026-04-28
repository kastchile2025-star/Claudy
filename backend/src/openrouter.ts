import { getConfig } from "./config";
import type { Message, ToolCall } from "./sessions/types";

interface OpenRouterMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenRouterToolCall[];
}

interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenRouterStreamChunk {
  id: string;
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
      tool_calls?: OpenRouterToolCall[];
    };
    finish_reason: string | null;
    index: number;
  }>;
}

export async function* streamChat(
  messages: Message[],
  model: string,
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>
): AsyncGenerator<string, { toolCalls?: ToolCall[]; usage?: { prompt_tokens: number; completion_tokens: number } } | undefined, unknown> {
  const config = getConfig();
  const apiKey = config.openrouter.apiKey;

  if (!apiKey) {
    throw new Error("OpenRouter API key no configurada");
  }

  const systemMsg: OpenRouterMessage = {
    role: "system",
    content: config.agent.systemPrompt,
  };

  const history: OpenRouterMessage[] = messages.map((m) => {
    const base: OpenRouterMessage = {
      role: m.role,
      content: m.content,
    };
    if (m.role === "tool" && m.toolResult) {
      base.tool_call_id = m.toolResult;
      base.name = m.toolResult;
    }
    if (m.toolCalls) {
      base.tool_calls = m.toolCalls.map((tc) => ({
        id: tc.id,
        type: tc.type as "function",
        function: tc.function,
      }));
    }
    return base;
  });

  const body: Record<string, unknown> = {
    model,
    messages: [systemMsg, ...history],
    stream: true,
    max_tokens: config.agent.maxTokens,
    temperature: config.agent.temperature,
    transforms: ["middle-out"],
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3001",
      "X-Title": "Claudy",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let toolCalls: ToolCall[] | undefined;
  let usage:
    | { prompt_tokens: number; completion_tokens: number }
    | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const chunk: OpenRouterStreamChunk = JSON.parse(data);
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            yield delta.content;
          }

          if (delta.tool_calls) {
            if (!toolCalls) toolCalls = [];
            for (const tc of delta.tool_calls) {
              const existing = toolCalls.find((t) => t.id === tc.id);
              if (existing) {
                existing.function.arguments += tc.function.arguments || "";
              } else {
                toolCalls.push({
                  id: tc.id,
                  type: "function",
                  function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments || "",
                  },
                });
              }
            }
          }

          // OpenRouter may send usage in the last chunk
          const lastChunk = chunk as unknown as Record<string, unknown>;
          if (lastChunk.usage) {
            usage = lastChunk.usage as { prompt_tokens: number; completion_tokens: number };
          }
        } catch {
          // skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { toolCalls, usage };
}

export async function listModels(): Promise<
  Array<{
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: { prompt: string; completion: string };
  }>
> {
  const config = getConfig();
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${config.openrouter.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }

  const data = (await response.json()) as {
    data: Array<{
      id: string;
      name: string;
      description?: string;
      context_length?: number;
      pricing?: { prompt: string; completion: string };
    }>;
  };

  return data.data || [];
}
