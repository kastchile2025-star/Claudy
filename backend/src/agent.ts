import { sendMessageToOpenCode, listModels } from "./opencode";
import { getSession, addMessage } from "./sessions/store";
import { buildSkillsContext } from "./skills";
import { buildMemoryContext, rememberMessage } from "./memory";
import { runLocalToolCommand, toolsSystemContext } from "./toolrunner";
import type { Message } from "./sessions/types";

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
  rememberMessage(sessionId, "user", userMessage);

  // Run LLM
  const currentSession = getSession(sessionId)!;

  try {
    const toolResult = await runLocalToolCommand(userMessage);
    if (toolResult.handled) {
      const content = toolResult.content || "";
      onChunk(content);
      const toolMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        timestamp: Date.now(),
      };
      addMessage(sessionId, toolMsg);
      return { success: true };
    }

    const extraContext = [
      buildSkillsContext(userMessage),
      buildMemoryContext(userMessage),
      toolsSystemContext(),
    ]
      .filter(Boolean)
      .join("\n\n");

    const assistantContent = await sendMessageToOpenCode(
      currentSession,
      userMessage,
      model,
      extraContext
    );

    onChunk(assistantContent);

    // Save final assistant message
    const finalAssistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantContent,
      timestamp: Date.now(),
    };
    addMessage(sessionId, finalAssistantMsg);
    rememberMessage(sessionId, "assistant", assistantContent);

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}

export { listModels };
