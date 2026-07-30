#!/usr/bin/env node

'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerJob } = require('./register-job');

const allocatorPath = path.join(__dirname, 'next-job-id.js');

function writeTracker(root, header = [
  'ID',
  'Company',
  'Role',
  'Status',
  'Last Action',
  'Last Updated',
  'Applied Date',
  'Rubric Score',
  'Interview Stage',
]) {
  fs.writeFileSync(
    path.join(root, 'Job-Tracker.md'),
    [
      '# Job Tracker',
      '',
      `| ${header.join(' | ')} |`,
      `| ${header.map(() => '---').join(' | ')} |`,
      '',
    ].join('\n'),
    'utf8',
  );
}

function withWorkspace(test) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'register-job-test-'));
  fs.mkdirSync(path.join(root, '_Active'));
  fs.mkdirSync(path.join(root, '_Potential'));
  fs.mkdirSync(path.join(root, '_Archive'));
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

function baseOptions(root) {
  return {
    rootDir: root,
    company: 'Example Corp',
    role: 'Senior Product Manager',
    url: 'https://careers.example.com/jobs/123',
    date: '2026-07-24',
  };
}

function assertDriftCheckPasses(root) {
  const result = spawnSync(
    process.execPath,
    [allocatorPath, '--root', root, '--check'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout || result.stderr);
}

function run() {
  withWorkspace((root) => {
    writeTracker(root);
    const result = registerJob({
      ...baseOptions(root),
      bucket: 'active',
      status: 'Applied',
      description: 'A fictional role used by the regression test.',
    });

    assert.equal(result.id, 'J-01');
    assert.equal(result.bucket, '_Active');
    const folder = path.join(root, result.folder);
    assert.ok(fs.existsSync(path.join(folder, '01-Job-Description.md')));
    const description = fs.readFileSync(path.join(folder, '01-Job-Description.md'), 'utf8');
    assert.match(description, /\*\*Job URL:\*\* https:\/\/careers\.example\.com\/jobs\/123/);
    assert.match(description, /fictional role used by the regression test/);

    const tracker = fs.readFileSync(path.join(root, 'Job-Tracker.md'), 'utf8');
    assert.match(
      tracker,
      /\| J-01 \| Example Corp \| Senior Product Manager \| Applied \| Registered job packet \| 2026-07-24 \| 2026-07-24 \| — \| Waiting \|/,
    );
    assert.ok(!fs.existsSync(path.join(root, '.job-registration.lock')));
    assertDriftCheckPasses(root);

    assert.throws(
      () => registerJob({
        ...baseOptions(root),
        url: 'https://careers.example.com/jobs/123?utm_source=linkedin&gh_src=campaign',
      }),
      (error) => error.code === 'DUPLICATE_JOB_URL' &&
        /already registered in _Active\/J-01-/i.test(error.message),
    );
    assert.equal(
      (fs.readFileSync(path.join(root, 'Job-Tracker.md'), 'utf8').match(/\| J-\d+/g) || []).length,
      1,
    );

    const second = registerJob({
      ...baseOptions(root),
      company: 'Second Corp',
      role: 'Technical Program Manager',
      url: 'https://careers.example.com/jobs/456',
      bucket: 'potential',
    });
    assert.equal(second.id, 'J-02');
    assert.equal(second.bucket, '_Potential');
    assertDriftCheckPasses(root);
  });

  withWorkspace((root) => {
    writeTracker(root, [
      'ID',
      'Company',
      'Role',
      'Level',
      'Status',
      'Last Action',
      'Date',
      'Rubric Score',
      'Interview Stage',
    ]);
    const result = registerJob({
      ...baseOptions(root),
      level: 'Senior',
      bucket: 'potential',
    });
    const tracker = fs.readFileSync(path.join(root, 'Job-Tracker.md'), 'utf8');
    assert.match(
      tracker,
      new RegExp(`\\| ${result.id} \\| Example Corp \\| Senior Product Manager \\| Senior \\| Potential \\|`),
    );
  });

  withWorkspace((root) => {
    writeTracker(root);
    fs.mkdirSync(path.join(root, '_Active', 'J-05-Unregistered'));
    const before = fs.readFileSync(path.join(root, 'Job-Tracker.md'), 'utf8');
    assert.throws(
      () => registerJob(baseOptions(root)),
      /blocked until the workspace is repaired/i,
    );
    assert.equal(fs.readFileSync(path.join(root, 'Job-Tracker.md'), 'utf8'), before);
    assert.ok(!fs.existsSync(path.join(root, '_Potential', 'J-06-Example-Corp-Senior-Product-Manager')));
    assert.ok(!fs.existsSync(path.join(root, '.job-registration.lock')));
  });

  withWorkspace((root) => {
    assert.throws(
      () => registerJob(baseOptions(root)),
      /Job-Tracker\.md is missing/i,
    );
    assert.ok(!fs.existsSync(path.join(root, '.job-registration.lock')));
  });

  withWorkspace((root) => {
    writeTracker(root);
    const before = fs.readFileSync(path.join(root, 'Job-Tracker.md'), 'utf8');
    const result = registerJob({ ...baseOptions(root), dryRun: true });
    assert.equal(result.dryRun, true);
    assert.equal(fs.readFileSync(path.join(root, 'Job-Tracker.md'), 'utf8'), before);
    assert.ok(!fs.existsSync(path.join(root, result.folder)));
  });

  withWorkspace((root) => {
    writeTracker(root);
    const trackerPath = path.join(root, 'Job-Tracker.md');
    const before = fs.readFileSync(trackerPath, 'utf8');
    const originalWrite = fs.writeFileSync;
    let simulated = false;
    fs.writeFileSync = (target, ...args) => {
      if (!simulated && typeof target === 'string' && path.resolve(target) === trackerPath) {
        simulated = true;
        throw new Error('Simulated tracker write failure');
      }
      return originalWrite(target, ...args);
    };
    try {
      assert.throws(
        () => registerJob({ ...baseOptions(root), bucket: 'active' }),
        /Simulated tracker write failure/,
      );
    } finally {
      fs.writeFileSync = originalWrite;
    }
    assert.equal(fs.readFileSync(trackerPath, 'utf8'), before);
    assert.equal(fs.readdirSync(path.join(root, '_Active')).length, 0);
    assert.ok(!fs.existsSync(path.join(root, '.job-registration.lock')));
  });

  console.log('register-job tests passed');
}

run();
