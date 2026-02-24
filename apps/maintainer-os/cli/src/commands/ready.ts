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
  renderFrame,
  renderDoubleFrame,
  renderInnerSeparator,
  renderDoubleBand,
  formatConfidence,
  computeConceptWidth,
  padName,
  titleCase,
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

  const passing = result.gates.filter((g) => g.passed);
  const blocking = result.gates.filter((g) => !g.passed);

  // Build content for the main frame
  const contentLines: string[] = [];

  // GATES section (passing)
  if (passing.length > 0) {
    contentLines.push(chalk.bold('GATES'));

    for (const gate of passing) {
      contentLines.push('');
      const color = colorForLevelGradient(gate.state.level, gate.state.decayedConfidence);
      const icon = iconForLevelGradient(gate.state.level, gate.state.decayedConfidence);
      const name = color(padName(gate.requirement.concept, conceptWidth));
      const bar = renderBar(gate.state.decayedConfidence, BAR_WIDTH, color);
      const conf = formatConfidence(gate.state.decayedConfidence);
      contentLines.push(`  ${icon} ${name} ${bar}  ${conf}   ${chalk.green('PASS')}`);
      const gateType = gate.requirement.minLevel === 'verified' ? 'hard' : 'soft';
      contentLines.push(`    ${chalk.dim(`${gateType} gate · ${gate.state.level}`)}`);
    }
  }

  if (passing.length > 0 && blocking.length > 0) {
    contentLines.push('');
    contentLines.push(renderInnerSeparator());
  }

  // Close the main frame before blockers if we have them, or include verdict
  if (blocking.length > 0) {
    contentLines.push('');

    // Render the frame up to here, then the double-frame blockers break out
    const frameLines = renderFrame('Readiness', `${titleCase(result.person)} → ${titleCase(result.bundle)}`, contentLines);
    for (const line of frameLines.slice(0, -1)) { // omit closing border
      console.log(line);
    }

    // BLOCKERS double-frame
    const blockerLines: string[] = [];
    for (const gate of blocking) {
      const name = chalk.red(padName(gate.requirement.concept, conceptWidth));
      const bar = renderBar(gate.state.decayedConfidence, BAR_WIDTH, chalk.red);
      const conf = formatConfidence(gate.state.decayedConfidence);
      blockerLines.push(`  ${chalk.red('✗')} ${name} ${bar}  ${conf}   ${chalk.red('BLOCK')}`);
      const gateType = gate.requirement.minLevel === 'verified' ? 'hard' : 'soft';
      blockerLines.push(`    ${chalk.dim(`${gateType} gate · ${gate.state.level}`)}`);
      blockerLines.push('');
    }
    const doubleLines = renderDoubleFrame(blockerLines, 'BLOCKERS');
    for (const line of doubleLines) {
      console.log(line);
    }

    // Verdict and next steps inside resumed frame
    const closingLines: string[] = [];
    closingLines.push('');
    closingLines.push(renderDoubleBand(50));
    const verdictLabel = chalk.redBright.bold('NOT READY');
    closingLines.push(`VERDICT: ${verdictLabel}${' '.repeat(20)}${result.passedCount} / ${result.totalCount} met`);
    closingLines.push(renderDoubleBand(50));
    closingLines.push('');
    closingLines.push(chalk.bold('Next:'));
    for (const gate of blocking) {
      closingLines.push(`  → mos challenge --person ${result.person}`);
      closingLines.push(`        --concept ${gate.requirement.concept}`);
    }
    closingLines.push('');

    const closingFrame = renderFrame('', '', closingLines);
    // Only print the content lines (skip the top border, just close it)
    // Actually, resume with │ lines and close
    for (const line of closingLines) {
      const visualLen = stripAnsiLocal(line).length;
      const innerWidth = 58;
      const padding = Math.max(0, innerWidth - visualLen - 2);
      console.log(`  │  ${line}${' '.repeat(padding)}│`);
    }
    console.log(`  └${'─'.repeat(60)}┘`);
  } else {
    // All passing - simple frame with verdict
    contentLines.push('');
    contentLines.push(renderDoubleBand(50));
    const verdictLabel = chalk.greenBright.bold('READY');
    contentLines.push(`VERDICT: ${verdictLabel}${' '.repeat(23)}${result.passedCount} / ${result.totalCount} met`);
    contentLines.push(renderDoubleBand(50));
    contentLines.push('');

    const frame = renderFrame('Readiness', `${titleCase(result.person)} → ${titleCase(result.bundle)}`, contentLines);
    for (const line of frame) {
      console.log(line);
    }
  }
}

function stripAnsiLocal(str: string): string {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}
