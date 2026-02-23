import type { Command } from 'commander';
import chalk from 'chalk';
import { getStore, closeStore } from '../lib/store.js';
import { loadConfig } from '../lib/config.js';
import { loadBundles } from '../lib/domain.js';
import { evaluateReadiness } from '../lib/role-gates.js';
import type { ReadinessResult } from '../lib/role-gates.js';
import {
  iconForLevelGradient,
  colorForLevelGradient,
  renderBar,
  renderHeader,
  renderSeparator,
  formatConfidence,
  computeConceptWidth,
  padName,
  BAR_WIDTH,
} from '../lib/formatters.js';
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
  const conceptWidth = computeConceptWidth(result.gates.map((g) => g.requirement.concept));

  console.log(renderHeader('Readiness', `${result.person} → ${result.bundle}`));
  console.log(renderSeparator());
  console.log('');

  for (const gate of result.gates) {
    const passed = gate.passed;
    const color = passed
      ? colorForLevelGradient(gate.state.level, gate.state.decayedConfidence)
      : chalk.red;
    const icon = passed
      ? iconForLevelGradient(gate.state.level, gate.state.decayedConfidence)
      : chalk.red('✗');
    const name = color(padName(gate.requirement.concept, conceptWidth));
    const bar = renderBar(gate.state.decayedConfidence, BAR_WIDTH, color);
    const conf = formatConfidence(gate.state.decayedConfidence);
    const status = passed ? chalk.green('PASS') : chalk.red('BLOCK');
    const gateType = gate.requirement.minLevel === 'verified' ? 'hard' : 'soft';
    const gateLabel = passed
      ? chalk.dim(`[${gateType}]`)
      : chalk.dim(`[${gateType} · ${gate.state.level}]`);

    console.log(`    ${icon} ${name} ${bar} ${conf}  ${status}    ${gateLabel}`);
  }

  console.log('');
  console.log(renderSeparator());
  if (result.passed) {
    console.log(renderHeader('Result', `${chalk.green.bold('READY')} · ${result.passedCount} of ${result.totalCount} met`));
  } else {
    console.log(renderHeader('Result', `${chalk.red.bold('NOT READY')} · ${result.passedCount} of ${result.totalCount} met`));
    console.log('');
    console.log(`  ${chalk.bold('Next steps:')}`);
    for (const gate of result.gates) {
      if (!gate.passed) {
        console.log(`    mos challenge --person ${result.person} --concept ${gate.requirement.concept}`);
      }
    }
  }
}
