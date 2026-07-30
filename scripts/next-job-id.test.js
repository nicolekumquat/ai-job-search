#!/usr/bin/env node

'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const scriptPath = path.join(__dirname, 'next-job-id.js');

function runCheck(root, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [scriptPath, '--root', root, '--check', ...extraArgs],
    { encoding: 'utf8' },
  );
}

function createPacket(root, bucket, folderName) {
  fs.mkdirSync(path.join(root, bucket, folderName), { recursive: true });
}

function writeTracker(root, rows = []) {
  fs.writeFileSync(
    path.join(root, 'Job-Tracker.md'),
    [
      '# Job Tracker',
      '',
      '| ID | Company | Role | Status |',
      '|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
    'utf8',
  );
}

function withWorkspace(test) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'next-job-id-test-'));
  try {
    test(root);
  } finally {
    const resolvedRoot = path.resolve(root);
    const resolvedTemp = path.resolve(os.tmpdir());
    if (!resolvedRoot.startsWith(`${resolvedTemp}${path.sep}`)) {
      throw new Error(`Refusing to remove unexpected test path: ${resolvedRoot}`);
    }
    fs.rmSync(resolvedRoot, { recursive: true, force: true });
  }
}

function run() {
  withWorkspace((root) => {
    createPacket(root, '_Active', 'J-01-Example');
    const result = runCheck(root);
    assert.equal(result.status, 1, 'missing tracker must fail --check');
    assert.match(result.stdout, /ERROR.*Job-Tracker\.md.*missing/i);
  });

  withWorkspace((root) => {
    const result = runCheck(root);
    assert.equal(result.status, 1, 'a missing tracker must fail even before packets are created');
  });

  withWorkspace((root) => {
    createPacket(root, '_Active', 'J-01-Example');
    const result = runCheck(root, ['--json']);
    assert.equal(result.status, 1, 'missing tracker must fail JSON --check');
    const output = JSON.parse(result.stdout);
    assert.equal(output.trackerFound, false);
    assert.equal(output.checkPassed, false);
    assert.ok(
      output.failureReasons.some((reason) => reason.code === 'tracker_missing'),
      'JSON output must include tracker_missing as a failure reason',
    );
  });

  withWorkspace((root) => {
    writeTracker(root);
    createPacket(root, '_Active', 'J-01-Example');
    const result = runCheck(root);
    assert.equal(result.status, 1, 'an empty tracker with packet folders must fail');
    assert.match(result.stdout, /packet folders with no Job-Tracker\.md row/i);
  });

  withWorkspace((root) => {
    writeTracker(root, ['| J-01 | Example | Product Manager | Applied |']);
    createPacket(root, '_Active', 'J-01-Example');
    const result = runCheck(root);
    assert.equal(result.status, 0, 'a matching tracker and packet folder must pass');
    assert.match(result.stdout, /Drift check: OK/i);
  });

  withWorkspace((root) => {
    writeTracker(root);
    const result = runCheck(root);
    assert.equal(result.status, 0, 'a new workspace with an empty tracker and no packets must pass');
  });

  console.log('next-job-id tests passed');
}

run();
