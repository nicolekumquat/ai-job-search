#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  classifyPostingEvidence,
  confirmPostingClosures,
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
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: 'This job is no longer available. Explore other open roles.',
    originalUrl: 'https://example.com/jobs/123',
    finalUrl: 'https://example.com/jobs',
    jobTitle: 'Senior Product Manager',
  }).outcome, 'inconclusive');

  const liveJobText = [
    'Senior Product Manager',
    'Build products for customers and collaborate across engineering, design, operations, and go-to-market teams. '.repeat(8),
  ].join(' ');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: `${liveJobText} Similar jobs: Staff Product Manager (this position has been filled).`,
    jobTitle: 'Senior Product Manager',
  }).outcome, 'live');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: `${liveJobText} If a posting is no longer available, contact accommodations@example.com.`,
    jobTitle: 'Senior Product Manager',
  }).outcome, 'live');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: `Search results for Senior Product Manager. ${'Open opportunities and search filters. '.repeat(18)} A different job: this job posting has expired.`,
    jobTitle: 'Senior Product Manager',
  }).outcome, 'live');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: `${liveJobText} Frequently asked questions about applications, accounts, and candidate support.`,
    jobTitle: 'Senior Product Manager',
  }).outcome, 'live');
  assert.equal(classifyPostingEvidence({
    status: 200,
    text: `${'Employer careers information. '.repeat(20)} This position has been filled.`,
    jobTitle: 'Senior Product Manager',
  }).outcome, 'closed');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'job-posting-refresh-'));
  try {
    const localRoot = path.join(tempRoot, '.local-user');
    const activeRoot = path.join(localRoot, '_Active');
    fs.mkdirSync(path.join(activeRoot, 'J-01-Closed-Co-Role'), { recursive: true });
    fs.mkdirSync(path.join(activeRoot, 'J-02-Blocked-Co-Role'), { recursive: true });
    fs.mkdirSync(path.join(activeRoot, 'J-04-Second-Closed-Co-Role'), { recursive: true });
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
      path.join(labeledUrlFolder, '01-Job-Description.md'),
      [
        '# No official URL label',
        '',
        '**Company:** https://www.acme.com',
        '**Glassdoor:** https://glassdoor.example/acme',
        '**Source:** https://www.linkedin.com/jobs/view/123',
        '**Apply:** https://acme.wd1.myworkdayjobs.com/careers/job/Senior-PM_R-1234',
      ].join('\n'),
    );
    assert.equal(findJobUrl(labeledUrlFolder), null);
    fs.writeFileSync(
      path.join(activeRoot, 'J-01-Closed-Co-Role', '01-Job-Description.md'),
      '# Role — Closed Co\n\n**Official Job URL:** https://example.com/jobs/closed\n',
    );
    fs.writeFileSync(
      path.join(activeRoot, 'J-02-Blocked-Co-Role', '01-Job-Description.md'),
      '# Role — Blocked Co\n\n**Official Job URL:** https://example.com/jobs/blocked\n',
    );
    fs.writeFileSync(
      path.join(activeRoot, 'J-04-Second-Closed-Co-Role', '01-Job-Description.md'),
      '# Role — Second Closed Co\n\n**Official Job URL:** https://example.com/jobs/second-closed\n',
    );
    fs.writeFileSync(
      path.join(localRoot, 'Job-Tracker.md'),
      [
        '| ID | Company | Role | Status | Last Action | Last Updated | Applied Date | Rubric Score | Interview Stage |',
        '|---|---|---|---|---|---|---|---|---|',
        '| J-01 | Closed Co | Role | Applied | Application sent | 2026-07-01 | 2026-07-01 | 90% | Waiting |',
        '| J-02 | Blocked Co | Role | Applied | Application sent | 2026-07-02 | 2026-07-02 | 90% | Waiting |',
        '| J-03 | URL Preference | Role | Applied | Application sent | 2026-07-03 | 2026-07-03 | 90% | Waiting |',
        '| J-04 | Second Closed Co | Role | Applied | Application sent | 2026-07-04 | 2026-07-04 | 90% | Waiting |',
      ].join('\n'),
    );

    const result = await refreshAppliedPostings({
      repoRoot: tempRoot,
      checkedDate: '2026-07-24',
      inspectPosting: async (url) => /\/(?:closed|second-closed)$/.test(url)
        ? { outcome: 'closed', reason: 'Employer/ATS returned HTTP 404', status: 404 }
        : { outcome: 'inconclusive', reason: 'HTTP 403 is not closure evidence', status: 403 },
    });

    assert.equal(result.closed.length, 2);
    assert.equal(result.inconclusive.length, 1);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].id, 'J-03');
    assert.match(result.skipped[0].reason, /No labelled Official Job URL/);
    assert.equal(result.proposalOnly, true);
    assert.ok(fs.existsSync(path.join(activeRoot, 'J-01-Closed-Co-Role')));
    assert.ok(fs.existsSync(path.join(activeRoot, 'J-04-Second-Closed-Co-Role')));
    let tracker = fs.readFileSync(path.join(localRoot, 'Job-Tracker.md'), 'utf8');
    assert.match(tracker, /\| J-01 \| Closed Co \| Role \| Applied \|/);

    const confirmation = confirmPostingClosures({
      repoRoot: tempRoot,
      checkedDate: '2026-07-24',
      confirmedIds: ['J-01'],
      closedResults: result.closed,
    });
    assert.equal(confirmation.confirmed, 1);
    assert.equal(confirmation.closed.length, 1);
    assert.ok(fs.existsSync(path.join(localRoot, '_Archive', 'J-01-Closed-Co-Role')));
    assert.ok(!fs.existsSync(path.join(activeRoot, 'J-01-Closed-Co-Role')));
    assert.ok(fs.existsSync(path.join(activeRoot, 'J-02-Blocked-Co-Role')));
    assert.ok(fs.existsSync(path.join(activeRoot, 'J-04-Second-Closed-Co-Role')));
    tracker = fs.readFileSync(path.join(localRoot, 'Job-Tracker.md'), 'utf8');
    assert.match(tracker, /\| J-01 \| Closed Co \| Role \| Closed - posting closed \|/);
    assert.match(tracker, /\| 2026-07-24 \| 2026-07-01 \| 90% \| Closed \|/);
    assert.match(tracker, /\| J-02 \| Blocked Co \| Role \| Applied \|/);
    assert.match(tracker, /\| J-04 \| Second Closed Co \| Role \| Applied \|/);
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
