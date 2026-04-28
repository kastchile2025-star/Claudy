import { Plus, Trash2, MessageSquare } from "lucide-react";
import type { Session } from "../types";

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onCreateSession: () => void;
}

export function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateSession,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full w-72">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onCreateSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Nueva conversacion
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              currentSessionId === session.id
                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <MessageSquare size={16} className="flex-shrink-0 text-gray-400" />
            <span className="flex-1 text-sm truncate">
              {session.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 rounded transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No hay conversaciones aun
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-400 text-center">
          Claudy v0.1.0 - Fork de OpenClaw
        </div>
      </div>
    </div>
  );
}
