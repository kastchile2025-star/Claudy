import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, saveConfig, getConfigPath } from '../config.js';

export const configCommand = new Command('config')
  .description('Gestionar configuración');

configCommand
  .command('get')
  .description('Ver configuración actual')
  .option('-k, --key <key>', 'Obtener un valor específico')
  .action((options) => {
    const config = loadConfig();

    if (options.key) {
      const keys = options.key.split('.');
      let value: any = config;
      for (const k of keys) {
        value = value?.[k];
      }
      console.log(value ?? chalk.red('No encontrado'));
      return;
    }

    console.log(chalk.cyan.bold('\n⚙️  Configuración actual:\n'));
    console.log(chalk.gray('Archivo: ') + getConfigPath());
    console.log('');
    console.log(chalk.cyan('OpenRouter:'));
    console.log(`  apiKey: ${config.openrouter.apiKey ? chalk.green('***configurada***') : chalk.red('no configurada')}`);
    console.log(`  defaultModel: ${chalk.yellow(config.openrouter.defaultModel)}`);
    console.log('');
    console.log(chalk.cyan('Agent:'));
    console.log(`  systemPrompt: ${chalk.gray(config.agent.systemPrompt.substring(0, 60))}...`);
    console.log(`  maxTokens: ${chalk.yellow(config.agent.maxTokens)}`);
    console.log(`  temperature: ${chalk.yellow(config.agent.temperature)}`);
    console.log('');
  });

configCommand
  .command('set')
  .description('Establecer un valor de configuración')
  .argument('<key>', 'Clave (ej: agent.temperature)')
  .argument('<value>', 'Valor')
  .action((key: string, value: string) => {
    const config = loadConfig();
    const keys = key.split('.');

    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    let current: any = config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = parsedValue;

    saveConfig(config);
    console.log(chalk.green(`✓ ${key} = ${parsedValue}`));
  });

configCommand
  .command('edit')
  .description('Editar configuración interactivamente')
  .action(async () => {
    const config = loadConfig();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'defaultModel',
        message: 'Modelo predeterminado:',
        default: config.openrouter.defaultModel,
      },
      {
        type: 'input',
        name: 'systemPrompt',
        message: 'System prompt:',
        default: config.agent.systemPrompt,
      },
      {
        type: 'number',
        name: 'temperature',
        message: 'Temperatura:',
        default: config.agent.temperature,
      },
      {
        type: 'number',
        name: 'maxTokens',
        message: 'Máximo de tokens:',
        default: config.agent.maxTokens,
      },
    ]);

    config.openrouter.defaultModel = answers.defaultModel;
    config.agent.systemPrompt = answers.systemPrompt;
    config.agent.temperature = answers.temperature;
    config.agent.maxTokens = answers.maxTokens;

    saveConfig(config);
    console.log(chalk.green('\n✓ Configuración actualizada\n'));
  });

configCommand
  .command('path')
  .description('Mostrar ruta del archivo de configuración')
  .action(() => {
    console.log(getConfigPath());
  });
