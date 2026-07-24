#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const defaultRepoRoot = path.resolve(__dirname, '..');
const navigationTimeoutMs = 25000;
const concurrency = 4;

const closedPatterns = [
  /\b(?:this|the)\s+(?:job|position|posting)\s+(?:is|has been)\s+(?:no longer available|closed|filled|removed|expired)\b/i,
  /\b(?:job|position|posting)\s+(?:is\s+)?no longer available\b/i,
  /\b(?:job|position|posting)\s+has been (?:closed|filled|removed|expired)\b/i,
  /\bno longer accepting applications\b/i,
  /\bapplications? (?:are|is) (?:now )?closed\b/i,
  /\bthis job posting has expired\b/i,
  /\bjob not found\b/i,
  /\bwe (?:could not|couldn't|cannot|can't) find (?:the|this) (?:job|position|posting)\b/i,
  /\bthe job you (?:were|are) looking for (?:is )?no longer available\b/i,
];

const blockedPatterns = [
  /\baccess denied\b/i,
  /\bverify (?:that )?you are human\b/i,
  /\bjust a moment\b/i,
  /\bcaptcha\b/i,
  /\btemporarily unavailable\b/i,
  /\btoo many requests\b/i,
  /\benable javascript and cookies\b/i,
  /\brequest (?:was )?unsuccessful\b/i,
  /\bsecurity check\b/i,
];

function cleanCell(value) {
  return value
    .replace(/~~/g, '')
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .trim();
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTracker(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^\|\s*ID\s*\|\s*Company\s*\|/i.test(line));
  if (headerIndex === -1) {
    throw new Error('Could not find the job tracker table headed by "ID" and "Company".');
  }
  const headers = lines[headerIndex]
    .trim()
    .slice(1, -1)
    .split('|')
    .map((header) => cleanCell(header).toLowerCase());
  const column = (...names) => {
    for (const name of names) {
      const index = headers.indexOf(name.toLowerCase());
      if (index !== -1) return index;
    }
    return -1;
  };
  const columns = {
    id: column('ID'),
    company: column('Company'),
    role: column('Role'),
    status: column('Status'),
    lastAction: column('Last Action'),
    date: column('Last Updated', 'Date'),
    appliedDate: column('Applied Date'),
    rubricScore: column('Rubric Score'),
    interviewStage: column('Interview Stage'),
  };
  const required = ['id', 'company', 'role', 'status', 'lastAction', 'date', 'interviewStage'];
  const missing = required.filter((name) => columns[name] === -1);
  if (missing.length) {
    throw new Error(`Job tracker is missing posting-refresh columns: ${missing.join(', ')}.`);
  }
  const rows = [];

  lines.slice(headerIndex + 2).forEach((line, offset) => {
    const lineIndex = headerIndex + 2 + offset;
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) return;
    const rawCells = trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
    const cells = rawCells.map(cleanCell);
    const value = (name) => columns[name] === -1 ? '' : (cells[columns[name]] || '');
    if (!/^J-\d+$/i.test(value('id'))) return;
    rows.push({
      lineIndex,
      rawCells,
      columns,
      id: value('id'),
      company: value('company'),
      role: value('role'),
      status: value('status'),
      appliedDate: value('appliedDate'),
    });
  });

  return { lines, rows };
}

function findActiveFolder(localRoot, id) {
  const activeRoot = path.join(localRoot, '_Active');
  if (!fs.existsSync(activeRoot)) return null;
  const matches = fs.readdirSync(activeRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().startsWith(`${id.toLowerCase()}-`))
    .map((entry) => path.join(activeRoot, entry.name));
  return matches.length === 1 ? matches[0] : null;
}

function findJobUrl(folder) {
  if (!folder) return null;
  const descriptionPath = path.join(folder, '01-Job-Description.md');
  if (!fs.existsSync(descriptionPath)) return null;
  const source = fs.readFileSync(descriptionPath, 'utf8');
  const labeledUrl = source.match(
    /(?:official\s+(?:job|posting)\s+url|employer\/ats\s+url)\s*:\s*(https?:\/\/[^\s)\]`]+)/i,
  );
  if (labeledUrl) return labeledUrl[1].replace(/[.,;:]+$/g, '');
  const urls = [...source.matchAll(/https?:\/\/[^\s)\]`]+/g)]
    .map((match) => match[0].replace(/[.,;:]+$/g, ''));
  return urls.find((url) => !/linkedin\.com\/jobs/i.test(url)) || urls[0] || null;
}

function isGenericRedirect(originalUrl, finalUrl) {
  if (!originalUrl || !finalUrl || originalUrl === finalUrl) return false;
  try {
    const original = new URL(originalUrl);
    const final = new URL(finalUrl);
    const finalPath = final.pathname.replace(/\/+$/, '').toLowerCase() || '/';
    const genericPaths = [
      '/',
      '/careers',
      '/careers/home',
      '/jobs',
      '/jobs/search',
      '/search',
      '/job-search',
    ];
    return original.pathname !== final.pathname && genericPaths.includes(finalPath);
  } catch {
    return false;
  }
}

function classifyPostingEvidence({ status, text, originalUrl, finalUrl, error }) {
  if (error) {
    return { outcome: 'inconclusive', reason: error };
  }
  if (status === 404 || status === 410) {
    return { outcome: 'closed', reason: `Employer/ATS returned HTTP ${status}` };
  }
  if (status === 401 || status === 403 || status === 429 || status >= 500) {
    return { outcome: 'inconclusive', reason: `HTTP ${status} is not closure evidence` };
  }

  const normalizedText = String(text || '').replace(/\s+/g, ' ').trim();
  const blockedMatch = blockedPatterns.find((pattern) => pattern.test(normalizedText));
  if (blockedMatch) {
    return { outcome: 'inconclusive', reason: `Access or verification page detected: “${normalizedText.match(blockedMatch)[0]}”` };
  }
  const closedMatch = closedPatterns.find((pattern) => pattern.test(normalizedText));
  if (closedMatch) {
    return { outcome: 'closed', reason: `Employer/ATS page says: “${normalizedText.match(closedMatch)[0]}”` };
  }
  if (isGenericRedirect(originalUrl, finalUrl)) {
    return { outcome: 'inconclusive', reason: `Posting redirected to a generic page: ${finalUrl}` };
  }
  if (!status || status < 200 || status >= 400) {
    return { outcome: 'inconclusive', reason: `Unexpected HTTP status: ${status || 'none'}` };
  }
  if (normalizedText.length < 80) {
    return { outcome: 'inconclusive', reason: 'Page returned too little readable content to verify' };
  }
  return { outcome: 'live', reason: `Posting page loaded successfully (HTTP ${status})` };
}

async function createBrowserInspector() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (chromiumError) {
    if (process.platform !== 'win32') {
      throw new Error(`Could not launch Playwright Chromium. Run "npx playwright install chromium". ${chromiumError.message}`);
    }
    try {
      browser = await chromium.launch({ channel: 'msedge', headless: true });
    } catch {
      throw new Error(`Could not launch Playwright Chromium or Microsoft Edge. Run "npx playwright install chromium". ${chromiumError.message}`);
    }
  }
  const context = await browser.newContext();
  await context.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'media', 'font'].includes(resourceType)) route.abort();
    else route.continue();
  });

  return {
    async inspect(url) {
      const page = await context.newPage();
      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: navigationTimeoutMs,
        });
        await page.waitForTimeout(750);
        const status = response ? response.status() : 0;
        const finalUrl = page.url();
        const text = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
        return {
          ...classifyPostingEvidence({ status, text, originalUrl: url, finalUrl }),
          status,
          finalUrl,
        };
      } catch (error) {
        return {
          ...classifyPostingEvidence({
            originalUrl: url,
            finalUrl: page.url(),
            error: error.message.split('\n')[0],
          }),
          status: 0,
          finalUrl: page.url(),
        };
      } finally {
        await page.close();
      }
    },
    close: () => browser.close(),
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function assertInside(parent, target) {
  const relative = path.relative(parent, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the expected workspace: ${target}`);
  }
}

function archiveConfirmedClosures({ localRoot, trackerPath, tracker, jobs, closedResults, checkedDate }) {
  const archiveRoot = path.join(localRoot, '_Archive');
  fs.mkdirSync(archiveRoot, { recursive: true });
  const changes = [];

  for (const result of closedResults) {
    const job = jobs.find((candidate) => candidate.id === result.id);
    const destination = path.join(archiveRoot, path.basename(job.folder));
    assertInside(path.join(localRoot, '_Active'), job.folder);
    assertInside(archiveRoot, destination);
    if (fs.existsSync(destination)) {
      result.outcome = 'inconclusive';
      result.reason = `Archive destination already exists: ${path.basename(destination)}`;
      continue;
    }
    changes.push({ job, result, destination });
  }

  if (!changes.length) return [];

  const moved = [];
  try {
    for (const change of changes) {
      fs.renameSync(change.job.folder, change.destination);
      moved.push(change);
      const row = change.job.row;
      const cells = [...row.rawCells];
      cells[row.columns.status] = 'Closed - posting closed';
      cells[row.columns.lastAction] = `Official posting confirmed unavailable on ${checkedDate}; no rejection email received. ${change.result.reason}`;
      cells[row.columns.date] = checkedDate;
      cells[row.columns.interviewStage] = 'Closed';
      tracker.lines[row.lineIndex] = `| ${cells.join(' | ')} |`;
    }
    fs.writeFileSync(trackerPath, tracker.lines.join('\n'), 'utf8');
    return moved.map((change) => change.result);
  } catch (error) {
    for (const change of [...moved].reverse()) {
      if (fs.existsSync(change.destination) && !fs.existsSync(change.job.folder)) {
        fs.renameSync(change.destination, change.job.folder);
      }
    }
    throw error;
  }
}

async function refreshAppliedPostings(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || defaultRepoRoot);
  const localRoot = path.join(repoRoot, '.local-user');
  const trackerPath = path.join(localRoot, 'Job-Tracker.md');
  const checkedDate = options.checkedDate || localIsoDate();
  const tracker = parseTracker(fs.readFileSync(trackerPath, 'utf8'));
  const skipped = [];
  const jobs = tracker.rows
    .filter((row) => row.status.toLowerCase() === 'applied')
    .map((row) => {
      const folder = findActiveFolder(localRoot, row.id);
      const url = findJobUrl(folder);
      if (!folder || !url) {
        skipped.push({
          id: row.id,
          company: row.company,
          role: row.role,
          reason: !folder ? 'No unique _Active packet folder found' : 'No official job URL found',
        });
        return null;
      }
      return { id: row.id, company: row.company, role: row.role, folder, url, row };
    })
    .filter(Boolean);

  const browserInspector = options.inspectPosting || jobs.length === 0
    ? null
    : await createBrowserInspector();
  const inspectPosting = options.inspectPosting || ((url) => browserInspector.inspect(url));

  let checked;
  try {
    checked = await mapWithConcurrency(jobs, options.concurrency || concurrency, async (job) => {
      const result = await inspectPosting(job.url, job);
      return {
        id: job.id,
        company: job.company,
        role: job.role,
        url: job.url,
        outcome: result.outcome,
        reason: result.reason,
        status: result.status || 0,
        finalUrl: result.finalUrl || job.url,
      };
    });
  } finally {
    if (browserInspector) await browserInspector.close();
  }

  const detectedClosed = checked.filter((result) => result.outcome === 'closed');
  const changed = options.dryRun
    ? []
    : archiveConfirmedClosures({
      localRoot,
      trackerPath,
      tracker,
      jobs,
      closedResults: detectedClosed,
      checkedDate,
    });
  const changedIds = new Set(changed.map((result) => result.id));
  const closed = checked.filter((result) => changedIds.has(result.id));
  const live = checked.filter((result) => result.outcome === 'live');
  const inconclusive = checked.filter((result) =>
    result.outcome === 'inconclusive' ||
    (result.outcome === 'closed' && !options.dryRun && !changedIds.has(result.id)),
  );

  return {
    checkedAt: new Date().toISOString(),
    checkedDate,
    dryRun: Boolean(options.dryRun),
    totalApplied: tracker.rows.filter((row) => row.status.toLowerCase() === 'applied').length,
    checked: checked.length,
    live,
    closed: options.dryRun ? detectedClosed : closed,
    inconclusive,
    skipped,
  };
}

if (require.main === module) {
  refreshAppliedPostings({ dryRun: process.argv.includes('--dry-run') })
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  classifyPostingEvidence,
  findJobUrl,
  refreshAppliedPostings,
};
