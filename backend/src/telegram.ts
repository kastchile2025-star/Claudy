import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { getConfig } from "./config";
import { runAgent } from "./agent";
import { createSession, getSession } from "./sessions/store";

interface TelegramChat {
  id: number;
  type: string;
  username?: string;
  first_name?: string;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  voice?: TelegramAudioFile;
  audio?: TelegramAudioFile & { file_name?: string };
  document?: TelegramAudioFile & { file_name?: string };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface TelegramState {
  lastUpdateId?: number;
  chats: Record<string, string>;
}

const STATE_PATH = join(homedir(), ".claudy", "telegram-sessions.json");
const AUDIO_DIR = join(homedir(), ".claudy", "telegram-audio");
const TELEGRAM_LIMIT = 4096;
const ASR_TIMEOUT_MS = Number(process.env.CLAUDY_ASR_TIMEOUT_MS || 600_000);
const MAX_AUDIO_BYTES = Number(process.env.CLAUDY_TELEGRAM_AUDIO_MAX_BYTES || 25 * 1024 * 1024);
const FFMPEG_BIN = process.env.CLAUDY_FFMPEG || "ffmpeg";

const execFileAsync = promisify(execFile);

let pollingGeneration = 0;
let polling = false;

interface TelegramAudioFile {
  file_id: string;
  file_unique_id?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number;
}

interface TelegramGetFileResult {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

interface IncomingAudio {
  fileId: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

function loadState(): TelegramState {
  if (!existsSync(STATE_PATH)) {
    return { chats: {} };
  }

  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf-8")) as TelegramState;
  } catch {
    return { chats: {} };
  }
}

function saveState(state: TelegramState) {
  const dir = join(homedir(), ".claudy");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function apiUrl(method: string): string {
  const token = getConfig().telegram.botToken;
  return `https://api.telegram.org/bot${token}/${method}`;
}

function telegramFileUrl(filePath: string): string {
  const token = getConfig().telegram.botToken;
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

async function telegramRequest<T>(
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  const data = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram error ${response.status}`);
  }

  return data.result;
}

function isChatAllowed(chatId: number): boolean {
  const allowed = getConfig().telegram.allowedChatIds;
  return allowed.length === 0 || allowed.includes(chatId);
}

function isAudioDocument(document: TelegramMessage["document"]): boolean {
  if (!document) return false;
  if (document.mime_type?.startsWith("audio/")) return true;

  const extension = extname(document.file_name || "").toLowerCase();
  return [".oga", ".ogg", ".opus", ".mp3", ".m4a", ".wav", ".webm", ".flac"].includes(
    extension
  );
}

function getIncomingAudio(message: TelegramMessage): IncomingAudio | null {
  if (message.voice) {
    return {
      fileId: message.voice.file_id,
      mimeType: message.voice.mime_type,
      fileSize: message.voice.file_size,
    };
  }

  if (message.audio) {
    return {
      fileId: message.audio.file_id,
      fileName: message.audio.file_name,
      mimeType: message.audio.mime_type,
      fileSize: message.audio.file_size,
    };
  }

  const document = message.document;
  if (document && isAudioDocument(document)) {
    return {
      fileId: document.file_id,
      fileName: document.file_name,
      mimeType: document.mime_type,
      fileSize: document.file_size,
    };
  }

  return null;
}

function audioExtension(filePath: string | undefined, audio: IncomingAudio): string {
  const candidates = [audio.fileName, filePath].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const extension = extname(candidate).toLowerCase();
    if (extension && extension.length <= 8) return extension;
  }

  if (audio.mimeType === "audio/mpeg") return ".mp3";
  if (audio.mimeType === "audio/mp4") return ".m4a";
  if (audio.mimeType === "audio/wav" || audio.mimeType === "audio/x-wav") return ".wav";
  if (audio.mimeType === "audio/webm") return ".webm";
  if (audio.mimeType === "audio/flac") return ".flac";
  return ".oga";
}

async function downloadTelegramAudio(audio: IncomingAudio, chatId: number): Promise<string> {
  if (audio.fileSize && audio.fileSize > MAX_AUDIO_BYTES) {
    throw new Error(
      `El audio pesa ${(audio.fileSize / 1024 / 1024).toFixed(1)} MB; el limite actual es ${(
        MAX_AUDIO_BYTES /
        1024 /
        1024
      ).toFixed(0)} MB.`
    );
  }

  const file = await telegramRequest<TelegramGetFileResult>("getFile", {
    file_id: audio.fileId,
  });

  if (!file.file_path) {
    throw new Error("Telegram no devolvio la ruta del archivo de audio.");
  }

  const response = await fetch(telegramFileUrl(file.file_path));
  if (!response.ok) {
    throw new Error(`No pude descargar el audio desde Telegram (HTTP ${response.status}).`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_AUDIO_BYTES) {
    throw new Error(
      `El audio descargado pesa ${(bytes.length / 1024 / 1024).toFixed(
        1
      )} MB; el limite actual es ${(MAX_AUDIO_BYTES / 1024 / 1024).toFixed(0)} MB.`
    );
  }

  if (!existsSync(AUDIO_DIR)) {
    mkdirSync(AUDIO_DIR, { recursive: true });
  }

  const extension = audioExtension(file.file_path, audio);
  const localPath = join(AUDIO_DIR, `${chatId}-${crypto.randomUUID()}${extension}`);
  writeFileSync(localPath, bytes);
  return localPath;
}

function asrScriptPath(): string {
  return join(homedir(), ".claudy", "skills", "qwen-asr", "scripts", "main.py");
}

function outputToString(value: unknown): string {
  if (!value) return "";
  if (Buffer.isBuffer(value)) return value.toString("utf-8");
  return String(value);
}

function seconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

function needsAudioNormalization(filePath: string): boolean {
  return [".oga", ".ogg", ".opus", ".webm"].includes(extname(filePath).toLowerCase());
}

async function normalizeAudioForAsr(localPath: string): Promise<string> {
  if (!needsAudioNormalization(localPath)) return localPath;

  const targetPath = join(
    AUDIO_DIR,
    `${basename(localPath, extname(localPath))}-asr.wav`
  );

  try {
    await execFileAsync(
      FFMPEG_BIN,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        localPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        targetPath,
      ],
      {
        timeout: 60_000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      }
    );
    return targetPath;
  } catch (error) {
    console.warn(
      "[telegram] No pude normalizar audio con ffmpeg, usando original:",
      error instanceof Error ? error.message : error
    );
    return localPath;
  }
}

function extractJsonText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractJsonText(item);
      if (text) return text;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "transcript", "transcription", "result", "output"]) {
      const text = extractJsonText(record[key]);
      if (text) return text;
    }
  }
  return null;
}

function extractTranscription(rawOutput: string): string {
  const output = rawOutput.trim();
  if (!output) return "";

  try {
    const parsed = JSON.parse(output);
    const text = extractJsonText(parsed);
    if (text) return text;
  } catch {
    // The ASR script usually prints logs plus the final text, not pure JSON.
  }

  for (const line of output.split(/\r?\n/)) {
    try {
      const parsed = JSON.parse(line.trim());
      const text = extractJsonText(parsed);
      if (text) return text;
    } catch {
      // Keep scanning other lines.
    }
  }

  const labeled = output.match(
    /(?:transcription|transcript|texto|resultado|result|text)\s*[:：]\s*(.+)$/im
  );
  if (labeled?.[1]?.trim()) {
    return labeled[1].trim();
  }

  const usefulLines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^Audio file:/i.test(line))
    .filter((line) => !/^Loaded as API:/i.test(line))
    .filter((line) => !/^Running on/i.test(line))
    .filter((line) => !/^Use the public URL/i.test(line))
    .filter((line) => !/^Traceback /i.test(line))
    .filter((line) => !/^File "/.test(line));

  if (usefulLines.length === 1) {
    return usefulLines[0];
  }

  return "";
}

function compactAsrError(error: unknown, stdout: string, stderr: string): string {
  const execError = error as { killed?: boolean; signal?: string };
  const message =
    execError.killed || execError.signal === "SIGTERM"
      ? `La transcripcion tardo mas de ${seconds(
          ASR_TIMEOUT_MS
        )} segundos y fue cancelada. Puedes subir CLAUDY_ASR_TIMEOUT_MS si el audio es largo o la demo ASR esta lenta.`
      : error instanceof Error
      ? error.message
      : String(error);
  const raw = [stderr, stdout].filter(Boolean).join("\n").trim();
  const tail = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-8)
    .join("\n");

  if (!tail) return message;
  return `${message}\n\nDetalle ASR:\n${tail}`;
}

async function transcribeAudio(localPath: string): Promise<string> {
  const scriptPath = asrScriptPath();
  if (!existsSync(scriptPath)) {
    throw new Error(
      `No encontre la skill qwen-asr en ${scriptPath}. Instalala o corrige la ruta antes de enviar audios.`
    );
  }

  let stdout = "";
  let stderr = "";
  const inputPath = await normalizeAudioForAsr(localPath);

  try {
    const result = await execFileAsync(
      process.env.CLAUDY_PYTHON || "python",
      [scriptPath, "-f", inputPath],
      {
        timeout: ASR_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 5 * 1024 * 1024,
      }
    );
    stdout = outputToString(result.stdout);
    stderr = outputToString(result.stderr);
  } catch (error) {
    const err = error as { stdout?: unknown; stderr?: unknown };
    stdout = outputToString(err.stdout);
    stderr = outputToString(err.stderr);

    const rescued = extractTranscription([stdout, stderr].join("\n"));
    if (rescued) return rescued;

    throw new Error(compactAsrError(error, stdout, stderr));
  }

  const text = extractTranscription([stdout, stderr].join("\n"));
  if (!text) {
    throw new Error(
      "La skill qwen-asr termino, pero no devolvio una transcripcion legible. Revisa que el script imprima solo el texto o una linea tipo `transcription: ...`. Si ves solo `Audio file:` y `Loaded as API:`, normalmente la llamada al servicio ASR no alcanzo a devolver resultado."
    );
  }

  return text;
}

async function sendMessage(chatId: number, text: string, replyToMessageId?: number) {
  const safeText = text || "(Sin respuesta)";
  for (let start = 0; start < safeText.length; start += TELEGRAM_LIMIT) {
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: safeText.slice(start, start + TELEGRAM_LIMIT),
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    });
  }
}

async function sendTyping(chatId: number) {
  try {
    await telegramRequest("sendChatAction", {
      chat_id: chatId,
      action: "typing",
    });
  } catch {
    // Typing indicators are nice-to-have; message delivery still matters.
  }
}

function startTypingLoop(chatId: number): () => void {
  let stopped = false;

  void (async () => {
    while (!stopped) {
      await sendTyping(chatId);
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  })();

  return () => {
    stopped = true;
  };
}

function getOrCreateSession(chatId: number): string {
  const state = loadState();
  const chatKey = String(chatId);
  const existingSessionId = state.chats[chatKey];

  if (existingSessionId && getSession(existingSessionId)) {
    return existingSessionId;
  }

  const session = createSession(getConfig().opencode.defaultModel);
  state.chats[chatKey] = session.id;
  saveState(state);
  return session.id;
}

function resetSession(chatId: number): string {
  const state = loadState();
  const session = createSession(getConfig().opencode.defaultModel);
  state.chats[String(chatId)] = session.id;
  saveState(state);
  return session.id;
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;

  if (!isChatAllowed(chatId)) return;

  const audio = getIncomingAudio(message);
  if (audio) {
    const stopTyping = startTypingLoop(chatId);

    try {
      const localPath = await downloadTelegramAudio(audio, chatId);
      const transcript = await transcribeAudio(localPath);
      const sessionId = getOrCreateSession(chatId);
      const prompt = [
        "El usuario envio un audio por Telegram.",
        message.caption ? `Caption del usuario: ${message.caption.trim()}` : "",
        `Transcripcion del audio:\n${transcript}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const chunks: string[] = [];
      const result = await runAgent(
        sessionId,
        prompt,
        getConfig().opencode.defaultModel,
        (chunk: string) => chunks.push(chunk)
      );

      if (!result.success) {
        await sendMessage(
          chatId,
          `Transcribi tu audio, pero no pude responderlo: ${
            result.error || "error desconocido"
          }`,
          message.message_id
        );
        return;
      }

      await sendMessage(chatId, chunks.join(""), message.message_id);
    } catch (error) {
      await sendMessage(
        chatId,
        `Recibi tu audio, pero no pude transcribirlo.\n${
          error instanceof Error ? error.message : String(error)
        }`,
        message.message_id
      );
    } finally {
      stopTyping();
    }
    return;
  }

  const text = message.text?.trim();
  if (!text) return;

  if (text === "/start") {
    getOrCreateSession(chatId);
    await sendMessage(
      chatId,
      "Hola, soy Claudy. Escribeme cualquier mensaje y lo responderé usando el agente local.",
      message.message_id
    );
    return;
  }

  if (text === "/reset") {
    resetSession(chatId);
    await sendMessage(chatId, "Listo, cree una conversacion nueva.", message.message_id);
    return;
  }

  await sendTyping(chatId);
  const sessionId = getOrCreateSession(chatId);
  const chunks: string[] = [];
  const result = await runAgent(
    sessionId,
    text,
    getConfig().opencode.defaultModel,
    (chunk: string) => chunks.push(chunk)
  );

  if (!result.success) {
    await sendMessage(chatId, `Error: ${result.error || "No pude responder."}`, message.message_id);
    return;
  }

  await sendMessage(chatId, chunks.join(""), message.message_id);
}

async function pollTelegram(generation: number) {
  const state = loadState();
  let offset = state.lastUpdateId ? state.lastUpdateId + 1 : undefined;

  console.log("[telegram] Bot polling started");

  while (pollingGeneration === generation) {
    try {
      const updates = await telegramRequest<TelegramUpdate[]>("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        state.lastUpdateId = update.update_id;
        saveState(state);

        if (update.message) {
          await handleMessage(update.message);
        }
      }
    } catch (error) {
      console.error("[telegram]", error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log("[telegram] Bot polling stopped");
}

export function syncTelegramBot() {
  const config = getConfig().telegram;
  const shouldRun = config.enabled && Boolean(config.botToken);

  if (!shouldRun) {
    if (polling) {
      pollingGeneration += 1;
      polling = false;
      console.log("[telegram] Bot disabled");
    }
    return;
  }

  if (polling) return;

  polling = true;
  const generation = ++pollingGeneration;
  void pollTelegram(generation).finally(() => {
    if (pollingGeneration === generation) {
      polling = false;
    }
  });
}
