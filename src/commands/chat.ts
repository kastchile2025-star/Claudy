import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';
import { loadConfig } from '../config.js';
import { OpenRouterClient } from '../openrouter.js';
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

    if (!config.openrouter.apiKey) {
      console.log(chalk.red('✗ No tienes API key configurada.'));
      console.log(chalk.yellow('Ejecuta: claudy setup'));
      process.exit(1);
    }

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
          session = await createNewSession(options.model || config.openrouter.defaultModel);
        } else {
          session = loadSession(action)!;
          console.log(chalk.cyan(`\n📂 Continuando sesión: ${session.name}`));
        }
      } else {
        session = await createNewSession(options.model || config.openrouter.defaultModel);
      }
    } else {
      session = await createNewSession(options.model || config.openrouter.defaultModel);
    }

    const client = new OpenRouterClient(config.openrouter.apiKey);

    console.log(chalk.gray('\n─────────────────────────────────────────'));
    console.log(chalk.gray(`Modelo: ${session.model}`));
    console.log(chalk.gray(`Sesión: ${session.id.substring(0, 8)}...`));
    console.log(chalk.gray('Comandos: /exit, /clear, /save, /model, /help'));
    console.log(chalk.gray('─────────────────────────────────────────\n'));

    // Mostrar historial existente
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

        // Comandos especiales
        if (userInput.startsWith('/')) {
          const handled = await handleCommand(userInput, session, rl);
          if (handled === 'exit') {
            rl.close();
            return;
          }
          if (handled !== 'continue') {
            askQuestion();
            return;
          }
        }

        addMessage(session, 'user', userInput);

        const spinner = ora({ text: 'Pensando...', color: 'cyan' }).start();

        try {
          const messages = [
            { role: 'system', content: config.agent.systemPrompt },
            ...session.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ];

          const response = await client.chat({
            model: session.model,
            messages,
            max_tokens: config.agent.maxTokens,
            temperature: config.agent.temperature,
          });

          spinner.stop();

          const assistantMessage = response.choices[0].message.content;
          addMessage(session, 'assistant', assistantMessage);
          saveSession(session);

          console.log(chalk.blue('Claudy: ') + assistantMessage + '\n');
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
  session: Session,
  rl: readline.Interface
): Promise<'exit' | 'handled' | 'continue'> {
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
        saveSession(session);
        console.log(chalk.green(`✓ Modelo cambiado a: ${session.model}`));
      } else {
        console.log(chalk.gray(`Modelo actual: ${session.model}`));
      }
      return 'handled';

    case '/history':
      console.log(chalk.gray(`\nMensajes en esta sesión: ${session.messages.length}\n`));
      return 'handled';

    case '/help':
      console.log(chalk.cyan('\nComandos disponibles:'));
      console.log(chalk.gray('  /exit       - Salir del chat'));
      console.log(chalk.gray('  /clear      - Limpiar pantalla'));
      console.log(chalk.gray('  /save       - Guardar sesión'));
      console.log(chalk.gray('  /model <m>  - Cambiar modelo'));
      console.log(chalk.gray('  /history    - Ver info de sesión'));
      console.log(chalk.gray('  /help       - Mostrar ayuda\n'));
      return 'handled';

    default:
      console.log(chalk.yellow(`Comando desconocido: ${cmd}. Usa /help`));
      return 'handled';
  }
}
