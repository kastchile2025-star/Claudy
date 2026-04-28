import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';
import { loadConfig } from '../config.js';
import { OpenCodeClient } from '../opencode.js';
import {
  createSession,
  saveSession,
  loadSession,
  addMessage,
  listSessions,
} from '../utils.js';
import { Session } from '../types.js';

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
    console.log(chalk.gray('Comandos: /exit, /clear, /save, /model, /help'));
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

    const askQuestion = () => {
      rl.question(chalk.green('You: '), async (input) => {
        const userInput = input.trim();

        if (!userInput) {
          askQuestion();
          return;
        }

        if (userInput.startsWith('/')) {
          const handled = await handleCommand(userInput, session);
          if (handled === 'exit') {
            rl.close();
            return;
          }
          askQuestion();
          return;
        }

        addMessage(session, 'user', userInput);

        const spinner = ora({ text: 'Pensando...', color: 'cyan' }).start();

        try {
          const reply = await client.sendMessage(
            session,
            userInput,
            session.model,
            config.agent.systemPrompt
          );

          spinner.stop();

          addMessage(session, 'assistant', reply);
          saveSession(session);

          console.log(chalk.blue('Claudy: ') + reply + '\n');
        } catch (error: any) {
          spinner.fail(chalk.red('Error: ' + error.message));
        }

        askQuestion();
      });
    };

    askQuestion();

    rl.on('close', () => {
      saveSession(session);
      console.log(chalk.gray('\n👋 Sesión guardada. ¡Hasta luego!\n'));
      process.exit(0);
    });
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
  session: Session
): Promise<'exit' | 'handled'> {
  const [cmd, ...args] = command.split(' ');

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
        // Cambiar modelo invalida la sesión OpenCode
        session.opencodeSessionId = undefined;
        saveSession(session);
        console.log(chalk.green(`✓ Modelo cambiado a: ${session.model}`));
      } else {
        console.log(chalk.gray(`Modelo actual: ${session.model}`));
      }
      return 'handled';

    case '/history':
      console.log(chalk.gray(`\nMensajes: ${session.messages.length}`));
      console.log(chalk.gray(`OpenCode session: ${session.opencodeSessionId || '(no creada)'}\n`));
      return 'handled';

    case '/help':
      console.log(chalk.cyan('\nComandos disponibles:'));
      console.log(chalk.gray('  /exit       - Salir del chat'));
      console.log(chalk.gray('  /clear      - Limpiar pantalla'));
      console.log(chalk.gray('  /save       - Guardar sesión'));
      console.log(chalk.gray('  /model <m>  - Cambiar modelo'));
      console.log(chalk.gray('  /history    - Info de sesión'));
      console.log(chalk.gray('  /help       - Mostrar ayuda\n'));
      return 'handled';

    default:
      console.log(chalk.yellow(`Comando desconocido: ${cmd}. Usa /help`));
      return 'handled';
  }
}
