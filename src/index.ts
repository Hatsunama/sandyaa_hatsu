#!/usr/bin/env node
import { Command } from 'commander';
import { Orchestrator } from './orchestrator/orchestrator.js';
import { loadConfig } from './utils/config.js';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, resolve, sep } from 'path';
import { ClaudeExecutor } from './agents/agent-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BRAND = '#FF8C00';
const VERSION = '1.0.0';

function printBanner(target: string): void {
  const orange = chalk.hex(BRAND);
  const dim = chalk.gray;
  const INNER = 52;

  const pad = (s: string): string => {
    const max = INNER - 2;
    const visible = s.length > max ? '…' + s.slice(-(max - 1)) : s;
    return ' ' + visible + ' '.repeat(max - visible.length) + ' ';
  };

  const border = (ch: string) => orange(ch);
  const top = border('╭' + '─'.repeat(INNER) + '╮');
  const bot = border('╰' + '─'.repeat(INNER) + '╯');
  const blank = border('│') + ' '.repeat(INNER) + border('│');
  const row = (text: string, color: (s: string) => string = (s) => s) =>
    border('│') + color(pad(text)) + border('│');

  const wordmark = [
    '  ███████╗ █████╗ ███╗   ██╗██████╗ ██╗   ██╗ █████╗  █████╗ ',
    '  ██╔════╝██╔══██╗████╗  ██║██╔══██╗╚██╗ ██╔╝██╔══██╗██╔══██╗',
    '  ███████╗███████║██╔██╗ ██║██║  ██║ ╚████╔╝ ███████║███████║',
    '  ╚════██║██╔══██║██║╚██╗██║██║  ██║  ╚██╔╝  ██╔══██║██╔══██║',
    '  ███████║██║  ██║██║ ╚████║██████╔╝   ██║   ██║  ██║██║  ██║',
    '  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝',
  ];

  console.log();
  for (const line of wordmark) console.log(orange(line));
  console.log();
  console.log(top);
  console.log(row('✵ Welcome to Sandyaa', orange));
  console.log(blank);
  console.log(row('  Autonomous security bug hunter', (s) => s));
  console.log(row('  providers: OpenAI/Codex, Claude, Gemini', dim));
  console.log(blank);
  console.log(row('  target: ' + target, dim));
  console.log(row('  v' + VERSION, dim));
  console.log(bot);
  console.log();
}

const program = new Command();

program
  .name('sandyaa')
  .description('Autonomous security bug hunter - real exploits, no hallucination')
  .version('1.0.0')
  .argument('<target>', 'Path to target codebase or git URL')
  .option('-c, --config <path>', 'Path to config file', '.sandyaa/config.yaml')
  .option('--fresh', 'Start fresh analysis, ignore existing checkpoint')
  .option('--provider <provider>', 'AI provider: claude, gemini, openai, auto')
  .option('--model <model>', 'Model tier for selected provider')
  .option('--fallback <provider>', 'Fallback provider: claude, gemini, openai, none')
  .action(async (target: string, options) => {
    try {
      printBanner(target);

      // Validate target is provided
      if (!target || target.trim() === '') {
        console.error(chalk.red('Error: Target path or git URL is required'));
        console.log(chalk.yellow('\nUsage: sandyaa <target>'));
        console.log(chalk.gray('Examples:'));
        console.log(chalk.gray('  sandyaa /path/to/project'));
        console.log(chalk.gray('  sandyaa https://github.com/user/repo.git'));
        process.exit(1);
      }

      const config = await loadConfig(options.config);

      if (options.provider) {
        if (!['claude', 'gemini', 'openai', 'auto'].includes(options.provider)) {
          throw new Error("Invalid provider: " + options.provider);
        }

        config.provider = config.provider || {
          primary: 'openai',
          fallback: 'gemini',
          autoSwitch: true,
          intelligentSelection: true,
          models: {
            openai: 'codex',
            claude: 'sonnet',
            gemini: 'pro'
          }
        };

        config.provider.primary = options.provider;
      }

      if (options.fallback) {
        if (!['claude', 'gemini', 'openai', 'none'].includes(options.fallback)) {
          throw new Error("Invalid fallback: " + options.fallback);
        }

        config.provider = config.provider || {
          primary: 'openai',
          fallback: 'gemini',
          autoSwitch: true,
          intelligentSelection: true,
          models: {
            openai: 'codex',
            claude: 'sonnet',
            gemini: 'pro'
          }
        };

        config.provider.fallback = options.fallback;
      }

      if (options.model) {
        config.provider = config.provider || {
          primary: 'openai',
          fallback: 'gemini',
          autoSwitch: true,
          intelligentSelection: true,
          models: {
            openai: 'codex',
            claude: 'sonnet',
            gemini: 'pro'
          }
        };

        config.provider.models = config.provider.models || {};

        if (config.provider.primary === 'openai') {
          if (!['mini', 'standard', 'codex', 'frontier'].includes(options.model)) {
            throw new Error("Invalid OpenAI model tier: " + options.model);
          }

          config.provider.models.openai = options.model;
        } else if (config.provider.primary === 'claude') {
          if (!['haiku', 'sonnet', 'opus'].includes(options.model)) {
            throw new Error("Invalid Claude model tier: " + options.model);
          }

          config.provider.models.claude = options.model;
        } else if (config.provider.primary === 'gemini') {
          if (!['flash', 'pro', 'ultra'].includes(options.model)) {
            throw new Error("Invalid Gemini model tier: " + options.model);
          }

          config.provider.models.gemini = options.model;
        } else {
          throw new Error('--model requires --provider claude, --provider gemini, or --provider openai');
        }
      }
      config.target.path = target;

      // Prevent scanning Sandyaa's own directory
      const sandyaaDir = resolve(__dirname, '..');
      const targetResolved = resolve(target);

      if (targetResolved === sandyaaDir || targetResolved.startsWith(sandyaaDir + sep)) {
        console.error(chalk.red('Error: Cannot analyze Sandyaa\'s own directory'));
        console.log(chalk.yellow('Please specify a different target project to analyze.'));
        process.exit(1);
      }

      // Set target path globally BEFORE any executors are created
      // This ensures ALL Claude CLI calls run in the target directory
      ClaudeExecutor.setGlobalTargetPath(targetResolved);

      const orchestrator = new Orchestrator(config);
      await orchestrator.run(options.fresh);

    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program.parse();
