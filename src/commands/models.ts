import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { OpenRouterClient } from '../openrouter.js';

export const modelsCommand = new Command('models')
  .description('Gestionar modelos LLM');

modelsCommand
  .command('list')
  .alias('ls')
  .description('Listar modelos disponibles en OpenRouter')
  .option('-s, --search <query>', 'Filtrar por texto')
  .option('-l, --limit <n>', 'Limitar resultados', '20')
  .action(async (options) => {
    const config = loadConfig();

    if (!config.openrouter.apiKey) {
      console.log(chalk.red('✗ No tienes API key configurada.'));
      console.log(chalk.yellow('Ejecuta: claudy setup'));
      process.exit(1);
    }

    const spinner = ora('Obteniendo modelos...').start();

    try {
      const client = new OpenRouterClient(config.openrouter.apiKey);
      let models = await client.getModels();

      if (options.search) {
        const query = options.search.toLowerCase();
        models = models.filter(
          (m) =>
            m.id.toLowerCase().includes(query) ||
            m.name.toLowerCase().includes(query)
        );
      }

      const limit = parseInt(options.limit);
      const limited = models.slice(0, limit);

      spinner.succeed(chalk.green(`${models.length} modelos encontrados`));

      console.log('');
      limited.forEach((model) => {
        const isDefault = model.id === config.openrouter.defaultModel;
        const marker = isDefault ? chalk.green(' ★') : '';
        console.log(chalk.yellow(`▸ ${model.id}${marker}`));
        console.log(chalk.gray(`  ${model.name}`));
        if (model.description) {
          const desc = model.description.substring(0, 100);
          console.log(chalk.gray(`  ${desc}${model.description.length > 100 ? '...' : ''}`));
        }
        console.log('');
      });

      if (models.length > limit) {
        console.log(
          chalk.gray(`... y ${models.length - limit} más. Usa --limit para ver más.\n`)
        );
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Error: ' + error.message));
      process.exit(1);
    }
  });

modelsCommand
  .command('current')
  .description('Mostrar modelo actual')
  .action(() => {
    const config = loadConfig();
    console.log(chalk.cyan('Modelo actual: ') + chalk.yellow(config.openrouter.defaultModel));
  });

modelsCommand
  .command('set <model>')
  .description('Establecer modelo predeterminado')
  .action(async (model: string) => {
    const config = loadConfig();

    if (!model.includes('/')) {
      console.log(chalk.red('✗ Formato inválido. Usa: provider/model'));
      process.exit(1);
    }

    config.openrouter.defaultModel = model;

    const { saveConfig } = await import('../config.js');
    saveConfig(config);

    console.log(chalk.green(`✓ Modelo predeterminado: ${model}`));
  });
