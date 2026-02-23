#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';

import { registerInitCommand } from './commands/init.js';
import { registerDomainCommand } from './commands/domain.js';
import { registerIngestCommand } from './commands/ingest.js';
import { registerStatusCommand } from './commands/status.js';
import { registerReadyCommand } from './commands/ready.js';
import { registerWhyCommand } from './commands/why.js';
import { registerReviewersCommand } from './commands/reviewers.js';
import { registerCalibrateCommand } from './commands/calibrate.js';
import { registerRetractCommand } from './commands/retract.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('mos')
  .description('MaintainerOS: evidence ops for codebase understanding')
  .version(pkg.version)
  .option('--format <type>', 'Output format (table, json, yaml)', 'table')
  .option('--config <path>', 'Config file path');

registerInitCommand(program);
registerDomainCommand(program);
registerIngestCommand(program);
registerStatusCommand(program);
registerReadyCommand(program);
registerWhyCommand(program);
registerReviewersCommand(program);
registerCalibrateCommand(program);
registerRetractCommand(program);

program.parse();
