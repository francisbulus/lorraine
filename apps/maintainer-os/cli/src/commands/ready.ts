import type { Command } from 'commander';
import chalk from 'chalk';
import { getStore, closeStore } from '../lib/store.js';
import { loadConfig } from '../lib/config.js';
import { loadBundles } from '../lib/domain.js';
import { evaluateReadiness, suggestAction } from '../lib/role-gates.js';
import type { ReadinessResult } from '../lib/role-gates.js';
import { colorForLevel, iconForLevel, formatConfidence } from '../lib/formatters.js';
import { EXIT_POLICY_UNMET, EXIT_CONFIG_ERROR } from '../types.js';

export function registerReadyCommand(program: Command): void {
  program
    .command('ready')
    .description('Evaluate readiness against a capability bundle')
    .requiredOption('--person <id>', 'Person identifier')
    .requiredOption('--bundle <name>', 'Capability bundle name')
    .option('--verbose', 'Show full trust state per concept')
    .action((opts: { person: string; bundle: string; verbose?: boolean }) => {
      const configPath = program.opts()['config'] as string | undefined;
      const format = program.opts()['format'] as string;
      const config = loadConfig(configPath);
      const store = getStore(configPath);

      try {
        const bundles = loadBundles(config.store.path);
        const bundle = bundles[opts.bundle];

        if (!bundle) {
          console.error(`Bundle "${opts.bundle}" not found. Load a domain pack with bundles first.`);
          process.exit(EXIT_CONFIG_ERROR);
        }

        const result = evaluateReadiness(store, opts.person, opts.bundle, bundle);

        if (format === 'json') {
          console.log(JSON.stringify({
            person: result.person,
            bundle: result.bundle,
            ready: result.passed,
            passedCount: result.passedCount,
            totalCount: result.totalCount,
            gates: result.gates.map((g) => ({
              concept: g.requirement.concept,
              requiredLevel: g.requirement.minLevel,
              requiredConfidence: g.requirement.minConfidence,
              actualLevel: g.state.level,
              actualConfidence: g.state.decayedConfidence,
              passed: g.passed,
              reason: g.reason,
            })),
          }, null, 2));
        } else {
          printReadinessTable(result);
        }

        if (!result.passed) {
          process.exit(EXIT_POLICY_UNMET);
        }
      } finally {
        closeStore();
      }
    });
}

function printReadinessTable(result: ReadinessResult): void {
  console.log(`${chalk.bold('Readiness:')} ${result.person} → ${result.bundle}`);
  console.log('');

  for (const gate of result.gates) {
    const icon = gate.passed ? iconForLevel(gate.state.level) : (gate.state.level === 'untested' ? chalk.dim('·') : chalk.red('✗'));
    const name = chalk.bold(gate.requirement.concept.padEnd(26));
    const color = colorForLevel(gate.state.level);
    const levelStr = color(`${gate.state.level} (${formatConfidence(gate.state.decayedConfidence)})`);
    const status = gate.passed
      ? chalk.green('MEETS REQUIREMENT')
      : chalk.red(`DOES NOT MEET (requires ${gate.requirement.minLevel})`);

    console.log(`  ${icon} ${name} ${levelStr.padEnd(40)} ${status}`);
  }

  console.log('');
  if (result.passed) {
    console.log(chalk.green.bold(`Result: READY (${result.passedCount} of ${result.totalCount} requirements met)`));
  } else {
    console.log(chalk.red.bold(`Result: NOT READY (${result.passedCount} of ${result.totalCount} requirements met)`));
    console.log('');
    console.log(chalk.bold('Next steps:'));
    for (const gate of result.gates) {
      if (!gate.passed) {
        console.log(`  ${suggestAction(gate)}`);
      }
    }
  }
}
