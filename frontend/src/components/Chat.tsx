import { Send, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./Message";

interface ChatProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onCreateSession: () => void;
}

export function Chat({ messages, isLoading, onSendMessage, onCreateSession }: ChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles size={32} className="text-white" />
            </div>
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">Bienvenido a Claudy</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Tu asistente de IA personal. Escribe un mensaje para comenzar, o selecciona un modelo desde el menu superior.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Explicame que es OpenClaw",
                  "Busca las ultimas noticias de IA",
                  "Ayudame a escribir un email",
                  "Resume este concepto para mi",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => onSendMessage(prompt)}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
              style={{ minHeight: "48px" }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
        <div className="max-w-3xl mx-auto mt-2 text-xs text-gray-400 text-center">
          Claudy puede cometer errores. Verifica la informacion importante.
        </div>
      </div>
    </div>
  );
}
