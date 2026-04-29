import { useState } from "react";
import { useChat } from "./hooks/useChat";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { Settings } from "./components/Settings";
import { Menu, Settings as SettingsIcon, X } from "lucide-react";

function App() {
  const chat = useChat();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "w-72" : "w-0"
        } flex-shrink-0 transition-all duration-300 overflow-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}
      >
        <Sidebar
          sessions={chat.sessions}
          currentSessionId={chat.currentSessionId}
          onSelectSession={chat.selectSession}
          onDeleteSession={chat.deleteSession}
          onCreateSession={chat.createSession}
          isLoading={!chat.sessionsLoaded}
          error={chat.connectionError}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {showSidebar ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Claudy
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={chat.currentModel}
              onChange={(e) => chat.changeModel(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {chat.models.slice(0, 50).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        {showSettings ? (
          <Settings config={chat.config} onClose={() => setShowSettings(false)} />
        ) : (
          <Chat
            messages={chat.messages}
            isLoading={chat.isLoading}
            onSendMessage={chat.sendMessage}
          />
        )}
      </div>
    </div>
  );
}

export default App;
