import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, saveConfig } from '../config.js';
import { OpenRouterClient } from '../openrouter.js';

export const setupCommand = new Command('setup')
  .description('Configurar Claudy por primera vez')
  .action(async () => {
    console.log(chalk.cyan.bold('\n🤖 Bienvenido a Claudy Setup\n'));
    console.log(chalk.gray('Configura tu asistente de IA personal en pocos pasos.\n'));

    const config = loadConfig();

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'OpenRouter API Key:',
        mask: '*',
        default: config.openrouter.apiKey || undefined,
        validate: (input: string) => {
          if (!input || input.length < 10) {
            return 'API key inválida. Obtén la tuya en https://openrouter.ai/keys';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'defaultModel',
        message: 'Modelo predeterminado:',
        default: config.openrouter.defaultModel,
        choices: [
          { name: 'Claude 3.5 Sonnet (Recomendado)', value: 'anthropic/claude-3.5-sonnet' },
          { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus' },
          { name: 'GPT-4 Turbo', value: 'openai/gpt-4-turbo' },
          { name: 'GPT-4o', value: 'openai/gpt-4o' },
          { name: 'Gemini Pro 1.5', value: 'google/gemini-pro-1.5' },
          { name: 'Llama 3.1 70B', value: 'meta-llama/llama-3.1-70b-instruct' },
          { name: 'Otro (especificar)', value: 'custom' },
        ],
      },
      {
        type: 'input',
        name: 'customModel',
        message: 'Especifica el modelo (formato: provider/model):',
        when: (answers) => answers.defaultModel === 'custom',
        validate: (input: string) => {
          if (!input.includes('/')) {
            return 'Formato inválido. Usa: provider/model (ej: openai/gpt-4)';
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

    // Probar conexión
    const spinner = ora('Probando conexión con OpenRouter...').start();
    const client = new OpenRouterClient(answers.apiKey);
    const isConnected = await client.testConnection();

    if (!isConnected) {
      spinner.fail(chalk.red('No se pudo conectar a OpenRouter. Verifica tu API key.'));
      process.exit(1);
    }
    spinner.succeed(chalk.green('Conexión exitosa con OpenRouter'));

    // Guardar config
    const newConfig = {
      ...config,
      openrouter: {
        apiKey: answers.apiKey,
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

    saveConfig(newConfig);

    console.log(chalk.green.bold('\n✓ Configuración guardada\n'));
    console.log(chalk.gray('Comandos disponibles:'));
    console.log(chalk.cyan('  claudy chat       ') + chalk.gray('- Iniciar chat'));
    console.log(chalk.cyan('  claudy models     ') + chalk.gray('- Ver modelos'));
    console.log(chalk.cyan('  claudy sessions   ') + chalk.gray('- Ver sesiones'));
    console.log(chalk.cyan('  claudy config     ') + chalk.gray('- Editar config'));
    console.log('');
  });
