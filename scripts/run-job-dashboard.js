#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { refreshAppliedPostings } = require('./refresh-applied-postings');

const repoRoot = path.resolve(__dirname, '..');
const localRoot = path.join(repoRoot, '.local-user');
const dashboardPath = path.join(localRoot, 'dashboard.html');
const dashboardGeneratorPath = path.join(repoRoot, 'scripts', 'generate-job-dashboard.js');
const port = Number(process.argv[2] || 4173);
let refreshInProgress = false;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Port must be an integer between 1 and 65535.');
  process.exit(1);
}

function send(response, status, type, body) {
  response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(body);
}

function isTrustedDashboardRequest(request) {
  if (request.headers['x-job-dashboard-action'] === 'refresh-postings') return true;
  const trustedOrigins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ]);
  if (trustedOrigins.has(request.headers.origin)) return true;
  try {
    return trustedOrigins.has(new URL(request.headers.referer).origin);
  } catch {
    return false;
  }
}

function regenerateDashboard() {
  const result = spawnSync(process.execPath, [dashboardGeneratorPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(details || `Dashboard generator exited with status ${result.status}.`);
  }
}

function resolvePrivatePath(relativePath) {
  const candidate = path.resolve(localRoot, relativePath);
  const privateRoot = fs.realpathSync(localRoot);
  const resolved = fs.realpathSync(candidate);
  const relative = path.relative(privateRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path is outside the private workspace.');
  }
  return resolved;
}

function openFolder(requestedFolder) {
  if (!requestedFolder || path.isAbsolute(requestedFolder)) {
    throw new Error('A relative job folder is required.');
  }

  const folder = resolvePrivatePath(requestedFolder);
  if (!fs.statSync(folder).isDirectory()) {
    throw new Error('Folder is outside the private workspace or does not exist.');
  }

  openLocalPath(folder);
}

function openFile(requestedFile) {
  if (!requestedFile || path.isAbsolute(requestedFile)) {
    throw new Error('A relative file path is required.');
  }

  const file = resolvePrivatePath(requestedFile);
  if (!fs.statSync(file).isFile() || path.extname(file).toLowerCase() !== '.md') {
    throw new Error('File is outside the private workspace, missing, or not Markdown.');
  }

  openLocalPath(file);
}

function openLocalPath(target) {
  const command = process.platform === 'win32'
    ? 'explorer.exe'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  const child = spawn(command, [target], { detached: true, stdio: 'ignore' });
  child.unref();
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'GET' && (requestUrl.pathname === '/' || requestUrl.pathname === '/dashboard.html')) {
    try {
      regenerateDashboard();
    } catch (error) {
      send(response, 500, 'text/plain; charset=utf-8', `Could not regenerate dashboard: ${error.message}`);
      return;
    }

    if (!fs.existsSync(dashboardPath)) {
      send(response, 404, 'text/plain; charset=utf-8', 'Dashboard not found. Run node scripts/generate-job-dashboard.js first.');
      return;
    }
    send(response, 200, 'text/html; charset=utf-8', fs.readFileSync(dashboardPath, 'utf8'));
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/open-folder') {
    if (!isTrustedDashboardRequest(request)) {
      send(response, 403, 'text/plain; charset=utf-8', 'Folder actions must come from the local dashboard.');
      return;
    }
    try {
      openFolder(requestUrl.searchParams.get('folder'));
      send(response, 204, 'text/plain; charset=utf-8', '');
    } catch (error) {
      send(response, 400, 'text/plain; charset=utf-8', error.message);
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/open-file') {
    if (!isTrustedDashboardRequest(request)) {
      send(response, 403, 'text/plain; charset=utf-8', 'File actions must come from the local dashboard.');
      return;
    }
    try {
      openFile(requestUrl.searchParams.get('file'));
      send(response, 204, 'text/plain; charset=utf-8', '');
    } catch (error) {
      send(response, 400, 'text/plain; charset=utf-8', error.message);
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/refresh-postings') {
    if (!isTrustedDashboardRequest(request)) {
      send(response, 403, 'application/json; charset=utf-8', JSON.stringify({
        error: 'Refresh requests must come from the local dashboard.',
      }));
      return;
    }
    if (refreshInProgress) {
      send(response, 409, 'application/json; charset=utf-8', JSON.stringify({
        error: 'A posting refresh is already running.',
      }));
      return;
    }

    refreshInProgress = true;
    try {
      const result = await refreshAppliedPostings({ repoRoot });
      regenerateDashboard();
      send(response, 200, 'application/json; charset=utf-8', JSON.stringify(result));
    } catch (error) {
      send(response, 500, 'application/json; charset=utf-8', JSON.stringify({
        error: error.message,
      }));
    } finally {
      refreshInProgress = false;
    }
    return;
  }

  send(response, 404, 'text/plain; charset=utf-8', 'Not found.');
});

server.requestTimeout = 10 * 60 * 1000;
server.listen(port, '127.0.0.1', () => {
  console.log(`Job dashboard available at http://127.0.0.1:${port}`);
});
