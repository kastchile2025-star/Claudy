import { Config, ModelInfo, OpenCodeMessageResponse, OpenCodeTextPart, Session } from './types.js';
import { saveSession } from './utils.js';

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

export class OpenCodeClient {
  private baseUrl: string;
  private apiKey?: string;
  private username?: string;
  private password?: string;

  constructor(config: Config['opencode']) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
  }

  private getAuthHeader(): string | undefined {
    // API key tiene prioridad: Bearer auth
    if (this.apiKey) return `Bearer ${this.apiKey}`;
    // Fallback: Basic auth
    if (!this.password) return undefined;
    const user = this.username || 'opencode';
    return `Basic ${Buffer.from(`${user}:${this.password}`).toString('base64')}`;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(
      path,
      this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`
    );
    const headers = new Headers(init.headers);
    const auth = this.getAuthHeader();

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (auth) headers.set('Authorization', auth);

    let response: Response;
    try {
      response = await fetch(url, { ...init, headers });
    } catch (error) {
      throw new Error(
        `No pude conectar con OpenCode en ${this.baseUrl}. Inicia OpenCode con "opencode serve --port 4096 --hostname 127.0.0.1". Detalle: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenCode error ${response.status}: ${text || response.statusText}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private parseModel(model: string): { providerID: string; modelID: string } {
    const trimmed = model.trim();
    if (trimmed.includes('/')) {
      const [providerID, ...modelParts] = trimmed.split('/');
      return { providerID, modelID: modelParts.join('/') };
    }
    // Sin slash: tratar el string como modelID con provider vacío.
    // OpenCode/algunos backends aceptan esto y resuelven el provider por sí mismos.
    return { providerID: '', modelID: trimmed };
  }

  private extractText(response: OpenCodeMessageResponse): string {
    if (response.info?.error) {
      const { name, data } = response.info.error;
      throw new Error(data?.message || name || 'OpenCode devolvio un error');
    }
    const text = response.parts
      ?.filter((p): p is OpenCodeTextPart => p.type === 'text')
      .map((p) => p.text)
      .join('\n')
      .trim();
    return text || '(OpenCode no devolvio texto.)';
  }

  async ensureSession(session: Session): Promise<string> {
    if (session.opencodeSessionId) return session.opencodeSessionId;

    const created = await this.request<{ id: string }>('/session', {
      method: 'POST',
      body: JSON.stringify({ title: session.name }),
    });
    session.opencodeSessionId = created.id;
    saveSession(session);
    return created.id;
  }

  async sendMessage(
    session: Session,
    userMessage: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
    const parsedModel = this.parseModel(model);

    const send = async (timeoutMs?: number) => {
      const sessionId = await this.ensureSession(session);
      const signal =
        timeoutMs && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(timeoutMs)
          : undefined;
      return this.request<OpenCodeMessageResponse>(
        `/session/${encodeURIComponent(sessionId)}/message`,
        {
          method: 'POST',
          signal,
          body: JSON.stringify({
            model: parsedModel,
            system: systemPrompt,
            tools: DISABLED_TOOLS,
            parts: [{ type: 'text', text: userMessage }],
          }),
        }
      );
    };

    const hadSession = Boolean(session.opencodeSessionId);
    let response: OpenCodeMessageResponse;
    try {
      response = await send(hadSession ? STALE_SESSION_TIMEOUT_MS : undefined);
    } catch (error) {
      if (!hadSession) throw error;
      // Sesión obsoleta: OpenCode reinició, recrear
      session.opencodeSessionId = undefined;
      saveSession(session);
      response = await send();
    }

    return this.extractText(response);
  }

  async listModels(): Promise<ModelInfo[]> {
    interface ProviderModel {
      id?: string;
      name?: string;
      description?: string;
      limit?: { context?: number };
    }
    interface Provider {
      id?: string;
      name?: string;
      models?: Record<string, ProviderModel>;
    }
    interface Resp {
      all?: Provider[];
      providers?: Provider[];
      connected?: string[];
    }

    const response = await this.request<Resp>('/provider');
    const providers = response.all || response.providers || [];
    const connected = response.connected?.length
      ? new Set(response.connected)
      : undefined;

    return providers.flatMap((provider) => {
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
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/provider');
      return true;
    } catch {
      return false;
    }
  }
}
