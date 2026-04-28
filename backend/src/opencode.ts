import { getConfig } from "./config";
import { saveSession } from "./sessions/store";
import type { Session } from "./sessions/types";

interface OpenCodeSession {
  id: string;
  title?: string;
}

interface OpenCodeProviderModel {
  id?: string;
  name?: string;
  description?: string;
  limit?: {
    context?: number;
  };
}

interface OpenCodeProvider {
  id?: string;
  name?: string;
  models?: Record<string, OpenCodeProviderModel>;
}

interface OpenCodeProviderResponse {
  all?: OpenCodeProvider[];
  providers?: OpenCodeProvider[];
  connected?: string[];
}

interface OpenCodeTextPart {
  type: "text";
  text: string;
}

interface OpenCodeError {
  name?: string;
  data?: {
    message?: string;
  };
}

interface OpenCodeMessageResponse {
  info?: {
    error?: OpenCodeError;
  };
  parts?: Array<OpenCodeTextPart | { type: string; [key: string]: unknown }>;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
}

const DISABLED_TOOLS = {
  bash: false,
  read: false,
  edit: false,
  glob: false,
  grep: false,
  webfetch: false,
  task: false,
  todowrite: false,
  websearch: false,
  codesearch: false,
  lsp: false,
  skill: false,
};
const STALE_SESSION_TIMEOUT_MS = 20_000;

function getAuthHeader(): string | undefined {
  const { username, password } = getConfig().opencode;
  if (!password) return undefined;
  return `Basic ${Buffer.from(`${username || "opencode"}:${password}`).toString("base64")}`;
}

async function requestOpenCode<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { baseUrl } = getConfig().opencode;
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const headers = new Headers(init.headers);
  const auth = getAuthHeader();

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    headers.set("Authorization", auth);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (error) {
    throw new Error(
      `No pude conectar con OpenCode en ${baseUrl}. Inicia OpenCode con "opencode serve --port 4096 --hostname 127.0.0.1" y vuelve a intentar. Detalle: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenCode error ${response.status}: ${text || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function parseModel(model: string): { providerID: string; modelID: string } {
  const [providerID, ...modelParts] = model.split("/");
  const modelID = modelParts.join("/");

  if (!providerID || !modelID) {
    throw new Error(
      `Modelo OpenCode invalido: "${model}". Usa el formato provider/model, por ejemplo anthropic/claude-sonnet-4.`
    );
  }

  return { providerID, modelID };
}

function extractAssistantText(response: OpenCodeMessageResponse): string {
  if (response.info?.error) {
    const { name, data } = response.info.error;
    throw new Error(data?.message || name || "OpenCode devolvio un error al responder");
  }

  const text = response.parts
    ?.filter((part): part is OpenCodeTextPart => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  return text || "(OpenCode no devolvio texto en la respuesta.)";
}

async function ensureOpenCodeSession(session: Session): Promise<string> {
  if (session.opencodeSessionId) {
    return session.opencodeSessionId;
  }

  const created = await requestOpenCode<OpenCodeSession>("/session", {
    method: "POST",
    body: JSON.stringify({ title: session.title }),
  });

  session.opencodeSessionId = created.id;
  saveSession(session);

  return created.id;
}

export async function sendMessageToOpenCode(
  session: Session,
  userMessage: string,
  model: string,
  skillContext = ""
): Promise<string> {
  const config = getConfig();
  const parsedModel = parseModel(model || config.opencode.defaultModel);
  const system = skillContext
    ? `${config.agent.systemPrompt}\n\n${skillContext}`
    : config.agent.systemPrompt;

  const send = async (timeoutMs?: number) => {
    const sessionId = await ensureOpenCodeSession(session);
    const signal =
      timeoutMs && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(timeoutMs)
        : undefined;

    return requestOpenCode<OpenCodeMessageResponse>(
      `/session/${encodeURIComponent(sessionId)}/message`,
      {
        method: "POST",
        signal,
        body: JSON.stringify({
          model: parsedModel,
          system,
          tools: DISABLED_TOOLS,
          parts: [{ type: "text", text: userMessage }],
        }),
      }
    );
  };

  let response: OpenCodeMessageResponse;
  const hadOpenCodeSession = Boolean(session.opencodeSessionId);
  try {
    response = await send(hadOpenCodeSession ? STALE_SESSION_TIMEOUT_MS : undefined);
  } catch (error) {
    // OpenCode keeps sessions in its own process. If it restarts, Claudy can
    // still have an old opencodeSessionId persisted locally; recreate once.
    if (!hadOpenCodeSession) throw error;
    session.opencodeSessionId = undefined;
    saveSession(session);
    response = await send();
  }

  return extractAssistantText(response);
}

export async function listModels(): Promise<ModelInfo[]> {
  const config = getConfig();
  const fallback = {
    id: config.opencode.defaultModel,
    name: config.opencode.defaultModel,
  };

  try {
    const response = await requestOpenCode<OpenCodeProviderResponse>("/provider");
    const providers = response.all || response.providers || [];
    const connected = response.connected?.length
      ? new Set(response.connected)
      : undefined;

    const models = providers.flatMap((provider) => {
      const providerID = provider.id;
      if (!providerID || !provider.models) return [];
      if (connected && !connected.has(providerID)) return [];

      return Object.entries(provider.models).map(([modelID, model]) => ({
        id: `${providerID}/${model.id || modelID}`,
        name: `${provider.name || providerID}: ${model.name || model.id || modelID}`,
        description: model.description,
        context_length: model.limit?.context,
      }));
    });

    return models.length > 0 ? models : [fallback];
  } catch {
    return [fallback];
  }
}
