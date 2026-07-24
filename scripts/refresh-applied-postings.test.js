#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  classifyPostingEvidence,
  findJobUrl,
  refreshAppliedPostings,
} = require('./refresh-applied-postings');

async function run() {
  assert.equal(classifyPostingEvidence({ status: 404 }).outcome, 'closed');
  assert.equal(classifyPostingEvidence({ status: 410 }).outcome, 'closed');
  assert.equal(classifyPostingEvidence({ status: 403 }).outcome, 'inconclusive');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: 'Thank you for visiting. This job is no longer available.',
  }).outcome, 'closed');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: 'Access denied. Verify you are human before continuing.',
  }).outcome, 'inconclusive');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: 'Open role with responsibilities, qualifications, benefits, location, and application instructions.',
    originalUrl: 'https://example.com/jobs/123',
    finalUrl: 'https://example.com/jobs/123',
  }).outcome, 'live');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: 'Explore our company careers and find your next opportunity with our growing team.',
    originalUrl: 'https://example.com/jobs/123',
    finalUrl: 'https://example.com/jobs',
  }).outcome, 'inconclusive');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'job-posting-refresh-'));
  try {
    const localRoot = path.join(tempRoot, '.local-user');
    const activeRoot = path.join(localRoot, '_Active');
    fs.mkdirSync(path.join(activeRoot, 'J-01-Closed-Co-Role'), { recursive: true });
    fs.mkdirSync(path.join(activeRoot, 'J-02-Blocked-Co-Role'), { recursive: true });
    const labeledUrlFolder = path.join(activeRoot, 'J-03-URL-Preference');
    fs.mkdirSync(labeledUrlFolder, { recursive: true });
    fs.writeFileSync(
      path.join(labeledUrlFolder, '01-Job-Description.md'),
      [
        '# URL preference',
        '',
        '**Source:** https://www.linkedin.com/jobs/view/123',
        '**Official Job URL:** https://careers.example.com/jobs/456',
      ].join('\n'),
    );
    assert.equal(findJobUrl(labeledUrlFolder), 'https://careers.example.com/jobs/456');
    fs.writeFileSync(
      path.join(activeRoot, 'J-01-Closed-Co-Role', '01-Job-Description.md'),
      '# Role — Closed Co\n\n- Source: https://example.com/jobs/closed\n',
    );
    fs.writeFileSync(
      path.join(activeRoot, 'J-02-Blocked-Co-Role', '01-Job-Description.md'),
      '# Role — Blocked Co\n\n- Source: https://example.com/jobs/blocked\n',
    );
    fs.writeFileSync(
      path.join(localRoot, 'Job-Tracker.md'),
      [
        '| ID | Company | Role | Status | Last Action | Last Updated | Applied Date | Rubric Score | Interview Stage |',
        '|---|---|---|---|---|---|---|---|---|',
        '| J-01 | Closed Co | Role | Applied | Application sent | 2026-07-01 | 2026-07-01 | 90% | Waiting |',
        '| J-02 | Blocked Co | Role | Applied | Application sent | 2026-07-02 | 2026-07-02 | 90% | Waiting |',
      ].join('\n'),
    );

    const result = await refreshAppliedPostings({
      repoRoot: tempRoot,
      checkedDate: '2026-07-24',
      inspectPosting: async (url) => url.endsWith('/closed')
        ? { outcome: 'closed', reason: 'Employer/ATS returned HTTP 404', status: 404 }
        : { outcome: 'inconclusive', reason: 'HTTP 403 is not closure evidence', status: 403 },
    });

    assert.equal(result.closed.length, 1);
    assert.equal(result.inconclusive.length, 1);
    assert.ok(fs.existsSync(path.join(localRoot, '_Archive', 'J-01-Closed-Co-Role')));
    assert.ok(!fs.existsSync(path.join(activeRoot, 'J-01-Closed-Co-Role')));
    assert.ok(fs.existsSync(path.join(activeRoot, 'J-02-Blocked-Co-Role')));
    const tracker = fs.readFileSync(path.join(localRoot, 'Job-Tracker.md'), 'utf8');
    assert.match(tracker, /\| J-01 \| Closed Co \| Role \| Closed - posting closed \|/);
    assert.match(tracker, /\| 2026-07-24 \| 2026-07-01 \| 90% \| Closed \|/);
    assert.match(tracker, /\| J-02 \| Blocked Co \| Role \| Applied \|/);
  } finally {
    const resolvedTemp = path.resolve(tempRoot);
    const resolvedOsTemp = path.resolve(os.tmpdir());
    if (!resolvedTemp.startsWith(`${resolvedOsTemp}${path.sep}`)) {
      throw new Error(`Refusing to remove unexpected test path: ${resolvedTemp}`);
    }
    fs.rmSync(resolvedTemp, { recursive: true, force: true });
  }

  console.log('refresh-applied-postings tests passed');
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
