import type { Command } from 'commander';
import chalk from 'chalk';
import { getStore, closeStore } from '../lib/store.js';
import { loadConfig } from '../lib/config.js';
import { loadPeople } from '../lib/domain.js';
import { scoreReviewers } from '../lib/reviewer-scoring.js';
import type { ReviewerScore } from '../lib/reviewer-scoring.js';
import {
  colorForLevelGradient,
  renderBar,
  renderFrame,
  renderInnerSeparator,
  renderReviewerHeader,
  formatConfidence,
  formatTimeAgo,
  computeConceptWidth,
  padName,
  isStale,
  titleCase,
  BAR_WIDTH,
} from '../lib/formatters.js';

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
  const conceptWidth = computeConceptWidth(conceptIds);
  const contentLines: string[] = [];

  for (const [i, score] of scores.entries()) {
    if (i > 0) {
      contentLines.push('');
      contentLines.push(renderInnerSeparator());
    }
    contentLines.push('');

    // Coverage summary
    const coverage = buildCoverageString(score, conceptIds.length);
    const hasContested = score.conceptScores.some((cs) => cs.level === 'contested');
    const warning = hasContested ? ' ⚠' : '';
    const headerWidth = 50;
    contentLines.push(renderReviewerHeader(i + 1, score.personId, coverage + warning, headerWidth));

    for (const cs of score.conceptScores) {
      contentLines.push('');
      const color = colorForLevelGradient(cs.level, cs.decayedConfidence);
      const bar = renderBar(cs.decayedConfidence, BAR_WIDTH, color);
      const conf = formatConfidence(cs.decayedConfidence);
      contentLines.push(`  ${color(padName(cs.conceptId, conceptWidth))} ${bar}  ${conf}`);

      // Detail line
      const time = cs.lastVerified ? formatTimeAgo(cs.lastVerified) : '';
      const staleTag = cs.lastVerified && isStale(cs.lastVerified) ? ' (stale)' : '';
      const contestedTag = cs.level === 'contested' ? ' ⚡' : '';
      const detail = [cs.level, time].filter(Boolean).join(' · ') + staleTag + contestedTag;
      contentLines.push(`    ${chalk.dim(detail)}`);
    }
  }

  contentLines.push('');

  const footer = 'Detail: mos why --person <name> --concept <c>';
  const frame = renderFrame('Reviewers', conceptIds.map(titleCase).join(', '), contentLines, footer);
  for (const line of frame) {
    console.log(line);
  }
}

function buildCoverageString(score: ReviewerScore, total: number): string {
  const parts: string[] = [];
  if (score.verifiedCount > 0) parts.push(`${score.verifiedCount}/${total} verified`);
  if (score.inferredCount > 0) parts.push(`${score.inferredCount}/${total} inferred`);
  return parts.join(', ') || 'no coverage';
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
