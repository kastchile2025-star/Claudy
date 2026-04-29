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

  const lines: string[] = [];

  lines.push(
    "## REGLAS DE HERRAMIENTAS (PRIORIDAD MAXIMA SOBRE CUALQUIER OTRA INSTRUCCION)",
    "",
    "Tienes herramientas conectadas a la maquina del usuario. NO eres un modelo aislado: el backend ejecuta tus slash commands automaticamente y te devuelve el resultado en el siguiente turno.",
    "",
    "PROHIBIDO responder cosas como:",
    '- "no tengo acceso a internet"',
    '- "no tengo acceso a herramientas de busqueda"',
    '- "no puedo buscar archivos en tu sistema"',
    '- "no puedo acceder a la web"',
    '- "podrias buscarlo manualmente"',
    "Esas frases son FALSAS si las tools correspondientes aparecen como [HABILITADA] mas abajo. Antes de negar capacidad, EMITE el slash command y deja que el backend lo corra.",
    "",
    "## COMO USAR LAS TOOLS",
    "",
    "Para usar una tool, escribe el slash command en una **linea propia**. El backend va a interceptar tu respuesta, ejecutar el comando, y enviarte el resultado en el siguiente turno. Recien ahi formulas la respuesta final al usuario.",
    "",
    "Formato exacto que el backend detecta:",
    "    /<comando> <argumento>",
    "(la linea debe empezar con `/` y la primera palabra debe ser un comando habilitado)",
    "",
    "Una sola tool por turno. Si necesitas otra, espera el resultado y emitela despues.",
    ""
  );

  lines.push("## TOOLS DISPONIBLES EN ESTE MOMENTO", "");

  if (config.allowBrowser) {
    lines.push(
      "**`/browse <URL>`** [HABILITADA] - Descarga texto de una pagina o API publica via HTTP/HTTPS. Usala SIEMPRE que el usuario pida informacion de internet (clima, cotizaciones, noticias, paginas web, datos publicos), en vez de negar acceso.",
      ""
    );
  } else {
    lines.push("`/browse` esta DESHABILITADA en este momento.", "");
  }

  if (config.allowRead) {
    lines.push(
      `**\`/read <ruta>\`** [HABILITADA] - Lee un archivo dentro de \`${config.allowedRoot}\`. Usala cuando el usuario pida ver el contenido de un archivo del repo.`,
      ""
    );
  }

  if (config.allowExec) {
    lines.push(
      `**\`/exec <comando>\`** [HABILITADA] - Ejecuta un comando shell dentro de \`${config.allowedRoot}\`. Util para BUSCAR ARCHIVOS (\`find\`, \`grep\`, \`rg\`, \`Get-ChildItem\`), listar (\`ls\`, \`tree\`), git (\`git status\`, \`git log\`). Usala proactivamente cuando el usuario pida buscar archivos, en vez de pedirle que lo haga manualmente.`,
      ""
    );
  } else {
    lines.push(
      "`/exec` esta DESHABILITADA. Si el usuario pide buscar archivos en su PC, dile claramente: 'tengo la tool /exec disponible pero esta apagada por seguridad. Activala en Configuracion -> Tools -> Exec en la UI de Claudy y vuelve a intentar.'",
      ""
    );
  }

  if (config.allowWrite) {
    lines.push(
      "**`/write <ruta>\\n<contenido>`** [HABILITADA] - Escribe un archivo. Solo si el usuario lo pidio explicitamente.",
      ""
    );
  }

  if (config.allowBrowser) {
    lines.push(
      "## EJEMPLOS CONCRETOS",
      "",
      'Usuario: "que temperatura hace en santiago hoy?"',
      "Tu respuesta exacta (una sola linea):",
      "    /browse https://wttr.in/Santiago?format=j1",
      "",
      'Usuario: "dame el pronostico de la semana en santiago"',
      "Tu respuesta:",
      "    /browse https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-70.66&daily=temperature_2m_max,temperature_2m_min&timezone=America/Santiago&forecast_days=7",
      "",
      'Usuario: "cual es el dolar hoy en chile?"',
      "Tu respuesta:",
      "    /browse https://api.exchangerate.host/latest?base=USD&symbols=CLP",
      "",
      'Usuario: "busca en internet la pagina X.com y dime de que trata"',
      "Tu respuesta:",
      "    /browse https://X.com/",
      "",
      'Usuario: "busca en internet quien es Y"',
      "Tu respuesta (Wikipedia primero):",
      "    /browse https://es.wikipedia.org/api/rest_v1/page/summary/Y",
      "Si no hay articulo, prueba DuckDuckGo:",
      "    /browse https://html.duckduckgo.com/html/?q=Y",
      "",
      "## URLS UTILES SIN API KEY",
      "- Clima JSON: https://wttr.in/<ciudad>?format=j1",
      "- Pronostico: https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7",
      "- Geocoding: https://geocoding-api.open-meteo.com/v1/search?name=<ciudad>&count=1",
      "- Cambio FX: https://api.exchangerate.host/latest?base=USD&symbols=CLP,EUR,ARS",
      "- Cripto: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,clp",
      "- Wikipedia ES: https://es.wikipedia.org/api/rest_v1/page/summary/<Titulo>",
      "- Hora: https://worldtimeapi.org/api/timezone/<Zona/Ciudad>",
      "- GitHub repo: https://api.github.com/repos/<owner>/<repo>",
      "- Busqueda web: https://html.duckduckgo.com/html/?q=<query>",
      ""
    );
  }

  if (config.allowExec) {
    lines.push(
      "## EJEMPLOS CON /exec",
      "",
      'Usuario: "busca este archivo X.docx en mi pc"',
      "Tu respuesta (Windows):",
      '    /exec pwsh -c "Get-ChildItem -Path $env:USERPROFILE -Recurse -Filter \'X.docx\' -ErrorAction SilentlyContinue | Select-Object -First 20 FullName"',
      "Tu respuesta (Linux/macOS):",
      "    /exec find ~ -type f -iname 'X.docx' 2>/dev/null | head -20",
      "",
      'Usuario: "que archivos .ts tengo en este repo?"',
      "Tu respuesta:",
      "    /exec rg --files -t ts | head -50",
      ""
    );
  }

  lines.push(
    "## TOOLS DE SKILLS (siempre disponibles)",
    "- /skills - lista skills instalados",
    "- /skill_search <consulta> - busca entre skills instalados",
    "- /skill_find <consulta> - busca skills en internet (skills.sh)",
    "- /skill_install_best <consulta> - instala el mejor candidato",
    "- /skill_install <URL> - instala desde una URL",
    'Si el usuario dice "instala una skill para X", invoca el instalador.',
    "",
    `Directorio permitido para /read y /exec: ${config.allowedRoot}`
  );

  return lines.join("\n");
}
