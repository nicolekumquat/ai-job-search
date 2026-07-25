#!/usr/bin/env node

'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const scriptPath = path.join(__dirname, 'create-job-folders.js');
const allocatorPath = path.join(__dirname, 'next-job-id.js');

function runCommand(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' });
}

function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'create-job-folders-test-'));
  try {
    for (const bucket of ['_Active', '_Potential', '_Archive']) {
      fs.mkdirSync(path.join(root, bucket));
    }
    fs.writeFileSync(
      path.join(root, 'Job-Tracker.md'),
      [
        '# Job Tracker',
        '',
        '| ID | Company | Role | Status | Last Action | Date | Rubric Score | Interview Stage |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '',
      ].join('\n'),
      'utf8',
    );

    const inputPath = path.join(root, 'linkedin-jd-results.json');
    fs.writeFileSync(
      inputPath,
      JSON.stringify([
        {
          company: 'First Corp',
          title: 'Product Manager',
          url: 'https://careers.example.com/jobs/one',
          location: 'Remote',
          description: 'First description.',
        },
        {
          company: 'Second Corp',
          title: 'Program Manager',
          url: 'https://careers.example.com/jobs/two?utm_source=linkedin',
          description: 'Second description.',
        },
      ]),
      'utf8',
    );

    const args = ['--input', inputPath, '--root', root, '--bucket', 'active'];
    const first = runCommand(args);
    assert.equal(first.status, 0, first.stdout || first.stderr);
    assert.match(first.stdout, /Registered 2 job packet\(s\)\. 0 duplicate\(s\) skipped\./);

    const second = runCommand(args);
    assert.equal(second.status, 0, second.stdout || second.stderr);
    assert.match(second.stdout, /Registered 0 job packet\(s\)\. 2 duplicate\(s\) skipped\./);

    const tracker = fs.readFileSync(path.join(root, 'Job-Tracker.md'), 'utf8');
    assert.equal((tracker.match(/\| J-\d+/g) || []).length, 2);
    assert.equal(
      fs.readdirSync(path.join(root, '_Active'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory()).length,
      2,
    );

    const check = spawnSync(
      process.execPath,
      [allocatorPath, '--root', root, '--check'],
      { encoding: 'utf8' },
    );
    assert.equal(check.status, 0, check.stdout || check.stderr);
    assert.ok(!fs.existsSync(path.join(root, '.job-registration.lock')));
  } finally {
    const resolvedRoot = path.resolve(root);
    const resolvedTemp = path.resolve(os.tmpdir());
    if (!resolvedRoot.startsWith(`${resolvedTemp}${path.sep}`)) {
      throw new Error(`Refusing to remove unexpected test path: ${resolvedRoot}`);
    }
    fs.rmSync(resolvedRoot, { recursive: true, force: true });
  }

  console.log('create-job-folders tests passed');
}

run();
