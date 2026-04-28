import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, saveConfig } from '../config.js';
import { OpenCodeClient } from '../opencode.js';

export const setupCommand = new Command('setup')
  .description('Configurar Claudy por primera vez')
  .action(async () => {
    console.log(chalk.cyan.bold('\n🤖 Bienvenido a Claudy Setup\n'));
    console.log(chalk.gray('Configura tu asistente de IA personal en pocos pasos.'));
    console.log(chalk.gray('Claudy usa OpenCode local como motor de IA.\n'));

    const config = loadConfig();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'URL del servidor OpenCode:',
        default: config.opencode.baseUrl || 'http://127.0.0.1:4096',
      },
      {
        type: 'input',
        name: 'username',
        message: 'Usuario OpenCode (opcional, Enter para "opencode"):',
        default: config.opencode.username || 'opencode',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password OpenCode (vacío si no hay auth):',
        mask: '*',
        default: config.opencode.password || '',
      },
      {
        type: 'list',
        name: 'defaultModel',
        message: 'Modelo predeterminado:',
        default: config.opencode.defaultModel,
        choices: [
          { name: 'Anthropic: Claude Sonnet 4', value: 'anthropic/claude-sonnet-4' },
          { name: 'Anthropic: Claude Opus 4', value: 'anthropic/claude-opus-4' },
          { name: 'Anthropic: Claude 3.5 Sonnet', value: 'anthropic/claude-3-5-sonnet' },
          { name: 'OpenAI: GPT-4o', value: 'openai/gpt-4o' },
          { name: 'Google: Gemini 1.5 Pro', value: 'google/gemini-1.5-pro' },
          { name: 'Otro (especificar)', value: 'custom' },
        ],
      },
      {
        type: 'input',
        name: 'customModel',
        message: 'Modelo (formato: provider/model):',
        when: (answers) => answers.defaultModel === 'custom',
        validate: (input: string) => {
          if (!input.includes('/')) {
            return 'Formato inválido. Usa: provider/model';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'systemPrompt',
        message: 'System prompt (Enter para usar default):',
        default: config.agent.systemPrompt,
      },
      {
        type: 'number',
        name: 'temperature',
        message: 'Temperatura (0.0 - 1.0):',
        default: config.agent.temperature,
        validate: (input: number) => {
          if (input < 0 || input > 2) return 'Debe ser entre 0 y 2';
          return true;
        },
      },
      {
        type: 'number',
        name: 'maxTokens',
        message: 'Máximo de tokens por respuesta:',
        default: config.agent.maxTokens,
      },
    ]);

    const newConfig = {
      ...config,
      opencode: {
        baseUrl: answers.baseUrl,
        username: answers.username || 'opencode',
        password: answers.password,
        defaultModel:
          answers.defaultModel === 'custom'
            ? answers.customModel
            : answers.defaultModel,
      },
      agent: {
        systemPrompt: answers.systemPrompt,
        temperature: answers.temperature,
        maxTokens: answers.maxTokens,
      },
    };

    // Test connection
    const spinner = ora('Probando conexión con OpenCode...').start();
    const client = new OpenCodeClient(newConfig.opencode);
    const ok = await client.testConnection();

    if (!ok) {
      spinner.warn(
        chalk.yellow(
          'No se pudo conectar a OpenCode. Asegúrate de iniciarlo con:\n  opencode serve --port 4096 --hostname 127.0.0.1'
        )
      );
    } else {
      spinner.succeed(chalk.green('Conexión exitosa con OpenCode'));
    }

    saveConfig(newConfig);

    console.log(chalk.green.bold('\n✓ Configuración guardada\n'));
    console.log(chalk.gray('Comandos disponibles:'));
    console.log(chalk.cyan('  claudy chat       ') + chalk.gray('- Iniciar chat'));
    console.log(chalk.cyan('  claudy models     ') + chalk.gray('- Ver modelos'));
    console.log(chalk.cyan('  claudy sessions   ') + chalk.gray('- Ver sesiones'));
    console.log(chalk.cyan('  claudy config     ') + chalk.gray('- Editar config'));
    console.log('');
  });
