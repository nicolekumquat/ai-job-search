#!/usr/bin/env node
/**
 * next-job-id.js — safe J-ID allocation + tracker/folder drift detection.
 *
 * Why this exists: J-IDs used to be allocated by reading Job-Tracker.md and
 * taking max+1. But packet folders and tracker rows are created in two separate
 * manual steps, so a session (human or AI agent) that creates folders without
 * registering tracker rows leaves the tracker stale — and the next session
 * re-issues the same IDs. This script treats BOTH the tracker and the packet
 * folders on disk as ID sources, so an unregistered folder can never cause a
 * collision.
 *
 * Usage:
 *   node scripts/next-job-id.js            Print the next safe J-ID (and any drift warnings)
 *   node scripts/next-job-id.js --check    Drift check only; exit 1 if any packet folder
 *                                          is missing its Job-Tracker.md row
 *   node scripts/next-job-id.js --json     Machine-readable output
 *   node scripts/next-job-id.js --root <dir>  Use a different private workspace
 *                                             (default: .local-user under the repo root)
 *
 * Drift rules:
 *   - Folder without a tracker row  = ERROR (this is the collision hazard).
 *   - Tracker row without a folder  = warning only (legitimate for roles that were
 *     tracked without a packet, or whose packet was deliberately removed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PACKET_DIRS = ['_Active', '_Potential', '_Archive'];
const TRACKER_FILE = 'Job-Tracker.md';

function parseArgs(argv) {
  const args = { check: false, json: false, root: null };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.check = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--root') args.root = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write(fs.readFileSync(__filename, 'utf8').split('*/')[0] + '*/\n');
      process.exit(0);
    } else {
      process.stderr.write(`Unknown argument: ${arg}\n`);
      process.exit(2);
    }
  }
  return args;
}

function idNumber(id) {
  return Number.parseInt(id.replace(/^J-0*/i, ''), 10);
}

function normalizeId(rawNumber) {
  return `J-${String(rawNumber).padStart(2, '0')}`;
}

/** Collect J-IDs from tracker table rows, including struck-through (~~J-XX~~) closed rows. */
function readTrackerIds(trackerPath) {
  if (!fs.existsSync(trackerPath)) return null;
  const ids = new Map(); // number -> raw line snippet for messages
  const lines = fs.readFileSync(trackerPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line.trimStart().startsWith('|')) continue;
    const cell = line.split('|')[1];
    if (!cell) continue;
    const match = cell.match(/J-(\d+)/i);
    if (match) {
      const num = Number.parseInt(match[1], 10);
      if (!ids.has(num)) ids.set(num, line.trim().slice(0, 100));
    }
  }
  return ids;
}

/** Collect J-IDs from packet folder names across _Active/_Potential/_Archive. */
function readFolderIds(rootDir) {
  const ids = new Map(); // number -> { dir, name }
  for (const bucket of PACKET_DIRS) {
    const dirPath = path.join(rootDir, bucket);
    if (!fs.existsSync(dirPath)) continue;
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(/^J-(\d+)\b/i);
      if (!match) continue;
      const num = Number.parseInt(match[1], 10);
      if (!ids.has(num)) ids.set(num, { bucket, name: entry.name });
      else ids.get(num).duplicate = `${bucket}/${entry.name}`;
    }
  }
  return ids;
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, '..');
  const rootDir = args.root ? path.resolve(args.root) : path.join(repoRoot, '.local-user');

  if (!fs.existsSync(rootDir)) {
    process.stderr.write(
      `Private workspace not found: ${rootDir}\n` +
      'Create .local-user/ first (see local-user-template/README.md) or pass --root <dir>.\n'
    );
    process.exit(2);
  }

  const trackerPath = path.join(rootDir, TRACKER_FILE);
  const trackerIds = readTrackerIds(trackerPath);
  const folderIds = readFolderIds(rootDir);
  const trackerMissing = trackerIds === null;

  const trackerMax = trackerIds && trackerIds.size ? Math.max(...trackerIds.keys()) : 0;
  const folderMax = folderIds.size ? Math.max(...folderIds.keys()) : 0;
  const nextNumber = Math.max(trackerMax, folderMax) + 1;

  const foldersMissingRows = [];
  const rowsMissingFolders = [];
  const duplicateFolders = [];

  if (trackerIds) {
    for (const [num, info] of folderIds) {
      if (!trackerIds.has(num)) foldersMissingRows.push(`${normalizeId(num)} (${info.bucket}/${info.name})`);
      if (info.duplicate) duplicateFolders.push(`${normalizeId(num)}: ${info.bucket}/${info.name} AND ${info.duplicate}`);
    }
    for (const num of trackerIds.keys()) {
      if (!folderIds.has(num)) rowsMissingFolders.push(normalizeId(num));
    }
  }

  const failureReasons = [];
  if (trackerMissing) {
    failureReasons.push({
      code: 'tracker_missing',
      message: `${TRACKER_FILE} is missing; tracker/folder consistency cannot be verified.`,
    });
  }
  if (foldersMissingRows.length) {
    failureReasons.push({
      code: 'folders_missing_tracker_rows',
      message: `${foldersMissingRows.length} packet folder(s) have no tracker row.`,
    });
  }
  if (duplicateFolders.length) {
    failureReasons.push({
      code: 'duplicate_folder_ids',
      message: `${duplicateFolders.length} duplicate packet folder ID(s) were found.`,
    });
  }
  const checkPassed = failureReasons.length === 0;

  if (args.json) {
    process.stdout.write(JSON.stringify({
      nextId: normalizeId(nextNumber),
      trackerMax: trackerMax ? normalizeId(trackerMax) : null,
      folderMax: folderMax ? normalizeId(folderMax) : null,
      trackerFound: Boolean(trackerIds),
      checkPassed,
      failureReasons,
      foldersMissingTrackerRows: foldersMissingRows,
      trackerRowsWithoutFolders: rowsMissingFolders,
      duplicateFolderIds: duplicateFolders,
    }, null, 2) + '\n');
  } else {
    if (!args.check) {
      process.stdout.write(`Next safe job ID: ${normalizeId(nextNumber)}\n`);
      process.stdout.write(`  Tracker max: ${trackerMax ? normalizeId(trackerMax) : '(no tracker rows found)'}`
        + `   Folder max: ${folderMax ? normalizeId(folderMax) : '(no packet folders found)'}\n`);
    }
    if (trackerMissing) {
      if (args.check) {
        process.stdout.write(
          `ERROR — ${TRACKER_FILE} is missing at ${trackerPath}; drift cannot be verified.\n` +
          'Restore or initialize the tracker, then run the check again.\n'
        );
      } else {
        process.stdout.write(`NOTE: no ${TRACKER_FILE} found at ${trackerPath} — drift check skipped.\n`);
      }
    }
    if (duplicateFolders.length) {
      process.stdout.write('\nERROR — duplicate folder IDs (two packets share one J-ID):\n');
      for (const item of duplicateFolders) process.stdout.write(`  - ${item}\n`);
    }
    if (foldersMissingRows.length) {
      process.stdout.write('\nERROR — packet folders with no Job-Tracker.md row (collision hazard; add rows now):\n');
      for (const item of foldersMissingRows) process.stdout.write(`  - ${item}\n`);
    }
    if (rowsMissingFolders.length) {
      process.stdout.write('\nWarning — tracker rows with no packet folder (fine if intentional):\n');
      process.stdout.write(`  ${rowsMissingFolders.join(', ')}\n`);
    }
    if (trackerIds && !foldersMissingRows.length && !duplicateFolders.length) {
      process.stdout.write('Drift check: OK — every packet folder has a tracker row.\n');
    }
  }

  if (args.check && !checkPassed) process.exit(1);
}

main();
