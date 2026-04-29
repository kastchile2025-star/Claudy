import { sendMessageToOpenCode, listModels } from "./opencode";
import { getSession, addMessage } from "./sessions/store";
import { buildSkillsContext } from "./skills";
import { buildMemoryContext, rememberMessage } from "./memory";
import { runLocalToolCommand, toolsSystemContext } from "./toolrunner";
import type { Message, Session } from "./sessions/types";

const MAX_TOOL_ITERATIONS = 3;
const TOOL_INTENT_RE = /^\s*\/(browse|read|exec)\s+(\S.*)$/im;

async function expandToolIntents(
  session: Session,
  initialContent: string,
  model: string,
  extraContext: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  let content = initialContent;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const match = content.match(TOOL_INTENT_RE);
    if (!match) break;

    const command = `/${match[1]} ${match[2].trim()}`;
    let toolOutput: string;
    try {
      const result = await runLocalToolCommand(command);
      toolOutput = result.handled
        ? result.content || ""
        : `La tool no se ejecuto: ${command}`;
    } catch (error) {
      toolOutput = `Error ejecutando ${command}: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }

    onChunk(`\n[tool ${command}]\n`);

    const followUp =
      `Acabo de ejecutar la tool por ti: \`${command}\`.\n` +
      `Resultado:\n\`\`\`\n${toolOutput}\n\`\`\`\n` +
      "Usa este resultado para responder al usuario. Si necesitas otra tool, escribela de nuevo en una linea propia (`/browse URL` o `/read ruta`). Si ya tienes lo que necesitas, responde directamente sin volver a llamar tools.";

    content = await sendMessageToOpenCode(session, followUp, model, extraContext);
  }

  return content;
}

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

    const initialResponse = await sendMessageToOpenCode(
      currentSession,
      userMessage,
      model,
      extraContext
    );

    const assistantContent = await expandToolIntents(
      currentSession,
      initialResponse,
      model,
      extraContext,
      onChunk
    );

    onChunk(assistantContent);

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
