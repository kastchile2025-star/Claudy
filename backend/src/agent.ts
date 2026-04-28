import { streamChat, listModels } from "./openrouter";
import { webSearch } from "./tools/search";
import { getSession, addMessage, saveSession } from "./sessions/store";
import type { Message, ToolCall } from "./sessions/types";

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Busca informacion actual en la web usando DuckDuckGo",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "La consulta de busqueda en espanol o ingles",
          },
        },
        required: ["query"],
      },
    },
  },
];

export async function runAgent(
  sessionId: string,
  userMessage: string,
  model: string,
  onChunk: (chunk: string) => void
): Promise<{ success: boolean; error?: string }> {
  const session = getSession(sessionId);
  if (!session) {
    return { success: false, error: "Session not found" };
  }

  // Add user message
  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: "user",
    content: userMessage,
    timestamp: Date.now(),
  };
  addMessage(sessionId, userMsg);

  // Run LLM
  const currentSession = getSession(sessionId)!;
  let assistantContent = "";
  let toolCalls: ToolCall[] | undefined;

  try {
    const stream = streamChat(currentSession.messages, model, TOOLS);
    let result = await stream.next();

    while (!result.done) {
      const chunk = result.value;
      assistantContent += chunk;
      onChunk(chunk);
      result = await stream.next();
    }

    const final = result.value;
    toolCalls = final?.toolCalls;

    // If tool calls, execute them and re-run
    if (toolCalls && toolCalls.length > 0) {
      // Save assistant message with tool calls
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent || "",
        timestamp: Date.now(),
        toolCalls,
      };
      addMessage(sessionId, assistantMsg);

      // Execute tools
      for (const tc of toolCalls) {
        let toolResult = "";
        if (tc.function.name === "web_search") {
          try {
            const args = JSON.parse(tc.function.arguments);
            toolResult = await webSearch(args.query);
          } catch (e) {
            toolResult = `Error: ${e instanceof Error ? e.message : String(e)}`;
          }
        } else {
          toolResult = `Tool ${tc.function.name} no implementado`;
        }

        const toolMsg: Message = {
          id: crypto.randomUUID(),
          role: "tool",
          content: toolResult,
          timestamp: Date.now(),
          toolResult: tc.id,
        };
        addMessage(sessionId, toolMsg);
      }

      // Re-run LLM with tool results
      const updatedSession = getSession(sessionId)!;
      assistantContent = "";
      const stream2 = streamChat(updatedSession.messages, model);
      let result2 = await stream2.next();

      while (!result2.done) {
        const chunk = result2.value;
        assistantContent += chunk;
        onChunk(chunk);
        result2 = await stream2.next();
      }
    }

    // Save final assistant message
    const finalAssistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantContent,
      timestamp: Date.now(),
    };
    addMessage(sessionId, finalAssistantMsg);

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}

export { listModels };
