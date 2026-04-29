import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as readline from 'readline/promises';
import { loadConfig } from '../config.js';
import { OpenCodeClient } from '../opencode.js';
import { toolRead, toolWrite, toolExec } from '../tools.js';
import {
  findRelevantSkills,
  buildSkillsContext,
  listSkills,
  installSkillFromUrl,
  findSkillUrls,
  installBestSkillForQuery,
  parseSkillIntent,
  searchRemoteSkills,
} from '../skills.js';
import {
  createSession,
  saveSession,
  loadSession,
  addMessage,
  listSessions,
} from '../utils.js';
import { Session, Config } from '../types.js';

export const chatCommand = new Command('chat')
  .description('Iniciar sesión de chat interactivo')
  .option('-s, --session <id>', 'Continuar una sesión existente')
  .option('-m, --model <model>', 'Modelo a utilizar')
  .option('-n, --new', 'Crear nueva sesión sin preguntar')
  .action(async (options) => {
    const config = loadConfig();

    let session: Session;

    if (options.session) {
      const loaded = loadSession(options.session);
      if (!loaded) {
        console.log(chalk.red(`✗ Sesión "${options.session}" no encontrada.`));
        process.exit(1);
      }
      session = loaded;
      console.log(chalk.cyan(`\n📂 Continuando sesión: ${session.name}`));
    } else if (!options.new) {
      const existing = listSessions();
      if (existing.length > 0) {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: '¿Qué deseas hacer?',
            choices: [
              { name: 'Nueva sesión', value: 'new' },
              ...existing.slice(0, 10).map((s) => ({
                name: `Continuar: ${s.name} (${s.messages.length} mensajes)`,
                value: s.id,
              })),
            ],
          },
        ]);

        if (action === 'new') {
          session = await createNewSession(options.model || config.opencode.defaultModel);
        } else {
          session = loadSession(action)!;
          console.log(chalk.cyan(`\n📂 Continuando sesión: ${session.name}`));
        }
      } else {
        session = await createNewSession(options.model || config.opencode.defaultModel);
      }
    } else {
      session = await createNewSession(options.model || config.opencode.defaultModel);
    }

    const client = new OpenCodeClient(config.opencode);

    console.log(chalk.gray('\n─────────────────────────────────────────'));
    console.log(chalk.gray(`Modelo: ${session.model}`));
    console.log(chalk.gray(`Sesión: ${session.id.substring(0, 8)}...`));
    console.log(chalk.gray(`OpenCode: ${config.opencode.baseUrl}`));
    console.log(
      chalk.gray(
        `Tools: read=${config.tools.allowRead ? '✓' : '✗'} write=${
          config.tools.allowWrite ? '✓' : '✗'
        } exec=${config.tools.allowExec ? '✓' : '✗'}`
      )
    );
    const installedSkills = listSkills();
    if (installedSkills.length > 0) {
      console.log(
        chalk.gray(
          `Skills: ${installedSkills.map((s) => s.name).join(', ')}`
        )
      );
    }
    console.log(
      chalk.gray(
        'Comandos: /exit /clear /save /model /read /write /exec /skills /find-skill /install-skill /help'
      )
    );
    console.log(chalk.gray('─────────────────────────────────────────\n'));

    if (session.messages.length > 0) {
      session.messages.forEach((msg) => {
        if (msg.role === 'user') {
          console.log(chalk.green('You: ') + msg.content);
        } else {
          console.log(chalk.blue('Claudy: ') + msg.content + '\n');
        }
      });
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Ctrl+C limpio
    rl.on('SIGINT', () => {
      saveSession(session);
      console.log(chalk.gray('\n👋 Sesión guardada. ¡Hasta luego!\n'));
      rl.close();
      process.exit(0);
    });

    while (true) {
      let userInput: string;
      try {
        userInput = (await rl.question(chalk.green('You: '))).trim();
      } catch {
        // readline cerrado externamente
        break;
      }

      if (!userInput) continue;

      if (userInput.startsWith('/')) {
        if (userInput.startsWith('/find-skill ')) {
          const query = userInput.slice('/find-skill '.length).trim();
          await handleFindSkill(query, session);
          continue;
        }

        if (userInput.startsWith('/install-skill ')) {
          const query = userInput.slice('/install-skill '.length).trim();
          await handleInstallSkill(query, session);
          continue;
        }

        const result = await handleCommand(userInput, session, config);
        if (result === 'exit') break;
        continue;
      }

      const skillIntent = parseSkillIntent(userInput);
      if (skillIntent) {
        addMessage(session, 'user', userInput);
        if (skillIntent.action === 'install') {
          await handleInstallSkill(skillIntent.query, session);
        } else {
          await handleFindSkill(skillIntent.query, session);
        }
        continue;
      }

      addMessage(session, 'user', userInput);
      process.stdout.write(chalk.cyan('Pensando...'));

      try {
        const relevantSkills = findRelevantSkills(userInput, 2);
        const systemPrompt =
          config.agent.systemPrompt + buildSkillsContext(relevantSkills);

        const reply = await client.sendMessage(
          session,
          userInput,
          session.model,
          systemPrompt
        );

        // Borra "Pensando..."
        process.stdout.write('\r' + ' '.repeat(20) + '\r');

        addMessage(session, 'assistant', reply);
        saveSession(session);

        console.log(chalk.blue('Claudy: ') + reply + '\n');

        // Auto-detectar URLs SKILL.md en la respuesta y ofrecer instalarlas
        const urls = findSkillUrls(reply);
        for (const url of urls) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `🔌 Detecté un skill: ${url}\n  ¿Instalar?`,
              default: true,
            },
          ]);
          if (confirm) {
            try {
              const installed = await installSkillFromUrl(url);
              console.log(
                chalk.green(`✓ Skill "${installed.name}" instalado en ${installed.path}\n`)
              );
            } catch (err: any) {
              console.log(chalk.red(`✗ Error instalando: ${err.message}\n`));
            }
          }
        }
      } catch (error: any) {
        process.stdout.write('\r' + ' '.repeat(20) + '\r');
        console.log(chalk.red('✗ Error: ' + error.message) + '\n');
      }
    }

    saveSession(session);
    rl.close();
    console.log(chalk.gray('\n👋 Sesión guardada. ¡Hasta luego!\n'));
  });

async function createNewSession(model: string): Promise<Session> {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Nombre de la sesión (Enter para auto):',
      default: `Chat ${new Date().toLocaleString()}`,
    },
  ]);
  return createSession(name, model);
}

async function handleCommand(
  command: string,
  session: Session,
  config: Config
): Promise<'exit' | 'handled'> {
  const [cmd, ...args] = command.split(' ');
  const rest = args.join(' ');

  switch (cmd) {
    case '/exit':
    case '/quit':
      return 'exit';

    case '/clear':
      console.clear();
      return 'handled';

    case '/save':
      saveSession(session);
      console.log(chalk.green('✓ Sesión guardada'));
      return 'handled';

    case '/model':
      if (args.length > 0) {
        session.model = args.join(' ');
        session.opencodeSessionId = undefined;
        saveSession(session);
        console.log(chalk.green(`✓ Modelo cambiado a: ${session.model}`));
      } else {
        console.log(chalk.gray(`Modelo actual: ${session.model}`));
      }
      return 'handled';

    case '/read': {
      if (!rest) {
        console.log(chalk.yellow('Uso: /read <ruta>'));
        return 'handled';
      }
      const result = await toolRead(rest, config.tools);
      if (result.ok) {
        console.log(chalk.cyan(`\n📄 ${rest}:`));
        console.log(chalk.gray(result.output));
        console.log('');
        // Inyectar como mensaje "user" para que Claudy lo vea en el siguiente turno
        addMessage(
          session,
          'user',
          `[Tool /read ${rest}]\n\`\`\`\n${result.output}\n\`\`\``
        );
        saveSession(session);
      } else {
        console.log(chalk.red(`✗ ${result.error}`));
      }
      return 'handled';
    }

    case '/write': {
      // Sintaxis: /write <ruta>\n<contenido>
      const newlineIdx = rest.indexOf('\n');
      const filePath = newlineIdx >= 0 ? rest.slice(0, newlineIdx).trim() : rest.trim();
      const content = newlineIdx >= 0 ? rest.slice(newlineIdx + 1) : '';

      if (!filePath) {
        console.log(chalk.yellow('Uso: /write <ruta>\\n<contenido>'));
        return 'handled';
      }
      if (!content) {
        console.log(chalk.yellow('Sin contenido. Pasa el contenido tras un salto de línea.'));
        return 'handled';
      }
      const result = await toolWrite(filePath, content, config.tools);
      if (result.ok) {
        console.log(chalk.green(`✓ ${result.output}`));
        addMessage(session, 'user', `[Tool /write ${filePath}] ${result.output}`);
        saveSession(session);
      } else {
        console.log(chalk.red(`✗ ${result.error}`));
      }
      return 'handled';
    }

    case '/exec': {
      if (!rest) {
        console.log(chalk.yellow('Uso: /exec <comando>'));
        return 'handled';
      }
      const result = await toolExec(rest, config.tools);
      if (result.ok) {
        console.log(chalk.cyan(`\n▶ ${rest}`));
        console.log(chalk.gray(result.output));
        console.log('');
        addMessage(
          session,
          'user',
          `[Tool /exec ${rest}]\n\`\`\`\n${result.output}\n\`\`\``
        );
        saveSession(session);
      } else {
        console.log(chalk.red(`✗ ${result.error}`));
        if (result.output) console.log(chalk.gray(result.output));
      }
      return 'handled';
    }

    case '/skills': {
      const skills = listSkills();
      if (skills.length === 0) {
        console.log(chalk.gray('\nNo hay skills instalados.'));
        console.log(chalk.gray('Instala con: claudy skills install <url>\n'));
      } else {
        console.log(chalk.cyan(`\n📚 Skills (${skills.length}):`));
        skills.forEach((s) => console.log(chalk.gray(`  • ${s.name} — ${s.description}`)));
        console.log('');
      }
      return 'handled';
    }

    case '/tools':
      console.log(chalk.cyan('\nEstado de tools:'));
      console.log(`  enabled:    ${tick(config.tools.enabled)}`);
      console.log(`  read:       ${tick(config.tools.allowRead)}`);
      console.log(`  write:      ${tick(config.tools.allowWrite)}`);
      console.log(`  exec:       ${tick(config.tools.allowExec)}`);
      console.log(`  root:       ${chalk.gray(config.tools.allowedRoot)}`);
      console.log(`  timeout:    ${chalk.gray(config.tools.commandTimeoutMs + 'ms')}`);
      console.log(chalk.gray('\nCambia con: claudy config set tools.allowWrite true\n'));
      return 'handled';

    case '/history':
      console.log(chalk.gray(`\nMensajes: ${session.messages.length}`));
      console.log(chalk.gray(`OpenCode session: ${session.opencodeSessionId || '(no creada)'}\n`));
      return 'handled';

    case '/help':
      console.log(chalk.cyan('\nComandos disponibles:'));
      console.log(chalk.gray('  /exit                       - Salir'));
      console.log(chalk.gray('  /clear                      - Limpiar pantalla'));
      console.log(chalk.gray('  /save                       - Guardar sesión'));
      console.log(chalk.gray('  /model <m>                  - Cambiar modelo'));
      console.log(chalk.gray('  /read <ruta>                - Leer archivo (lo añade al contexto)'));
      console.log(chalk.gray('  /write <ruta>\\n<contenido>  - Escribir archivo'));
      console.log(chalk.gray('  /exec <comando>             - Ejecutar shell command'));
      console.log(chalk.gray('  /find-skill <tema>          - Buscar skills en internet'));
      console.log(chalk.gray('  /install-skill <tema>       - Instalar el mejor skill encontrado'));
      console.log(chalk.gray('  /tools                      - Ver estado de tools'));
      console.log(chalk.gray('  /history                    - Info de sesión'));
      console.log(chalk.gray('  /help                       - Esta ayuda\n'));
      return 'handled';

    default:
      console.log(chalk.yellow(`Comando desconocido: ${cmd}. Usa /help`));
      return 'handled';
  }
}

function tick(value: boolean): string {
  return value ? chalk.green('✓') : chalk.red('✗');
}

async function handleFindSkill(query: string, session: Session): Promise<void> {
  if (!query.trim()) {
    return;
  }

  process.stdout.write(chalk.cyan('Buscando skills...'));

  try {
    const skills = await searchRemoteSkills(query, 5);
    process.stdout.write('\r' + ' '.repeat(24) + '\r');

    if (skills.length === 0) {
      const message = `No encontre skills en internet para "${query}".`;
      console.log(chalk.blue('Claudy: ') + message + '\n');
      addMessage(session, 'assistant', message);
      saveSession(session);
      return;
    }

    const message = [
      `Encontre estos skills en internet para "${query}":`,
      ...skills.map(
        (skill, index) =>
          `${index + 1}. ${skill.name} (${skill.source}/${skill.skillId}) - ${
            skill.installs || 0
          } installs`
      ),
      '',
      `Para instalar el mejor resultado: /install-skill ${query}`,
    ].join('\n');

    console.log(chalk.blue('Claudy: ') + message + '\n');
    addMessage(session, 'assistant', message);
    saveSession(session);
  } catch (error: any) {
    process.stdout.write('\r' + ' '.repeat(24) + '\r');
    const message = `No pude buscar skills: ${error.message || String(error)}`;
    console.log(chalk.red('Error: ') + message + '\n');
    addMessage(session, 'assistant', message);
    saveSession(session);
  }
}

async function handleInstallSkill(query: string, session: Session): Promise<void> {
  if (!query.trim()) {
    return;
  }

  process.stdout.write(chalk.cyan('Buscando e instalando skill...'));

  try {
    const result = await installBestSkillForQuery(query);
    process.stdout.write('\r' + ' '.repeat(36) + '\r');

    const alternatives = result.candidates
      .filter((candidate) => candidate.id !== result.remote.id)
      .slice(0, 3)
      .map(
        (candidate) =>
          `- ${candidate.name} (${candidate.source}/${candidate.skillId}, ${
            candidate.installs || 0
          } installs)`
      );

    const message = [
      `Skill instalado: ${result.installed.name}`,
      `Fuente: ${result.remote.source}/${result.remote.skillId}`,
      `Installs reportados: ${result.remote.installs || 0}`,
      `Archivo: ${result.installed.path}`,
      `README actualizado: ${result.installed.readmePath}`,
      '',
      'Ya queda disponible para futuras respuestas de Claudy cuando el mensaje sea relevante.',
      alternatives.length ? '\nOtros candidatos considerados:\n' + alternatives.join('\n') : '',
    ]
      .filter(Boolean)
      .join('\n');

    console.log(chalk.blue('Claudy: ') + message + '\n');
    addMessage(session, 'assistant', message);
    saveSession(session);
  } catch (error: any) {
    process.stdout.write('\r' + ' '.repeat(36) + '\r');
    const message = `No pude instalar la skill: ${error.message || String(error)}`;
    console.log(chalk.red('Error: ') + message + '\n');
    addMessage(session, 'assistant', message);
    saveSession(session);
  }
}
