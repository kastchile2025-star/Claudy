import { useEffect, useState } from "react";
import { BookOpen, Brain, MessageCircle, Save, Search, Server, Terminal, X } from "lucide-react";
import type { ClaudyConfig, MemoryStats, SkillInfo } from "../types";

interface SettingsProps {
  config: ClaudyConfig | null;
  onClose: () => void;
}

export function Settings({ config, onClose }: SettingsProps) {
  const [opencodeBaseUrl, setOpencodeBaseUrl] = useState(
    config?.opencode.baseUrl || "http://127.0.0.1:4096"
  );
  const [opencodeModel, setOpencodeModel] = useState(
    config?.opencode.defaultModel || "anthropic/claude-sonnet-4"
  );
  const [opencodeUsername, setOpencodeUsername] = useState(
    config?.opencode.username || "opencode"
  );
  const [opencodePassword, setOpencodePassword] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(config?.telegram.enabled || false);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramAllowedChatIds, setTelegramAllowedChatIds] = useState(
    config?.telegram.allowedChatIds?.join(", ") || ""
  );
  const [skillsEnabled, setSkillsEnabled] = useState(config?.skills.enabled ?? true);
  const [maxContextSkills, setMaxContextSkills] = useState(
    config?.skills.maxContextSkills || 3
  );
  const [memoryEnabled, setMemoryEnabled] = useState(config?.memory.enabled ?? true);
  const [memoryMaxResults, setMemoryMaxResults] = useState(config?.memory.maxResults || 5);
  const [memoryMaxEntries, setMemoryMaxEntries] = useState(config?.memory.maxEntries || 500);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [toolsEnabled, setToolsEnabled] = useState(config?.tools.enabled ?? true);
  const [toolRead, setToolRead] = useState(config?.tools.allowRead ?? true);
  const [toolBrowser, setToolBrowser] = useState(config?.tools.allowBrowser ?? true);
  const [toolWrite, setToolWrite] = useState(config?.tools.allowWrite ?? false);
  const [toolExec, setToolExec] = useState(config?.tools.allowExec ?? false);
  const [toolsRoot, setToolsRoot] = useState(config?.tools.allowedRoot || "");
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [skillUrl, setSkillUrl] = useState("");
  const [skillStatus, setSkillStatus] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(config?.agent.systemPrompt || "");
  const [temperature, setTemperature] = useState(config?.agent.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(config?.agent.maxTokens || 4096);
  const [saved, setSaved] = useState(false);

  const loadSkills = async () => {
    const res = await fetch("/api/skills");
    const data = await res.json();
    setSkills(Array.isArray(data) ? data : []);
  };

  const loadMemoryStats = async () => {
    const res = await fetch("/api/memory");
    const data = await res.json();
    setMemoryStats(data);
  };

  useEffect(() => {
    loadSkills();
    loadMemoryStats();
  }, []);

  const handleSearchSkills = async () => {
    const query = skillQuery.trim();
    if (!query) {
      await loadSkills();
      return;
    }

    const res = await fetch(`/api/skills/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setSkills(Array.isArray(data) ? data : []);
  };

  const handleInstallSkill = async () => {
    const url = skillUrl.trim();
    if (!url) return;

    setSkillStatus("Instalando skill...");
    const res = await fetch("/api/skills/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSkillStatus(data.error || "No se pudo instalar el skill");
      return;
    }

    setSkillUrl("");
    setSkillStatus(`Skill instalado: ${data.name}`);
    await loadSkills();
  };

  const handleSave = async () => {
    const body: Record<string, unknown> = {
      opencode: {
        baseUrl: opencodeBaseUrl.trim(),
        defaultModel: opencodeModel.trim(),
        username: opencodeUsername.trim() || "opencode",
        ...(opencodePassword ? { password: opencodePassword } : {}),
      },
      telegram: {
        enabled: telegramEnabled,
        allowedChatIds: telegramAllowedChatIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
          .map(Number)
          .filter(Number.isFinite),
        ...(telegramToken ? { botToken: telegramToken } : {}),
      },
      skills: {
        enabled: skillsEnabled,
        maxContextSkills,
      },
      memory: {
        enabled: memoryEnabled,
        maxResults: memoryMaxResults,
        maxEntries: memoryMaxEntries,
      },
      tools: {
        enabled: toolsEnabled,
        allowRead: toolRead,
        allowBrowser: toolBrowser,
        allowWrite: toolWrite,
        allowExec: toolExec,
        ...(toolsRoot.trim() ? { allowedRoot: toolsRoot.trim() } : {}),
      },
      agent: {
        systemPrompt,
        temperature,
        maxTokens,
      },
    };

    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Configuracion</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* OpenCode */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Server size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold">OpenCode Server</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  URL del servidor
                </label>
                <input
                  value={opencodeBaseUrl}
                  onChange={(e) => setOpencodeBaseUrl(e.target.value)}
                  placeholder="http://127.0.0.1:4096"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Modelo por defecto
                </label>
                <input
                  value={opencodeModel}
                  onChange={(e) => setOpencodeModel(e.target.value)}
                  placeholder="anthropic/claude-sonnet-4"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Usuario HTTP Basic
                  </label>
                  <input
                    value={opencodeUsername}
                    onChange={(e) => setOpencodeUsername(e.target.value)}
                    placeholder="opencode"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password HTTP Basic
                  </label>
                  <input
                    type="password"
                    value={opencodePassword}
                    onChange={(e) => setOpencodePassword(e.target.value)}
                    placeholder={config?.opencode.passwordConfigured ? "Ya configurado" : "Opcional"}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Inicia OpenCode aparte con: opencode serve --port 4096 --hostname 127.0.0.1
            </p>
          </div>

          {/* Telegram */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold">Telegram</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Activar bot de Telegram</span>
              </label>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Bot token
                </label>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder={config?.telegram.tokenConfigured ? "Ya configurado" : "123456:ABC..."}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Chat IDs permitidos
                </label>
                <input
                  value={telegramAllowedChatIds}
                  onChange={(e) => setTelegramAllowedChatIds(e.target.value)}
                  placeholder="Opcional, separados por coma"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Si lo dejas vacio, Claudy respondera a cualquier usuario que escriba al bot.
                </p>
              </div>
            </div>
          </div>

          {/* Tools */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold">Tools</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={toolsEnabled}
                  onChange={(e) => setToolsEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Activar comandos slash locales</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Lectura /read", toolRead, setToolRead],
                  ["Navegacion /browse", toolBrowser, setToolBrowser],
                  ["Escritura /write", toolWrite, setToolWrite],
                  ["Ejecucion /exec", toolExec, setToolExec],
                ].map(([label, value, setter]) => (
                  <label key={String(label)} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => (setter as (value: boolean) => void)(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{String(label)}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Directorio permitido
                </label>
                <input
                  value={toolsRoot}
                  onChange={(e) => setToolsRoot(e.target.value)}
                  placeholder="Directorio raiz para read/write/exec"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Usa comandos como /read README.md, /browse https://example.com o /skills.
                  /write y /exec quedan apagados por defecto porque modifican tu maquina.
                </p>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold">Memoria vectorial</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={memoryEnabled}
                  onChange={(e) => setMemoryEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  Recuperar recuerdos relevantes en cada respuesta
                </span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Recuerdos por respuesta
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={memoryMaxResults}
                    onChange={(e) => setMemoryMaxResults(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Max recuerdos guardados
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={5000}
                    value={memoryMaxEntries}
                    onChange={(e) => setMemoryMaxEntries(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Recuerdos locales indexados: {memoryStats?.entries ?? 0}. Se guardan en ~/.claudy/memory.json.
              </p>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold">Skills</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={skillsEnabled}
                  onChange={(e) => setSkillsEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  Usar skills relevantes como contexto del agente
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max skills por respuesta
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={maxContextSkills}
                  onChange={(e) => setMaxContextSkills(Number(e.target.value))}
                  className="w-32 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <input
                  value={skillQuery}
                  onChange={(e) => setSkillQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchSkills();
                  }}
                  placeholder="Buscar skills instalados..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearchSkills}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 flex items-center gap-2"
                >
                  <Search size={16} />
                  Buscar
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  value={skillUrl}
                  onChange={(e) => setSkillUrl(e.target.value)}
                  placeholder="URL a SKILL.md, por ejemplo GitHub blob/raw"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleInstallSkill}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Instalar
                </button>
              </div>

              {skillStatus && (
                <p className="text-sm text-gray-500">{skillStatus}</p>
              )}

              <div className="space-y-2">
                {skills.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay skills instalados.</p>
                ) : (
                  skills.map((skill) => (
                    <div
                      key={`${skill.source}-${skill.name}`}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{skill.name}</div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
                          {skill.source}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Agent Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4">Agente</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  System Prompt
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            <Save size={18} />
            {saved ? "Guardado!" : "Guardar configuracion"}
          </button>
        </div>
      </div>
    </div>
  );
}
