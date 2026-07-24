#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const trackerPath = path.join(repoRoot, '.local-user', 'Job-Tracker.md');
const outputPath = path.join(repoRoot, '.local-user', 'dashboard.html');
const localRoot = path.dirname(trackerPath);
const dashboardConfigPath = path.join(localRoot, 'dashboard-config.json');

function loadDashboardConfig() {
  if (!fs.existsSync(dashboardConfigPath)) return { careerPortalOverrides: {} };
  const config = JSON.parse(fs.readFileSync(dashboardConfigPath, 'utf8'));
  return {
    careerPortalOverrides:
      config.careerPortalOverrides && typeof config.careerPortalOverrides === 'object'
        ? config.careerPortalOverrides
        : {},
  };
}

const { careerPortalOverrides } = loadDashboardConfig();

function cleanMarkdown(value) {
  return value
    .replace(/~~/g, '')
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .trim();
}

function parseTracker(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    /^\|\s*ID\s*\|\s*Company\s*\|/i.test(line),
  );

  if (headerIndex === -1) {
    throw new Error('Could not find the job tracker table headed by "ID" and "Company".');
  }

  const headers = lines[headerIndex]
    .trim()
    .slice(1, -1)
    .split('|')
    .map((header) => cleanMarkdown(header).toLowerCase());
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
  const required = ['id', 'company', 'role', 'status', 'lastAction', 'date', 'rubricScore', 'interviewStage'];
  const missing = required.filter((name) => columns[name] === -1);
  if (missing.length) {
    throw new Error(`Job tracker is missing dashboard columns: ${missing.join(', ')}.`);
  }

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|')) {
      if (/^#{1,2}\s/.test(line) && rows.length > 0) break;
      continue;
    }

    const cells = line
      .slice(1, -1)
      .split('|')
      .map(cleanMarkdown);

    const value = (name) => columns[name] === -1 ? '' : (cells[columns[name]] || '');
    const id = value('id');
    if (!/^J-\d+$/i.test(id)) continue;
    const company = value('company');
    const role = value('role');
    const status = value('status');
    const lastAction = value('lastAction');
    const date = value('date');
    const existingAppliedDate = value('appliedDate');
    const rubricScore = value('rubricScore');
    const interviewStage = value('interviewStage');
    const normalizedStatus = status.toLowerCase();
    const closed = normalizedStatus.startsWith('closed') || interviewStage.toLowerCase().startsWith('closed');
    const folderPath = findJobFolder(id, company);
    const packetExists = Boolean(folderPath);
    const applied =
      !closed &&
      ['applied', 'interviewing', 'offer pending', 'offer received'].includes(normalizedStatus);
    const readyToSubmit = !closed && normalizedStatus === 'active' && packetExists;
    const appliedDate = /^\d{4}-\d{2}-\d{2}$/.test(existingAppliedDate || '')
      ? existingAppliedDate
      : findAppliedDate(folderPath, date);

    const interviewContact = findInterviewContact(lastAction);
    rows.push({
      id,
      company,
      role,
      officialRole: findOfficialJobTitle(folderPath, role, company),
      status,
      lastAction,
      date,
      rubricScore,
      interviewStage,
      interviewContact,
      interviewContactTitle: findInterviewContactTitle(lastAction, interviewContact),
      closed,
      applied,
      readyToSubmit,
      packetExists,
      folderPath,
      appliedDate,
      interviewSchedule: findInterviewSchedule(folderPath),
      interviewPrepPath: findInterviewPrepPath(folderPath),
      interviewMeeting: findInterviewMeeting(folderPath, lastAction),
      jobOpeningUrl: findJobOpeningUrl(folderPath),
      careerLoginUrl: findWorkdayCareerUrl(folderPath, company),
    });
  }

  return reconcileTrackerRows(rows);
}

function trackerRowScore(row) {
  let score = row.packetExists ? 20 : 0;
  if (row.folderPath) {
    const folderName = path.basename(path.resolve(localRoot, row.folderPath)).toLowerCase();
    const companyTerms = row.company
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2);
    score += companyTerms.filter((term) => folderName.includes(term)).length * 20;
  }
  if (!/untracked parallel-session|placeholder|sync needed/i.test(`${row.role} ${row.lastAction} ${row.interviewStage}`)) {
    score += 5;
  }
  if (row.status.toLowerCase() === 'applied' || row.status.toLowerCase() === 'interviewing') {
    score += 3;
  }
  return score;
}

function reconcileTrackerRows(rows) {
  const byId = new Map();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }

    const winner = trackerRowScore(row) >= trackerRowScore(existing) ? row : existing;
    const ignored = winner === row ? existing : row;
    byId.set(row.id, winner);
    console.warn(
      `Dashboard reconciliation: duplicate ${row.id}; using ${winner.company} to match the packet folder and ignoring ${ignored.company}.`,
    );
  }
  return [...byId.values()];
}

function findJobFolder(id, company) {
  const companyTerms = company
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);

  for (const state of ['_Active', '_Archive', '_Potential']) {
    const directory = path.join(localRoot, state);
    if (!fs.existsSync(directory)) continue;

    const folder = fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().startsWith(`${id.toLowerCase()}-`))
      .sort((a, b) => {
        const score = (entry) => companyTerms.filter((term) => entry.name.toLowerCase().includes(term)).length;
        return score(b) - score(a) || a.name.localeCompare(b.name);
      })[0];
    if (!folder) continue;

    return `./${state}/${folder.name}/`;
  }
  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findOfficialJobTitle(folderPath, fallbackRole, company) {
  if (!folderPath) return fallbackRole;

  const descriptionPath = path.join(path.resolve(localRoot, folderPath), '01-Job-Description.md');
  if (!fs.existsSync(descriptionPath)) return fallbackRole;

  const source = fs.readFileSync(descriptionPath, 'utf8');
  const heading = source.match(/^#\s+(.+)$/m);
  if (!heading) return fallbackRole;

  let title = cleanMarkdown(heading[1])
    .replace(/^Job Description\s*(?::|—|–|-)\s*/i, '')
    .trim();
  const companyVariants = [
    company,
    company.split('/')[0].trim(),
    company.replace(/\s*\([^)]*\)\s*/g, '').trim(),
    company.split('(')[0].trim(),
  ]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const variant of [...new Set(companyVariants)]) {
    const escaped = escapeRegExp(variant);
    title = title
      .replace(new RegExp(`^${escaped}\\s*(?::|—|–|-)\\s*`, 'i'), '')
      .replace(new RegExp(`\\s+(?:at|—|–|-)\\s+${escaped}$`, 'i'), '')
      .replace(new RegExp(`\\s*\\(${escaped}\\)$`, 'i'), '')
      .trim();
  }

  return title || fallbackRole;
}

function findInterviewContact(lastAction) {
  const match = String(lastAction || '').match(/\bwith\s+([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,3})(?=\s*(?:\(|;|,|—|–|-|$))/);
  return match ? match[1] : null;
}

function findInterviewContactTitle(lastAction, interviewContact) {
  if (!interviewContact) return null;
  const escapedContact = escapeRegExp(interviewContact);
  const match = String(lastAction || '').match(
    new RegExp(`\\bwith\\s+${escapedContact}\\s*(?:—|–|-)\\s*([^.;]+)`, 'i'),
  );
  return match ? match[1].trim() : null;
}

function findAppliedDate(folderPath, fallbackDate) {
  if (!folderPath) return fallbackDate;

  const folder = path.resolve(localRoot, folderPath);
  if (!fs.existsSync(folder)) return fallbackDate;

  const appliedDates = [];
  const packetDates = [];
  const collect = (source, pattern) => {
    for (const match of source.matchAll(pattern)) appliedDates.push(match[1]);
  };
  const collectPacketDate = (source, pattern) => {
    for (const match of source.matchAll(pattern)) packetDates.push(match[1]);
  };

  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (!entry.isFile() || !/(application|submission|workday).*\.md$/i.test(entry.name)) continue;
    const source = fs.readFileSync(path.join(folder, entry.name), 'utf8');
    collect(source, /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(?:Application )?submitted\b/gim);
    collect(source, /^\s*-\s*(?:\*\*)?(?:Submission date|Submitted|Application submitted)(?:\*\*)?:\s*(\d{4}-\d{2}-\d{2})/gim);
    collect(source, /(?:Status:\*\*\s*)?(?:Applied|APPLIED)[^\r\n]*?(\d{4}-\d{2}-\d{2})/gim);
    collectPacketDate(source, /Packet created:\s*(\d{4}-\d{2}-\d{2})/gim);
    collectPacketDate(source, /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*Packet created\b/gim);
  }

  return appliedDates.sort().at(-1) || packetDates.sort().at(-1) || fallbackDate;
}

function findInterviewSchedule(folderPath) {
  if (!folderPath) return [];

  const prepPath = path.join(path.resolve(localRoot, folderPath), '60-Interview-Prep.md');
  if (!fs.existsSync(prepPath)) return [];

  const lines = fs.readFileSync(prepPath, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index].trim();
    if (!headerLine.startsWith('|')) continue;

    const headers = headerLine.slice(1, -1).split('|').map(cleanMarkdown);
    const interviewerIndex = headers.findIndex((header) => /^interviewer$/i.test(header));
    const titleIndex = headers.findIndex((header) => /^(role|title)$/i.test(header));
    const timeIndex = headers.findIndex((header) => /^time/i.test(header));
    const lengthIndex = headers.findIndex((header) => /^(length|duration)$/i.test(header));
    if (interviewerIndex === -1 || timeIndex === -1) continue;

    const context = lines.slice(Math.max(0, index - 12), index).join(' ');
    const dateMatch = context.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/i);
    const date = dateMatch ? dateMatch[0] : '';
    const schedule = [];

    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const rowLine = lines[rowIndex].trim();
      if (!rowLine.startsWith('|')) break;
      const cells = rowLine.slice(1, -1).split('|').map(cleanMarkdown);
      const interviewer = (cells[interviewerIndex] || '').replace(/\*/g, '').trim();
      const title = titleIndex === -1 ? '' : (cells[titleIndex] || '').trim();
      const time = (cells[timeIndex] || '').trim();
      const length = lengthIndex === -1 ? '' : (cells[lengthIndex] || '').trim();
      if (!interviewer || /break/i.test(interviewer) || !/\d/.test(time)) continue;
      schedule.push({ interviewer, title, date, time, length });
    }

    if (schedule.length) return schedule;
  }

  return [];
}

function findJobOpeningUrl(folderPath) {
  if (!folderPath) return null;

  const descriptionPath = path.join(path.resolve(localRoot, folderPath), '01-Job-Description.md');
  if (!fs.existsSync(descriptionPath)) return null;

  const source = fs.readFileSync(descriptionPath, 'utf8');
  const labeledUrl = source.match(
    /(?:official\s+(?:job|posting)\s+url|employer\/ats\s+url)\s*:\s*(https?:\/\/[^\s)\]`]+)/i,
  );
  if (labeledUrl) return labeledUrl[1].replace(/[.,;:]+$/g, '');
  const urls = [...source.matchAll(/https?:\/\/[^\s)\]`]+/g)]
    .map((match) => match[0].replace(/[.,;:]+$/g, ''));
  const officialUrl = urls.find((url) => !/linkedin\.com\/jobs/i.test(url));
  return officialUrl || urls[0] || null;
}

function findInterviewPrepPath(folderPath) {
  if (!folderPath) return null;
  const relativePath = `${folderPath}60-Interview-Prep.md`;
  return fs.existsSync(path.resolve(localRoot, relativePath)) ? relativePath : null;
}

function findInterviewMeeting(folderPath, lastAction) {
  const sources = [String(lastAction || '')];
  if (folderPath) {
    const folder = path.resolve(localRoot, folderPath);
    for (const fileName of ['50-Application-Record.md', '60-Interview-Prep.md']) {
      const filePath = path.join(folder, fileName);
      if (fs.existsSync(filePath)) sources.push(fs.readFileSync(filePath, 'utf8'));
    }
  }

  const source = sources.join('\n');
  const urls = [...source.matchAll(/https?:\/\/[^\s)\]`]+/g)]
    .map((match) => match[0].replace(/[.,;:]+$/g, ''));
  const meetingUrl =
    urls.find((url) =>
      /(?:teams\.(?:microsoft|live)\.com|zoom(?:gov)?\.us|meet\.google\.com)/i.test(url),
    ) || null;
  const passwordMatch = source.match(/(?:password|passcode)\s*[:=-]\s*([^\s|]+)/i);
  const platform = meetingUrl
    ? /zoom/i.test(meetingUrl)
      ? 'Zoom'
      : /meet\.google/i.test(meetingUrl)
        ? 'Google Meet'
        : 'Microsoft Teams'
    : /Microsoft Teams/i.test(source)
      ? 'Microsoft Teams'
      : /\bZoom\b/i.test(source)
        ? 'Zoom'
        : /Google Meet/i.test(source)
          ? 'Google Meet'
          : null;

  return platform || meetingUrl || passwordMatch
    ? {
      platform,
      url: meetingUrl,
      password: passwordMatch ? passwordMatch[1] : null,
      passwordEmbedded: Boolean(meetingUrl && /[?&]pwd=/i.test(meetingUrl)),
    }
    : null;
}

function getWorkdayUrls(folderPath) {
  if (!folderPath) return [];

  const folder = path.resolve(localRoot, folderPath);
  if (!fs.existsSync(folder)) return [];

  const urls = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const source = fs.readFileSync(path.join(folder, entry.name), 'utf8');
    for (const match of source.matchAll(/https?:\/\/[^\s)\]`]+/g)) {
      if (/myworkdayjobs\.com|myworkdaysite\.com/i.test(match[0])) urls.push(match[0]);
    }
  }
  return [...new Set(urls)];
}

function workdayCareerPortal(url) {
  const parsed = new URL(url);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const jobIndex = segments.findIndex((segment) => segment.toLowerCase() === 'job');
  const careerSegments = jobIndex === -1 ? segments : segments.slice(0, jobIndex);
  return `${parsed.origin}/${careerSegments.join('/')}${careerSegments.length ? '/' : ''}`;
}

function findWorkdayCareerUrl(folderPath, company) {
  if (careerPortalOverrides[company]) return careerPortalOverrides[company];
  if (!folderPath) return null;

  const folder = path.resolve(localRoot, folderPath);
  const supplement = fs.readdirSync(folder, { withFileTypes: true })
    .find((entry) => entry.isFile() && /workday.*supplement.*\.md$/i.test(entry.name));
  if (!supplement) return null;

  const supplementSource = fs.readFileSync(path.join(folder, supplement.name), 'utf8');
  if (/workday-style|oracle cloud candidate/i.test(supplementSource)) return null;

  const ownUrl = getWorkdayUrls(folderPath)[0];
  if (ownUrl) return workdayCareerPortal(ownUrl);

  const companyKey = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const state of ['_Active', '_Archive']) {
    const directory = path.join(localRoot, state);
    if (!fs.existsSync(directory)) continue;
    const matches = fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(companyKey));
    for (const match of matches) {
      const sharedUrl = getWorkdayUrls(`./${state}/${match.name}/`)[0];
      if (sharedUrl) return workdayCareerPortal(sharedUrl);
    }
  }

  return careerPortalOverrides[company] || null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDashboard(jobs) {
  const generatedAt = new Date().toISOString();
  const data = JSON.stringify(jobs).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Job Search Dashboard</title>
  <style>
    :root { --ink:#20252b; --muted:#68727b; --line:#d9dfe3; --paper:#f5f6f4; --panel:#ffffff; --blue:#16697a; --green:#23764f; --amber:#a56d08; --red:#b7473a; --focus:#1b7590; }
    * { box-sizing:border-box; }
    body { margin:0; min-width:320px; color:var(--ink); background:var(--paper); font:15px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    button, input, select { font:inherit; }
    button { cursor:pointer; }
    .shell { max-width:1440px; margin:0 auto; padding:32px clamp(18px, 4vw, 64px) 48px; }
    .masthead { display:flex; align-items:end; justify-content:space-between; gap:24px; padding-bottom:24px; border-bottom:1px solid var(--line); }
    .eyebrow { margin:0 0 6px; color:var(--blue); font-size:12px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
    h1 { margin:0; font-size:30px; line-height:1.15; font-weight:730; }
    .updated { margin:0; max-width:300px; color:var(--muted); font-size:13px; text-align:right; }
    .tabs { display:flex; gap:4px; margin:28px 0 0; border-bottom:1px solid var(--line); }
    .tab { position:relative; margin-bottom:-1px; padding:12px 16px; border:1px solid transparent; border-bottom:1px solid var(--line); border-radius:6px 6px 0 0; color:var(--muted); background:transparent; font-size:14px; font-weight:700; }
    .tab:hover { color:var(--blue); background:#edf2ef; }
    .tab[aria-selected="true"] { color:var(--ink); background:var(--panel); border-color:var(--line); border-bottom-color:var(--panel); }
    .tab-count { display:inline-flex; align-items:center; justify-content:center; min-width:24px; margin-left:7px; padding:1px 7px; border-radius:999px; color:#52616a; background:#e5ebe8; font-size:11px; }
    .tab[aria-selected="true"] .tab-count { color:#fff; background:var(--blue); }
    .toolbar { display:grid; grid-template-columns:minmax(220px, 1fr) auto auto; gap:12px; align-items:center; margin:18px 0 14px; }
    .search, .select { height:42px; border:1px solid var(--line); border-radius:5px; background:var(--panel); color:var(--ink); }
    .search { width:100%; padding:0 12px; }
    .select { padding:0 34px 0 10px; }
    .refresh-button { height:42px; padding:0 15px; border:1px solid var(--blue); border-radius:5px; color:#fff; background:var(--blue); font-size:13px; font-weight:750; white-space:nowrap; }
    .refresh-button:hover { background:#0f5968; }
    .refresh-button:disabled { cursor:wait; opacity:.65; }
    .search:focus, .select:focus, button:focus-visible { outline:3px solid #a8d8e3; outline-offset:1px; }
    .refresh-panel { margin:-2px 0 14px; padding:13px 15px; border:1px solid #c8d8d0; border-radius:5px; color:#38505a; background:#f1f7f4; font-size:13px; }
    .refresh-panel[data-tone="error"] { border-color:#e4bdb7; color:#7d3028; background:#fff3f1; }
    .refresh-summary { margin:0; font-weight:750; }
    .refresh-detail { margin:7px 0 0; padding-left:20px; }
    .refresh-detail li + li { margin-top:4px; }
    .table-wrap { overflow:auto; border:1px solid var(--line); border-radius:6px; background:var(--panel); }
    table { width:100%; min-width:980px; border-collapse:collapse; }
    thead { background:#edf0ee; }
    th { padding:0; color:#4f5a62; font-size:11px; font-weight:750; letter-spacing:.06em; text-align:left; text-transform:uppercase; white-space:nowrap; }
    th:not([aria-sort="none"]) { background:#e5ece8; }
    .plain-header { padding:12px 14px; }
    .sort-button { display:flex; align-items:center; gap:7px; width:100%; min-height:40px; padding:12px 14px; border:0; color:inherit; background:transparent; font:inherit; letter-spacing:inherit; text-align:left; text-transform:inherit; }
    .sort-button:hover { color:var(--blue); background:#dce8e2; }
    .sort-arrow { display:inline-block; min-width:8px; color:var(--blue); font-size:12px; }
    td { padding:14px; vertical-align:top; border-top:1px solid var(--line); }
    tbody tr:hover { background:#f8faf9; }
    .interview-subrow td { padding-top:10px; padding-bottom:10px; background:#f7faf8; border-top:1px dashed #d9e3de; }
    .interview-subrow:hover td { background:#f0f6f3; }
    .interview-branch { display:inline-flex; align-items:center; gap:5px; padding-left:8px; color:var(--green); font-size:12px; font-weight:750; white-space:nowrap; }
    .interviewer-name { display:block; margin-top:3px; color:var(--ink); font-size:13px; font-weight:750; }
    .interviewer-title { display:block; margin-top:1px; color:#52616a; font-size:11px; line-height:1.3; }
    .interview-length { display:block; margin-top:3px; color:var(--muted); font-size:11px; }
    .job-id { color:var(--blue); font-weight:750; white-space:nowrap; text-decoration:none; }
    .job-id:hover { text-decoration:underline; }
    .career-link { color:var(--blue); font-size:13px; font-weight:700; text-decoration:none; white-space:nowrap; }
    .career-link:hover { text-decoration:underline; }
    .company { max-width:190px; font-weight:700; }
    .role-link, .prep-link { color:var(--blue); font-weight:750; text-decoration:none; }
    .role-link:hover, .prep-link:hover { text-decoration:underline; }
    .role { min-width:250px; max-width:390px; }
    .meeting-details { min-width:150px; color:#38505a; font-size:12px; }
    .meeting-platform { display:block; font-weight:750; }
    .meeting-link { display:inline-block; margin-top:3px; color:var(--blue); font-weight:750; text-decoration:none; }
    .meeting-link:hover { text-decoration:underline; }
    .meeting-password, .meeting-unavailable { display:block; margin-top:3px; color:var(--muted); font-size:11px; }
    .interview-type { min-width:150px; color:#38505a; font-size:13px; font-weight:650; }
    .date { color:var(--muted); font-size:13px; white-space:nowrap; }
    .status { display:inline-flex; align-items:center; gap:6px; color:#38505a; font-size:12px; font-weight:700; white-space:nowrap; }
    .status::before { width:8px; height:8px; border-radius:50%; background:var(--blue); content:""; }
    .status.interviewing::before { background:var(--green); }
    .status.done::before { background:#111827; }
    .status.done { color:#5b6670; }
    .status.interviewing, .status.done { align-items:flex-start; }
    .status.interviewing::before, .status.done::before { margin-top:4px; }
    .sched-date { display:block; font-weight:750; white-space:nowrap; }
    .sched-time { display:block; font-weight:600; white-space:nowrap; }
    .sched-duration { display:block; color:var(--muted); font-weight:600; font-size:11px; white-space:nowrap; }
    .status.offer::before { background:#7048a1; }
    .status.rejected::before { background:var(--red); }
    .empty { padding:42px 20px; color:var(--muted); text-align:center; }
    .footer { display:flex; justify-content:space-between; gap:16px; margin-top:16px; color:var(--muted); font-size:12px; }
    @media (max-width:780px) { .shell { padding-top:22px; } .masthead { display:block; } .updated { margin-top:10px; text-align:left; } .tabs { overflow-x:auto; } .tab { flex:0 0 auto; } .toolbar { grid-template-columns:1fr; } .select { width:100%; } .footer { display:block; } .footer span + span { display:block; margin-top:6px; } }
  </style>
</head>
<body>
  <main class="shell">
    <header class="masthead">
      <div><p class="eyebrow">Private workspace</p><h1>Job Search Dashboard</h1></div>
      <p class="updated" id="updated"></p>
    </header>
    <section class="tabs" role="tablist" aria-label="Application stage">
      <button class="tab" id="tab-interviews" type="button" role="tab" aria-selected="true" aria-controls="applications-panel" data-view="interviews">Applications under interview <span class="tab-count" id="interviews-count"></span></button>
      <button class="tab" id="tab-waiting" type="button" role="tab" aria-selected="false" aria-controls="applications-panel" data-view="waiting">Applied and waiting <span class="tab-count" id="waiting-count"></span></button>
      <button class="tab" id="tab-rejected" type="button" role="tab" aria-selected="false" aria-controls="applications-panel" data-view="rejected">Rejected <span class="tab-count" id="rejected-count"></span></button>
    </section>
    <section class="toolbar" aria-label="Dashboard filters">
      <input class="search" id="search" type="search" placeholder="Search company, role, or job ID" autocomplete="off">
      <select class="select" id="sort" aria-label="Sort jobs">
        <option value="id">Job ID</option>
        <option value="company">Company</option>
        <option value="status" id="sort-status-label">Next interview date</option>
        <option value="date">Applied date</option>
      </select>
      <button class="refresh-button" id="refresh-postings" type="button" hidden>Refresh posting status</button>
    </section>
    <section class="refresh-panel" id="refresh-panel" aria-live="polite" hidden></section>
    <div class="table-wrap" id="applications-panel" role="tabpanel" aria-labelledby="tab-interviews">
      <table>
        <thead><tr><th aria-sort="ascending"><button class="sort-button" type="button" data-sort="id">Job <span class="sort-arrow">^</span></button></th><th aria-sort="none"><button class="sort-button" type="button" data-sort="company">Company <span class="sort-arrow"></span></button></th><th class="plain-header" aria-sort="none" id="role-column-label">Role + Link</th><th aria-sort="none"><button class="sort-button" type="button" data-sort="status"><span id="status-column-label">Next Interview Date</span> <span class="sort-arrow"></span></button></th><th class="plain-header" id="interview-details-header" aria-sort="none">Interview Details</th><th class="plain-header" id="interview-type-header" aria-sort="none">Interview type</th><th aria-sort="none"><button class="sort-button" type="button" data-sort="date"><span id="date-column-label">Applied date</span> <span class="sort-arrow"></span></button></th><th class="plain-header" id="career-login-header" aria-sort="none" hidden>Career login</th></tr></thead>
        <tbody id="jobs"></tbody>
      </table>
    </div>
    <footer class="footer"><span id="count"></span><span>Source: .local-user/Job-Tracker.md</span></footer>
  </main>
  <script>
    if (window.location.protocol === 'file:') {
      window.location.replace('http://127.0.0.1:4173/');
    }
    const jobs = ${data};
    const generatedAt = new Date('${generatedAt}');
    const initialView = ['interviews', 'waiting', 'rejected'].includes(window.location.hash.slice(1))
      ? window.location.hash.slice(1)
      : 'interviews';
    const defaultSortForView = (view) => view === 'waiting' ? 'id' : 'status';
    const state = { view: initialView, search: '', sort: defaultSortForView(initialView), direction: 'asc' };
    const byId = (id) => document.getElementById(id);
    const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const statusClass = (job) => {
      const status = job.status.toLowerCase();
      if (status.includes('interview')) return 'interviewing';
      if (status.includes('offer')) return 'offer';
      if (status.includes('rejected') || status.includes('posting closed')) return 'rejected';
      return 'applied';
    };
    const displayStatus = (job) => {
      const status = job.status.toLowerCase();
      if (status.includes('posting closed')) return 'Posting Closed';
      if (status.includes('rejected')) {
        const detail = [job.lastAction, job.interviewStage, job.status].join(' ').toLowerCase();
        if (/\\b(interview|screen|panel|loop)\\b/.test(detail)) return 'Rejected after interview';
        if (/(position|posting|role|job)[^.;|]*\\b(closed|filled|taken down|cancelled|canceled)\\b|\\b(closed|filled|taken down|cancelled|canceled)\\b[^.;|]*(position|posting|role|job)/.test(detail)) return 'Position closed';
        if (/\\bemail\\b/.test(detail)) return 'Rejected via email';
        return 'Rejected';
      }
      return job.applied && status === 'active' ? 'Applied' : job.status;
    };
    const interviewDetails = (job) => {
      const stage = (job.interviewStage || '').trim();
      const lowerStage = stage.toLowerCase();
      const statusLabel = /\\b(?:decision|outcome|verdict|result)\\b/.test(lowerStage)
        ? 'Awaiting decision'
        : /\\b(?:await|awaiting|pending|to be scheduled)\\b/.test(lowerStage)
          ? 'Pending'
          : 'Not provided';
      if (!stage || stage.toLowerCase() === 'interviewing') return { date: 'Not provided', time: '', duration: '', type: 'Not provided' };
      if (stage.toLowerCase().includes('scheduling')) {
        return { date: 'Scheduling', time: '', duration: '', type: stage.replace(/\\s*-\\s*scheduling.*$/i, '').trim() || 'Not provided' };
      }
      const dayMatch = stage.match(/(?:\\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+)?\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2}/i);
      if (!dayMatch) return { date: statusLabel, time: '', duration: '', type: stage };
      const rest = stage.slice(dayMatch.index + dayMatch[0].length);
      const timeMatch = rest.match(/^\\s*(\\d{1,2}:\\d{2}(?:am|pm)?(?:\\s*[–—-]\\s*\\d{1,2}:\\d{2}(?:am|pm)?)?(?:\\s+[A-Z]{2,4})?)/i);
      // Only confirmed bookings belong in the date column. A date with no clock
      // time that follows nudge / follow-up / approximate wording is a
      // recommendation, not a scheduled interview — suppress it.
      if (!timeMatch) {
        const preceding = stage.slice(0, dayMatch.index);
        const soft = /(?:nudge|follow[\\s-]?up|check[\\s-]?in|reach out|ping|remind|await|awaiting|if no (?:word|response|reply))/i.test(preceding)
          || /(?:by|around|approx\\.?|circa|target(?:ing)?|expect(?:ed|ing)?|no later than)\\s*~?\\s*$/i.test(preceding)
          || /~\\s*$/.test(preceding);
        if (soft) return { date: statusLabel, time: '', duration: '', type: stage };
      }
      const time = timeMatch ? timeMatch[1].trim() : '';
      let leftover = timeMatch ? rest.slice(timeMatch[0].length) : rest;
      const durationMatch = leftover.match(/\\(\\s*(\\d+\\s*(?:min|minute|hour|hr)[^)]*)\\)/i);
      const duration = durationMatch ? durationMatch[1].trim() : '';
      if (durationMatch) leftover = leftover.replace(durationMatch[0], ' ');
      const before = stage.slice(0, dayMatch.index).replace(/[\\s,;:–—-]+$/g, '').trim();
      const after = leftover.trim();
      return { date: dayMatch[0], time: time, duration: duration, type: [before, after].filter(Boolean).join(' ') || 'Interview' };
    };
    const interviewMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const interviewScheduleSortValue = (job) => {
      const detail = interviewDetails(job);
      const text = (detail.date + ' ' + detail.time).trim();
      const match = text.match(/\\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2})(?:\\s+(\\d{1,2}):(\\d{2})(am|pm))?/i);
      if (!match) return text.toLowerCase().includes('scheduling') ? Number.MAX_SAFE_INTEGER - 1 : Number.MAX_SAFE_INTEGER;
      let hour = match[3] ? Number(match[3]) : 0;
      if (match[5]) {
        if (hour === 12) hour = 0;
        if (match[5].toLowerCase() === 'pm') hour += 12;
      }
      return new Date(generatedAt.getFullYear(), interviewMonths.indexOf(match[1].toLowerCase()), Number(match[2]), hour, Number(match[4] || 0)).getTime();
    };
    const interviewDone = (job) => {
      const detail = interviewDetails(job);
      const dayMatch = detail.date.match(/\\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2})/i);
      if (!dayMatch) return false;
      const month = interviewMonths.indexOf(dayMatch[1].toLowerCase());
      const day = Number(dayMatch[2]);
      const year = generatedAt.getFullYear();
      const clocks = detail.time.match(/\\d{1,2}:\\d{2}(?:am|pm)?/gi) || [];
      let end;
      if (!clocks.length) {
        end = new Date(year, month, day, 23, 59, 59);
      } else {
        let token = clocks[clocks.length - 1];
        if (!/am|pm/i.test(token)) {
          const meridiem = clocks.find((clock) => /am|pm/i.test(clock));
          if (meridiem) token += meridiem.match(/am|pm/i)[0];
        }
        const parts = token.match(/(\\d{1,2}):(\\d{2})(am|pm)?/i);
        let hour = Number(parts[1]);
        if (parts[3]) { if (hour === 12) hour = 0; if (parts[3].toLowerCase() === 'pm') hour += 12; }
        end = new Date(year, month, day, hour, Number(parts[2]));
      }
      return end.getTime() < Date.now();
    };
    const daysSince = (date) => Math.max(0, Math.floor((Date.now() - new Date(date + 'T12:00:00').getTime()) / 86400000));
    const labelDate = (date) => new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const isPostingClosed = (job) => job.status.toLowerCase().includes('posting closed');
    const isRejected = (job) => job.status.toLowerCase().includes('rejected') || isPostingClosed(job);
    const interviews = jobs.filter((job) => !job.closed && job.status.toLowerCase() === 'interviewing');
    const waiting = jobs.filter((job) => job.applied && job.status.toLowerCase() !== 'interviewing');
    const rejected = jobs.filter(isRejected);
    const views = { interviews, waiting, rejected };
    const viewLabels = {
      interviews: { singular: 'application under interview', plural: 'applications under interview' },
      waiting: { singular: 'application awaiting response', plural: 'applications awaiting response' },
      rejected: { singular: 'closed application', plural: 'closed applications' },
    };
    function renderTabs() {
      Object.entries(views).forEach(([view, viewJobs]) => { byId(view + '-count').textContent = viewJobs.length; });
      document.querySelectorAll('[data-view]').forEach((tab) => {
        const active = tab.dataset.view === state.view;
        tab.setAttribute('aria-selected', String(active));
        tab.setAttribute('tabindex', active ? '0' : '-1');
      });
      byId('applications-panel').setAttribute('aria-labelledby', 'tab-' + state.view);
      const interviewView = state.view === 'interviews';
      byId('role-column-label').textContent = interviewView ? 'Role + Link' : 'Role';
      byId('status-column-label').textContent = interviewView ? 'Next Interview Date' : 'Status';
      byId('date-column-label').textContent = state.view === 'rejected' ? 'Applied / closed date' : 'Applied date';
      byId('sort-status-label').textContent = interviewView ? 'Next interview date' : 'Status';
      byId('interview-details-header').hidden = !interviewView;
      byId('interview-type-header').hidden = !interviewView;
      byId('career-login-header').hidden = interviewView || state.view === 'rejected';
      byId('refresh-postings').hidden = state.view !== 'waiting';
    }
    function renderPrepSchedule(job, date, time = '') {
      const content = escapeHtml(date) + (time ? '<br>' + escapeHtml(time) : '');
      if (!job.interviewPrepPath) return content;
      return '<a class="prep-link" data-file="' + escapeHtml(job.interviewPrepPath) + '" href="' + escapeHtml(job.interviewPrepPath) + '" title="Open interview prep">' + content + '</a>';
    }
    function renderMeetingDetails(job) {
      const meeting = job.interviewMeeting;
      if (!meeting) return '<td class="meeting-details"><span class="meeting-unavailable">Not available</span></td>';
      const platform = meeting.platform ? '<span class="meeting-platform">' + escapeHtml(meeting.platform) + '</span>' : '';
      const link = meeting.url
        ? '<a class="meeting-link" href="' + escapeHtml(meeting.url) + '" target="_blank" rel="noreferrer">Join meeting</a>'
        : '<span class="meeting-unavailable">Link not recorded</span>';
      const password = meeting.password
        ? '<span class="meeting-password">Password: ' + escapeHtml(meeting.password) + '</span>'
        : meeting.passwordEmbedded
          ? '<span class="meeting-password">Password embedded in link</span>'
        : '';
      return '<td class="meeting-details">' + platform + link + password + '</td>';
    }
    function renderStatusCells(job) {
      const detail = escapeHtml(job.lastAction || job.status);
      if (state.view !== 'interviews') return '<td><span class="status ' + statusClass(job) + '" title="' + detail + '">' + escapeHtml(displayStatus(job)) + '</span></td>';
      const interview = interviewDetails(job);
      const scheduledPerson = Array.isArray(job.interviewSchedule) && job.interviewSchedule.length === 1
        ? job.interviewSchedule[0]
        : job.interviewContact
          ? { interviewer: job.interviewContact, title: job.interviewContactTitle || '' }
          : null;
      const personDetails = scheduledPerson
        ? '<span class="interviewer-name">' + escapeHtml(scheduledPerson.interviewer) + '</span>' + (scheduledPerson.title ? '<span class="interviewer-title" title="' + escapeHtml(scheduledPerson.title) + '">' + escapeHtml(abbreviateInterviewTitle(scheduledPerson.title)) + '</span>' : '')
        : '';
      const dotClass = interviewDone(job) ? 'done' : 'interviewing';
      const schedInner = [
        interview.date ? '<span class="sched-date">' + escapeHtml(interview.date) + '</span>' : '',
        interview.time ? '<span class="sched-time">' + escapeHtml(interview.time) + '</span>' : '',
        interview.duration ? '<span class="sched-duration">' + escapeHtml(interview.duration) + '</span>' : '',
      ].filter(Boolean).join('');
      const sched = job.interviewPrepPath
        ? '<a class="prep-link" data-file="' + escapeHtml(job.interviewPrepPath) + '" href="' + escapeHtml(job.interviewPrepPath) + '" title="Open interview prep">' + schedInner + '</a>'
        : schedInner;
      return '<td><span class="status ' + dotClass + '" title="' + detail + '">' + sched + '</span></td>' + renderMeetingDetails(job) + '<td class="interview-type" title="' + detail + '">' + escapeHtml(interview.type) + personDetails + '</td>';
    }
    function abbreviateInterviewTitle(title) {
      return String(title || '')
        .replace(/\\bSenior\\b/gi, 'Sr')
        .replace(/\\bManager\\b/gi, 'Mgr')
        .replace(/\\bManagement\\b/gi, 'Mgmt')
        .replace(/\\bDirector\\b/gi, 'Dir');
    }
    function renderInterviewSubrows(job) {
      if (state.view !== 'interviews' || !Array.isArray(job.interviewSchedule) || job.interviewSchedule.length < 2) return '';
      return job.interviewSchedule.map((interview, index) => '<tr class="interview-subrow"><td colspan="3"><span class="interview-branch">↳ Interview ' + (index + 1) + '</span></td><td class="date">' + renderPrepSchedule(job, interview.date || interviewDetails(job).date, interview.time) + '</td>' + renderMeetingDetails(job) + '<td class="interview-type"><span class="interviewer-name">' + escapeHtml(interview.interviewer) + '</span>' + (interview.title ? '<span class="interviewer-title" title="' + escapeHtml(interview.title) + '">' + escapeHtml(abbreviateInterviewTitle(interview.title)) + '</span>' : '') + '<span class="interview-length">' + escapeHtml(interview.length || 'Length not provided') + '</span></td><td></td></tr>').join('');
    }
    function renderRole(job) {
      const title = job.officialRole || job.role;
      if (state.view === 'rejected' || !job.jobOpeningUrl) return escapeHtml(title);
      return '<a class="role-link" href="' + escapeHtml(job.jobOpeningUrl) + '" target="_blank" rel="noreferrer" title="Open original job posting">' + escapeHtml(title) + '</a>';
    }
    function renderJobRows(job) {
      const dateCell = state.view === 'rejected' && /^\\d{4}-\\d{2}-\\d{2}$/.test(job.date || '')
        ? 'Applied ' + labelDate(job.appliedDate) + '<br>' + (isPostingClosed(job) ? 'Posting closed ' : 'Rejected ') + labelDate(job.date)
        : labelDate(job.appliedDate) + '<br>' + daysSince(job.appliedDate) + 'd ago';
      const careerLoginCell = state.view === 'waiting'
        ? '<td>' + (job.careerLoginUrl ? '<a class="career-link" href="' + escapeHtml(job.careerLoginUrl) + '" target="_blank" rel="noreferrer">Sign in</a>' : '') + '</td>'
        : '';
      const parentRow = '<tr><td>' + (job.folderPath ? '<a class="job-id" data-folder="' + escapeHtml(job.folderPath) + '" href="' + escapeHtml(job.folderPath) + '" title="Open ' + escapeHtml(job.id) + ' folder">' + escapeHtml(job.id) + '</a>' : '<span class="job-id">' + escapeHtml(job.id) + '</span>') + '</td><td class="company">' + escapeHtml(job.company) + '</td><td class="role">' + renderRole(job) + '</td>' + renderStatusCells(job) + '<td class="date">' + dateCell + '</td>' + careerLoginCell + '</tr>';
      return parentRow + renderInterviewSubrows(job);
    }
    function render() {
      const query = state.search.toLowerCase();
      const filtered = views[state.view].filter((job) => [job.id, job.company, job.officialRole, job.role, job.status, job.interviewStage, job.lastAction, JSON.stringify(job.interviewSchedule || [])].join(' ').toLowerCase().includes(query));
      const fieldValue = (job) => state.sort === 'id'
        ? Number(job.id.split('-')[1])
        : state.sort === 'date'
          ? state.view === 'rejected' && isRejected(job) ? job.date : job.appliedDate
          : state.sort === 'status' && state.view === 'interviews'
            ? interviewScheduleSortValue(job)
            : job[state.sort];
      filtered.sort((a, b) => {
        const left = fieldValue(a);
        const right = fieldValue(b);
        const result = typeof left === 'number' ? left - right : String(left).localeCompare(String(right));
        return result * (state.direction === 'asc' ? 1 : -1);
      });
      const viewLabel = viewLabels[state.view][filtered.length === 1 ? 'singular' : 'plural'];
      byId('count').textContent = filtered.length + ' ' + viewLabel + ' shown';
      const columnCount = state.view === 'interviews' ? 7 : state.view === 'rejected' ? 5 : 6;
      byId('jobs').innerHTML = filtered.length ? filtered.map(renderJobRows).join('') : '<tr><td colspan="' + columnCount + '" class="empty">No jobs match this view.</td></tr>';
      document.querySelectorAll('[data-sort]').forEach((button) => {
        const active = button.dataset.sort === state.sort;
        const header = button.closest('th');
        header.setAttribute('aria-sort', active ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none');
        button.querySelector('.sort-arrow').textContent = active ? (state.direction === 'asc' ? '^' : 'v') : '';
      });
    }
    function showRefreshResult(result, tone = 'success') {
      const panel = byId('refresh-panel');
      panel.dataset.tone = tone;
      panel.hidden = false;
      if (tone === 'error') {
        panel.innerHTML = '<p class="refresh-summary">' + escapeHtml(result.error || 'Posting refresh failed.') + '</p>';
        return;
      }
      const summary = [
        'Checked ' + result.checked + ' of ' + result.totalApplied + ' applied postings.',
        result.live.length + ' live.',
        result.closed.length + ' posting' + (result.closed.length === 1 ? '' : 's') + ' closed.',
        result.inconclusive.length + ' inconclusive.',
        result.skipped.length + ' skipped.',
      ].join(' ');
      const details = [];
      result.closed.forEach((item) => details.push('<li><strong>' + escapeHtml(item.id + ' ' + item.company) + '</strong> moved to Rejected as Posting Closed.</li>'));
      result.inconclusive.forEach((item) => details.push('<li><strong>' + escapeHtml(item.id + ' ' + item.company) + ':</strong> ' + escapeHtml(item.reason) + '</li>'));
      result.skipped.forEach((item) => details.push('<li><strong>' + escapeHtml(item.id + ' ' + item.company) + ':</strong> ' + escapeHtml(item.reason) + '</li>'));
      panel.innerHTML = '<p class="refresh-summary">' + escapeHtml(summary) + '</p>' + (details.length ? '<ul class="refresh-detail">' + details.join('') + '</ul>' : '');
    }
    async function refreshPostingStatus() {
      if (window.location.protocol !== 'http:' || window.location.hostname !== '127.0.0.1') {
        showRefreshResult({ error: 'Start the local dashboard server before refreshing posting status.' }, 'error');
        return;
      }
      if (!window.confirm('Check every Applied posting now? Definitively closed postings will move to Rejected and their packet folders will move to _Archive.')) return;
      const button = byId('refresh-postings');
      const panel = byId('refresh-panel');
      button.disabled = true;
      button.textContent = 'Checking postings…';
      panel.dataset.tone = 'success';
      panel.hidden = false;
      panel.innerHTML = '<p class="refresh-summary">Checking ' + views.waiting.length + ' applied postings. This can take a few minutes.</p>';
      try {
        const response = await fetch('/refresh-postings', {
          method: 'POST',
          headers: { 'X-Job-Dashboard-Action': 'refresh-postings' },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Posting refresh failed.');
        if (result.closed.length) {
          window.sessionStorage.setItem('posting-refresh-result', JSON.stringify(result));
          window.location.reload();
          return;
        }
        showRefreshResult(result);
      } catch (error) {
        showRefreshResult({ error: error.message }, 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Refresh posting status';
      }
    }
    document.querySelectorAll('[data-view]').forEach((tab) => tab.addEventListener('click', () => {
      state.view = tab.dataset.view;
      state.sort = defaultSortForView(state.view);
      state.direction = 'asc';
      byId('sort').value = state.sort;
      window.history.replaceState(null, '', '#' + state.view);
      renderTabs();
      render();
    }));
    document.querySelectorAll('[data-sort]').forEach((button) => button.addEventListener('click', () => { const next = button.dataset.sort; state.direction = state.sort === next ? (state.direction === 'asc' ? 'desc' : 'asc') : 'asc'; state.sort = next; byId('sort').value = next; render(); }));
    byId('search').addEventListener('input', (event) => { state.search = event.target.value; render(); });
    byId('sort').addEventListener('change', (event) => { state.sort = event.target.value; state.direction = 'asc'; render(); });
    byId('refresh-postings').addEventListener('click', refreshPostingStatus);
    document.addEventListener('click', (event) => {
      const fileLink = event.target.closest('.prep-link[data-file]');
      if (fileLink && window.location.protocol === 'http:' && window.location.hostname === '127.0.0.1') {
        event.preventDefault();
        fetch('/open-file?file=' + encodeURIComponent(fileLink.dataset.file), { method: 'POST' }).catch(() => { window.location.href = fileLink.href; });
        return;
      }
      const link = event.target.closest('.job-id[data-folder]');
      if (!link || window.location.protocol !== 'http:' || window.location.hostname !== '127.0.0.1') return;
      event.preventDefault();
      fetch('/open-folder?folder=' + encodeURIComponent(link.dataset.folder), { method: 'POST' }).catch(() => { window.location.href = link.href; });
    });
    byId('sort').value = state.sort;
    byId('updated').textContent = 'Generated ' + generatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' from your private job tracker.';
    renderTabs();
    render();
    const savedRefreshResult = window.sessionStorage.getItem('posting-refresh-result');
    if (savedRefreshResult) {
      window.sessionStorage.removeItem('posting-refresh-result');
      try { showRefreshResult(JSON.parse(savedRefreshResult)); } catch {}
    }
  </script>
</body>
</html>`;
}

if (!fs.existsSync(trackerPath)) {
  console.error(`Tracker not found: ${trackerPath}`);
  process.exit(1);
}

const jobs = parseTracker(fs.readFileSync(trackerPath, 'utf8'));
fs.writeFileSync(outputPath, renderDashboard(jobs), 'utf8');
console.log(`Generated ${outputPath} with ${jobs.length} jobs (${jobs.filter((job) => job.applied).length} applied, ${jobs.filter((job) => job.readyToSubmit).length} ready to apply).`);
