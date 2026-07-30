#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { registerJob } = require('./register-job');

function parseArgs(argv) {
  const repoRoot = path.resolve(__dirname, '..');
  const args = {
    input: path.resolve(process.cwd(), 'linkedin-jd-results.json'),
    root: path.join(repoRoot, '.local-user'),
    bucket: 'active',
    dryRun: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (['--input', '--root', '--bucket'].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
      args[argument.slice(2)] = value;
      index += 1;
    } else if (argument === '--dry-run') {
      args.dryRun = true;
    } else if (argument === '--help' || argument === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  args.input = path.resolve(args.input);
  args.root = path.resolve(args.root);
  return args;
}

function usage() {
  return [
    'Register LinkedIn scrape results as packet + tracker records.',
    '',
    'Usage:',
    '  node scripts/create-job-folders.js [options]',
    '',
    'Options:',
    '  --input <file>              Scrape JSON (default: ./linkedin-jd-results.json)',
    '  --root <dir>                Private workspace (default: .local-user)',
    '  --bucket active|potential   Destination (default: active)',
    '  --dry-run                   Validate and preview without writing',
  ].join('\n');
}

function main() {
  try {
    const args = parseArgs(process.argv);
    if (args.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    if (!fs.existsSync(args.input)) {
      throw new Error(`${args.input} not found. Run linkedin-scrape-jds.js first or pass --input.`);
    }

    const jobs = JSON.parse(fs.readFileSync(args.input, 'utf8'));
    if (!Array.isArray(jobs)) throw new Error('Scrape input must be a JSON array.');

    const registered = [];
    const skipped = [];
    for (const job of jobs) {
      try {
        const result = registerJob({
          rootDir: args.root,
          company: job.company,
          role: job.title,
          url: job.url,
          location: job.location || '',
          description: job.description || '*(No description scraped.)*',
          bucket: args.bucket,
          status: args.bucket.replace(/^_/, '').toLowerCase() === 'potential'
            ? 'Potential'
            : 'Active',
          lastAction: 'Imported from LinkedIn scraping pipeline',
          dryRun: args.dryRun,
        });
        registered.push(result);
        process.stdout.write(
          `${args.dryRun ? 'Would register' : 'Registered'} ${result.id}: ` +
          `${result.company} — ${result.role}\n`,
        );
      } catch (error) {
        if (error.code !== 'DUPLICATE_JOB_URL') throw error;
        skipped.push(job);
        process.stdout.write(`Skipped existing job: ${job.company} — ${job.title}\n`);
      }
    }
    process.stdout.write(
      `\n${args.dryRun ? 'Validated' : 'Registered'} ${registered.length} job packet(s). ` +
      `${skipped.length} duplicate(s) skipped. Every new packet has a matching tracker row.\n`,
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
