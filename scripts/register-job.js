#!/usr/bin/env node
/**
 * Register a new job packet and its tracker row as one operation.
 *
 * The command validates tracker/folder consistency before allocating an ID,
 * creates the packet, and writes the tracker row. If any write fails, the
 * newly-created packet and tracker change are rolled back.
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TRACKER_FILE = 'Job-Tracker.md';
const DESCRIPTION_FILE = '01-Job-Description.md';
const LOCK_FILE = '.job-registration.lock';
const PACKET_DIRS = ['_Active', '_Potential', '_Archive'];
const allocatorPath = path.join(__dirname, 'next-job-id.js');

function parseArgs(argv) {
  const args = {
    root: null,
    company: null,
    role: null,
    url: null,
    bucket: 'potential',
    status: null,
    level: '',
    location: '',
    descriptionFile: null,
    lastAction: 'Registered job packet',
    appliedDate: '',
    rubricScore: '—',
    interviewStage: null,
    dryRun: false,
    json: false,
  };

  const valueOptions = new Map([
    ['--root', 'root'],
    ['--company', 'company'],
    ['--role', 'role'],
    ['--url', 'url'],
    ['--bucket', 'bucket'],
    ['--status', 'status'],
    ['--level', 'level'],
    ['--location', 'location'],
    ['--description-file', 'descriptionFile'],
    ['--last-action', 'lastAction'],
    ['--applied-date', 'appliedDate'],
    ['--rubric-score', 'rubricScore'],
    ['--interview-stage', 'interviewStage'],
  ]);

  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (valueOptions.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value.`);
      }
      args[valueOptions.get(argument)] = value;
      index += 1;
    } else if (argument === '--dry-run') {
      args.dryRun = true;
    } else if (argument === '--json') {
      args.json = true;
    } else if (argument === '--help' || argument === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return args;
}

function usage() {
  return [
    'Register a job packet and Job-Tracker.md row atomically.',
    '',
    'Usage:',
    '  node scripts/register-job.js --company "Example Corp" --role "Product Manager" \\',
    '    --url "https://careers.example.com/jobs/123" [options]',
    '',
    'Options:',
    '  --root <dir>               Private workspace (default: .local-user)',
    '  --bucket active|potential  Packet destination (default: potential)',
    '  --status <status>          Tracker status (defaults from bucket)',
    '  --level <level>            Optional level for legacy tracker schemas',
    '  --location <location>      Optional location in the job-description record',
    '  --description-file <path>  Optional plain-text/Markdown job description',
    '  --last-action <text>       Tracker action (default: Registered job packet)',
    '  --applied-date YYYY-MM-DD  Applied date, if already submitted',
    '  --rubric-score <score>     Initial score (default: —)',
    '  --interview-stage <stage>  Initial interview stage',
    '  --dry-run                  Validate and show the plan without writing',
    '  --json                     Print machine-readable output',
  ].join('\n');
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cleanSingleLine(value, fieldName) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${fieldName} is required.`);
  if (/[\r\n|]/.test(text)) {
    throw new Error(`${fieldName} cannot contain line breaks or "|" characters.`);
  }
  return text;
}

function normalizeBucket(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/^_/, '');
  if (normalized === 'active') return '_Active';
  if (normalized === 'potential') return '_Potential';
  throw new Error('Bucket must be "active" or "potential".');
}

function validateUrl(value) {
  const text = cleanSingleLine(value, 'Job URL');
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error('Job URL must be a valid HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Job URL must use HTTP or HTTPS.');
  }
  return parsed.toString();
}

function canonicalJobUrl(value) {
  const parsed = new URL(value);
  parsed.hash = '';
  const trackingParameters = new Set([
    'source',
    'codes',
    'gh_src',
    'ref',
    'referrer',
    'campaign',
    'trackingid',
  ]);
  for (const key of [...parsed.searchParams.keys()]) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('utm_') || trackingParameters.has(lowerKey)) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return parsed.toString();
}

function extractPacketJobUrl(source) {
  const labeled = source.match(
    /^\*\*(?:Official )?Job URL:\*\*\s*(https?:\/\/\S+)/im,
  );
  if (labeled) return labeled[1].replace(/[.,;:]+$/g, '');

  const firstUrl = source.match(/https?:\/\/[^\s)\]`]+/);
  return firstUrl ? firstUrl[0].replace(/[.,;:]+$/g, '') : null;
}

function findExistingPacketByUrl(rootDir, jobUrl) {
  const target = canonicalJobUrl(jobUrl);
  for (const bucket of PACKET_DIRS) {
    const bucketPath = path.join(rootDir, bucket);
    if (!fs.existsSync(bucketPath)) continue;
    for (const entry of fs.readdirSync(bucketPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const descriptionPath = path.join(bucketPath, entry.name, DESCRIPTION_FILE);
      if (!fs.existsSync(descriptionPath)) continue;
      const source = fs.readFileSync(descriptionPath, 'utf8');
      const candidate = extractPacketJobUrl(source);
      if (candidate) {
        try {
          if (canonicalJobUrl(candidate) === target) {
            return `${bucket}/${entry.name}`;
          }
        } catch {
          // Ignore malformed URLs in older hand-authored packets.
        }
      }
    }
  }
  return null;
}

function validateOptionalDate(value, fieldName) {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD.`);
  }
  return value;
}

function packetSlug(value, maximumLength) {
  const slug = String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximumLength)
    .replace(/-+$/g, '');
  if (!slug) throw new Error(`Could not create a folder name from "${value}".`);
  return slug;
}

function runDriftCheck(rootDir) {
  const result = spawnSync(
    process.execPath,
    [allocatorPath, '--root', rootDir, '--check', '--json'],
    { encoding: 'utf8' },
  );
  if (result.error) throw result.error;

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `Could not read the J-ID validation result.${result.stderr ? ` ${result.stderr.trim()}` : ''}`,
    );
  }

  const failures = [];
  if (!report.trackerFound) failures.push(`${TRACKER_FILE} is missing.`);
  if (report.foldersMissingTrackerRows?.length) {
    failures.push(`Packet folders are missing tracker rows: ${report.foldersMissingTrackerRows.join(', ')}.`);
  }
  if (report.duplicateFolderIds?.length) {
    failures.push(`Duplicate packet folder IDs exist: ${report.duplicateFolderIds.join(', ')}.`);
  }
  if (result.status !== 0 && !failures.length) {
    failures.push('The J-ID drift check failed.');
  }
  if (failures.length) {
    throw new Error(
      `Job registration is blocked until the workspace is repaired:\n- ${failures.join('\n- ')}`,
    );
  }
  if (!report.nextId) throw new Error('The J-ID allocator did not return a next ID.');
  return report;
}

function trackerRow(markdown, values) {
  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const hadFinalNewline = /\r?\n$/.test(markdown);
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^\|\s*ID\s*\|\s*Company\s*\|/i.test(line));
  if (headerIndex === -1) {
    throw new Error(`${TRACKER_FILE} must contain a Markdown table beginning with ID and Company.`);
  }

  const headers = lines[headerIndex]
    .trim()
    .slice(1, -1)
    .split('|')
    .map((header) => header.trim().toLowerCase());
  for (const required of ['id', 'company', 'role', 'status']) {
    if (!headers.includes(required)) {
      throw new Error(`${TRACKER_FILE} is missing the required "${required}" column.`);
    }
  }

  const aliases = {
    id: values.id,
    company: values.company,
    role: values.role,
    level: values.level,
    status: values.status,
    'last action': values.lastAction,
    'last updated': values.date,
    date: values.date,
    'applied date': values.appliedDate,
    'rubric score': values.rubricScore,
    'interview stage': values.interviewStage,
  };
  const cells = headers.map((header) => aliases[header] || '');
  const row = `| ${cells.join(' | ')} |`;

  let insertIndex = headerIndex + 2;
  while (insertIndex < lines.length && lines[insertIndex].trim().startsWith('|')) {
    insertIndex += 1;
  }
  lines.splice(insertIndex, 0, row);
  const updated = lines.join(eol);
  return hadFinalNewline && !updated.endsWith(eol) ? `${updated}${eol}` : updated;
}

function descriptionMarkdown(values) {
  const lines = [
    `# ${values.role}`,
    '',
    `**Company:** ${values.company}`,
    `**Job URL:** ${values.url}`,
  ];
  if (values.location) lines.push(`**Location:** ${values.location}`);
  lines.push(
    `**Registered:** ${values.date}`,
    '',
    '---',
    '',
    values.description || '*(Job description not yet captured.)*',
    '',
  );
  return lines.join('\n');
}

function acquireLock(rootDir) {
  const lockPath = path.join(rootDir, LOCK_FILE);
  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(descriptor, `${process.pid} ${new Date().toISOString()}\n`, 'utf8');
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(
        `Another registration may be running (${lockPath}). ` +
        'If no registration is active, remove the stale lock and retry.',
      );
    }
    throw error;
  }
  return () => {
    fs.closeSync(descriptor);
    fs.unlinkSync(lockPath);
  };
}

function registerJob(options) {
  const repoRoot = path.resolve(__dirname, '..');
  const rootDir = path.resolve(options.rootDir || path.join(repoRoot, '.local-user'));
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    throw new Error(
      `Private workspace not found: ${rootDir}. ` +
      'Create it from local-user-template before registering jobs.',
    );
  }

  const company = cleanSingleLine(options.company, 'Company');
  const role = cleanSingleLine(options.role, 'Role');
  const url = validateUrl(options.url);
  const bucket = normalizeBucket(options.bucket || 'potential');
  const date = options.date || localIsoDate();
  const status = cleanSingleLine(
    options.status || (bucket === '_Active' ? 'Active' : 'Potential'),
    'Status',
  );
  const appliedDate = validateOptionalDate(
    options.appliedDate || (/^applied$/i.test(status) ? date : ''),
    'Applied date',
  );
  const values = {
    company,
    role,
    url,
    bucket,
    date,
    status,
    level: options.level ? cleanSingleLine(options.level, 'Level') : '',
    location: options.location ? cleanSingleLine(options.location, 'Location') : '',
    lastAction: cleanSingleLine(options.lastAction || 'Registered job packet', 'Last action'),
    appliedDate,
    rubricScore: cleanSingleLine(options.rubricScore || '—', 'Rubric score'),
    interviewStage: cleanSingleLine(
      options.interviewStage ||
        (/^applied$/i.test(status)
          ? 'Waiting'
          : bucket === '_Active'
            ? 'Ready - awaiting submission'
            : 'Not started'),
      'Interview stage',
    ),
    description: options.description ? String(options.description).trim() : '',
  };

  const releaseLock = acquireLock(rootDir);
  let folderPath;
  let trackerPath;
  let originalTracker;
  let folderCreated = false;
  let trackerWriteAttempted = false;

  try {
    trackerPath = path.join(rootDir, TRACKER_FILE);
    if (!fs.existsSync(trackerPath)) {
      throw new Error(
        `${TRACKER_FILE} is missing. Restore or initialize it before registering a job.`,
      );
    }

    const allocation = runDriftCheck(rootDir);
    const existingPacket = findExistingPacketByUrl(rootDir, url);
    if (existingPacket) {
      const error = new Error(`This job URL is already registered in ${existingPacket}.`);
      error.code = 'DUPLICATE_JOB_URL';
      throw error;
    }
    values.id = allocation.nextId;
    const folderName = [
      values.id,
      packetSlug(company, 35),
      packetSlug(role, 55),
    ].join('-');
    const bucketPath = path.join(rootDir, bucket);
    folderPath = path.join(bucketPath, folderName);
    if (fs.existsSync(folderPath)) {
      throw new Error(`Packet folder already exists: ${folderPath}`);
    }

    originalTracker = fs.readFileSync(trackerPath, 'utf8');
    const updatedTracker = trackerRow(originalTracker, values);
    const description = descriptionMarkdown(values);
    const result = {
      id: values.id,
      company,
      role,
      status,
      bucket,
      folder: path.relative(rootDir, folderPath).replace(/\\/g, '/'),
      tracker: TRACKER_FILE,
      dryRun: Boolean(options.dryRun),
    };
    if (options.dryRun) return result;

    fs.mkdirSync(bucketPath, { recursive: true });
    fs.mkdirSync(folderPath);
    folderCreated = true;
    fs.writeFileSync(path.join(folderPath, DESCRIPTION_FILE), description, 'utf8');
    trackerWriteAttempted = true;
    fs.writeFileSync(trackerPath, updatedTracker, 'utf8');

    const verification = runDriftCheck(rootDir);
    if (verification.nextId === values.id) {
      throw new Error('Registration verification failed: the new ID was not recognized.');
    }
    return result;
  } catch (error) {
    if (trackerWriteAttempted && originalTracker !== undefined) {
      fs.writeFileSync(trackerPath, originalTracker, 'utf8');
    }
    if (folderCreated && folderPath && fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
    throw error;
  } finally {
    releaseLock();
  }
}

function main() {
  try {
    const args = parseArgs(process.argv);
    if (args.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    let description = '';
    if (args.descriptionFile) {
      description = fs.readFileSync(path.resolve(args.descriptionFile), 'utf8');
    }
    const result = registerJob({
      rootDir: args.root,
      company: args.company,
      role: args.role,
      url: args.url,
      bucket: args.bucket,
      status: args.status,
      level: args.level,
      location: args.location,
      description,
      lastAction: args.lastAction,
      appliedDate: args.appliedDate,
      rubricScore: args.rubricScore,
      interviewStage: args.interviewStage,
      dryRun: args.dryRun,
    });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(
        `${result.dryRun ? 'Would register' : 'Registered'} ${result.id}: ` +
        `${result.company} — ${result.role}\n` +
        `  Packet: ${result.folder}\n` +
        `  Tracker: ${result.tracker}\n`,
      );
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  registerJob,
};
