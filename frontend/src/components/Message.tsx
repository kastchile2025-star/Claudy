import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, Wrench } from "lucide-react";
import type { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-blue-600"
            : isTool
            ? "bg-gray-500"
            : "bg-gradient-to-br from-purple-500 to-blue-600"
        }`}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : isTool ? (
          <Wrench size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : isTool
            ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm border border-gray-200 dark:border-gray-700"
            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-sm shadow-sm"
        }`}
      >
        {isTool ? (
          <div className="font-mono text-xs">
            <div className="text-gray-400 mb-1">Tool result:</div>
            <pre className="whitespace-pre-wrap">{message.content}</pre>
          </div>
        ) : (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
