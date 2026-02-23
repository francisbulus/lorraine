import type { Command } from 'commander';
import chalk from 'chalk';
import { getStore, closeStore } from '../lib/store.js';
import { loadConfig } from '../lib/config.js';
import { loadPeople } from '../lib/domain.js';
import { scoreReviewers } from '../lib/reviewer-scoring.js';
import type { ReviewerScore } from '../lib/reviewer-scoring.js';
import { colorForLevel, formatConfidence, formatTimeAgo } from '../lib/formatters.js';

export function registerReviewersCommand(program: Command): void {
  program
    .command('reviewers')
    .description('Recommend reviewers for a set of concepts')
    .requiredOption('--concepts <ids>', 'Comma-separated concept identifiers')
    .option('--top <n>', 'Number of reviewers to return', '3')
    .action((opts: { concepts: string; top: string }) => {
      const configPath = program.opts()['config'] as string | undefined;
      const format = program.opts()['format'] as string;
      const config = loadConfig(configPath);
      const store = getStore(configPath);

      try {
        const conceptIds = opts.concepts.split(',').map((c) => c.trim());
        const topN = parseInt(opts.top, 10) || 3;
        const people = loadPeople(config.store.path);

        if (people.length === 0) {
          console.log('No people found. Run `mos ingest run` to build evidence first.');
          return;
        }

        const scores = scoreReviewers(store, conceptIds, people, topN);

        if (scores.length === 0) {
          console.log(`No reviewers found with trust on: ${conceptIds.join(', ')}`);
          return;
        }

        if (format === 'json') {
          console.log(JSON.stringify({
            concepts: conceptIds,
            reviewers: scores.map(scoreToJson),
          }, null, 2));
        } else {
          printReviewerTable(conceptIds, scores);
        }
      } finally {
        closeStore();
      }
    });
}

function printReviewerTable(conceptIds: string[], scores: ReviewerScore[]): void {
  console.log(`${chalk.bold('Recommended Reviewers:')} ${conceptIds.join(', ')}`);
  console.log('');

  for (const [i, score] of scores.entries()) {
    console.log(`  ${chalk.bold(`${i + 1}. ${score.personId}`)}`);
    for (const cs of score.conceptScores) {
      const color = colorForLevel(cs.level);
      const timeStr = cs.lastVerified ? `, ${formatTimeAgo(cs.lastVerified)}` : '';
      console.log(`     ${cs.conceptId}: ${color(`${cs.level} (${formatConfidence(cs.decayedConfidence)}${timeStr})`)}`);
    }
    const coverage = [];
    if (score.verifiedCount > 0) coverage.push(`${score.verifiedCount}/${conceptIds.length} verified`);
    if (score.inferredCount > 0) coverage.push(`${score.inferredCount}/${conceptIds.length} inferred`);
    console.log(`     Coverage: ${coverage.join(', ')}`);
    console.log('');
  }

  console.log(chalk.dim(`Details: mos why --person <name> --concept <concept>`));
}

function scoreToJson(score: ReviewerScore): unknown {
  return {
    personId: score.personId,
    verifiedCount: score.verifiedCount,
    inferredCount: score.inferredCount,
    totalScore: score.totalScore,
    concepts: score.conceptScores.map((cs) => ({
      conceptId: cs.conceptId,
      level: cs.level,
      confidence: cs.confidence,
      decayedConfidence: cs.decayedConfidence,
      lastVerified: cs.lastVerified,
    })),
  };
}
