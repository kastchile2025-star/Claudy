import { exec } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { getConfig } from "./config";
import {
  installBestSkillForQuery,
  installSkillFromUrl,
  listSkills,
  parseSkillIntent,
  searchRemoteSkills,
  searchSkills,
} from "./skills";

const execAsync = promisify(exec);

interface ToolResult {
  handled: boolean;
  content?: string;
}

function clampOutput(text: string): string {
  const max = getConfig().tools.maxOutputChars;
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[Salida truncada a ${max} caracteres]`;
}

function ensureToolsEnabled(feature: keyof ReturnType<typeof getConfig>["tools"]) {
  const config = getConfig().tools;
  if (!config.enabled) throw new Error("Tools desactivados en configuracion.");
  if (!config[feature]) throw new Error(`Tool no habilitado: ${feature}.`);
}

function safePath(inputPath: string): string {
  const root = resolve(getConfig().tools.allowedRoot);
  const target = resolve(root, inputPath);
  const normalizedRoot = root.toLowerCase();
  const normalizedTarget = target.toLowerCase();

  if (
    normalizedTarget !== normalizedRoot &&
    !normalizedTarget.startsWith(`${normalizedRoot}\\`) &&
    !normalizedTarget.startsWith(`${normalizedRoot}/`)
  ) {
    throw new Error(`Ruta fuera del directorio permitido: ${root}`);
  }

  return target;
}

async function readTool(args: string): Promise<string> {
  ensureToolsEnabled("allowRead");
  const file = safePath(args.trim());
  if (!existsSync(file)) throw new Error("El archivo no existe.");
  if (!statSync(file).isFile()) throw new Error("La ruta no apunta a un archivo.");
  return `Contenido de ${file}:\n\n${clampOutput(readFileSync(file, "utf-8"))}`;
}

async function writeTool(args: string): Promise<string> {
  ensureToolsEnabled("allowWrite");
  const [pathLine, ...contentLines] = args.split(/\r?\n/);
  const relativePath = pathLine.trim();
  const content = contentLines.join("\n");

  if (!relativePath || contentLines.length === 0) {
    throw new Error("Uso: /write ruta/archivo.txt\\ncontenido");
  }

  const file = safePath(relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return `Archivo escrito: ${file}`;
}

async function execTool(command: string): Promise<string> {
  ensureToolsEnabled("allowExec");
  const trimmed = command.trim();
  if (!trimmed) throw new Error("Uso: /exec comando");

  const { stdout, stderr } = await execAsync(trimmed, {
    cwd: resolve(getConfig().tools.allowedRoot),
    timeout: getConfig().tools.commandTimeoutMs,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });

  return clampOutput(
    [
      `Comando: ${trimmed}`,
      stdout ? `stdout:\n${stdout}` : "",
      stderr ? `stderr:\n${stderr}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

async function browseTool(args: string): Promise<string> {
  ensureToolsEnabled("allowBrowser");
  const url = new URL(args.trim());
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Solo se permiten URLs http/https.");
  }

  const response = await fetch(url, {
    headers: { "User-Agent": "Claudy/0.1" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim() || url.toString();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return clampOutput(`URL: ${url.toString()}\nTitulo: ${title}\n\n${text}`);
}

function formatSkills() {
  const skills = listSkills();
  if (skills.length === 0) return "No hay skills instalados.";
  return skills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");
}

function formatSkillSearch(query: string) {
  const skills = searchSkills(query).map(({ content: _content, ...skill }) => skill);
  if (skills.length === 0) return "No encontre skills para esa busqueda.";
  return skills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");
}

async function formatRemoteSkillSearch(query: string) {
  const skills = await searchRemoteSkills(query, 5);
  if (skills.length === 0) return `No encontre skills en internet para "${query}".`;

  return [
    `Encontre estos skills en internet para "${query}":`,
    ...skills.map(
      (skill, index) =>
        `${index + 1}. ${skill.name} (${skill.source}/${skill.skillId}) - ${
          skill.installs || 0
        } installs`
    ),
    "",
    "Para instalar automaticamente el mejor resultado, escribe: /skill_install_best " + query,
  ].join("\n");
}

async function installBestSkill(query: string) {
  const result = await installBestSkillForQuery(query);
  const alternatives = result.candidates
    .filter((candidate) => candidate.id !== result.remote.id)
    .slice(0, 3)
    .map(
      (candidate) =>
        `- ${candidate.name} (${candidate.source}/${candidate.skillId}, ${
          candidate.installs || 0
        } installs)`
    );

  return [
    `Skill instalado: ${result.skill.name}`,
    `Descripcion: ${result.skill.description}`,
    `Fuente: ${result.remote.source}/${result.remote.skillId}`,
    `Installs reportados: ${result.remote.installs || 0}`,
    `README actualizado: ${result.readmePath}`,
    "",
    "Ya queda disponible para futuras respuestas de Claudy cuando el mensaje sea relevante.",
    alternatives.length ? "\nOtros candidatos considerados:\n" + alternatives.join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runLocalToolCommand(message: string): Promise<ToolResult> {
  const match = message.match(/^\/([a-z_]+)(?:\s+([\s\S]*))?$/i);
  if (!match) {
    const intent = parseSkillIntent(message);
    if (!intent) return { handled: false };

    try {
      const content =
        intent.action === "install"
          ? await installBestSkill(intent.query)
          : await formatRemoteSkillSearch(intent.query);
      return { handled: true, content };
    } catch (error) {
      return {
        handled: true,
        content: `No pude completar la busqueda/instalacion de skill: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  const command = match[1].toLowerCase();
  const args = match[2] || "";

  try {
    if (command === "read") return { handled: true, content: await readTool(args) };
    if (command === "write") return { handled: true, content: await writeTool(args) };
    if (command === "exec") return { handled: true, content: await execTool(args) };
    if (command === "browse" || command === "browser") {
      return { handled: true, content: await browseTool(args) };
    }
    if (command === "skills") return { handled: true, content: formatSkills() };
    if (command === "skill_search") return { handled: true, content: formatSkillSearch(args) };
    if (command === "skill_find") {
      return { handled: true, content: await formatRemoteSkillSearch(args.trim()) };
    }
    if (command === "skill_install_best") {
      return { handled: true, content: await installBestSkill(args.trim()) };
    }
    if (command === "skill_install") {
      const skill = await installSkillFromUrl(args.trim());
      return { handled: true, content: `Skill instalado: ${skill.name}\n${skill.description}` };
    }
  } catch (error) {
    return {
      handled: true,
      content: `Error ejecutando /${command}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  return { handled: false };
}

export function toolsSystemContext(): string {
  const config = getConfig().tools;
  if (!config.enabled) return "";

  return [
    "Tools locales disponibles solo si el usuario los invoca explicitamente con comandos slash:",
    config.allowRead ? "- /read ruta: lee un archivo dentro del directorio permitido." : "",
    config.allowWrite ? "- /write ruta\\ncontenido: escribe un archivo dentro del directorio permitido." : "",
    config.allowExec ? "- /exec comando: ejecuta un comando en el directorio permitido." : "",
    config.allowBrowser ? "- /browse URL: obtiene texto de una pagina web." : "",
    "- /skills: lista skills instalados.",
    "- /skill_search consulta: busca skills instalados.",
    "- /skill_find consulta: busca skills en internet usando skills.sh.",
    "- /skill_install_best consulta: instala el mejor SKILL.md encontrado en internet y actualiza el README local.",
    "- /skill_install URL: instala un SKILL.md desde URL.",
    'Si el usuario pide en lenguaje natural "instala una skill para X", puedes hacerlo mediante el instalador de skills.',
    `Directorio permitido: ${config.allowedRoot}`,
  ]
    .filter(Boolean)
    .join("\n");
}
