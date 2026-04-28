import { useState } from "react";
import { X, Save, Server } from "lucide-react";
import type { ClaudyConfig } from "../types";

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
  const [systemPrompt, setSystemPrompt] = useState(config?.agent.systemPrompt || "");
  const [temperature, setTemperature] = useState(config?.agent.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(config?.agent.maxTokens || 4096);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const body: Record<string, unknown> = {
      opencode: {
        baseUrl: opencodeBaseUrl.trim(),
        defaultModel: opencodeModel.trim(),
        username: opencodeUsername.trim() || "opencode",
        ...(opencodePassword ? { password: opencodePassword } : {}),
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
