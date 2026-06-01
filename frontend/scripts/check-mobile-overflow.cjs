const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const INDEX_FILE = path.join(BUILD_DIR, 'index.html');
const ROUTES = ['/', '/auth', '/analyze', '/samples', '/simulation', '/community', '/about', '/profile'];
const VIEWPORT = { width: 390, height: 844 };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css',
    '.html': 'text/html',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.webmanifest': 'application/manifest+json',
  }[extension] || 'application/octet-stream';
}

function startStaticServer() {
  if (!fs.existsSync(INDEX_FILE)) {
    throw new Error('Missing build/index.html. Run npm run build before checking mobile overflow.');
  }

  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const normalized = path.normalize(requestPath).replace(/^([/\\])+/, '');
    let filePath = path.join(BUILD_DIR, normalized);

    if (!filePath.startsWith(BUILD_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = INDEX_FILE;
    }

    response.writeHead(200, { 'Content-Type': getContentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

function getBrowserPath() {
  const candidates = [
    process.env.MOBILE_CHECK_BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/microsoft-edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function waitForJson(url, timeoutMs = 10000) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(150);
  }

  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function connectToCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let id = 0;

    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const messageId = ++id;
          ws.send(JSON.stringify({ id: messageId, method, params }));
          return new Promise((res, rej) => {
            pending.set(messageId, { res, rej });
          });
        },
        close() {
          ws.close();
        },
      });
    });

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!pending.has(message.id)) return;

      const { res, rej } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) rej(new Error(message.error.message));
      else res(message.result);
    });

    ws.addEventListener('error', reject);
  });
}

async function checkRoute(cdp, origin, route) {
  await cdp.send('Page.navigate', { url: `${origin}${route}` });
  await delay(1200);

  const evaluation = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const doc = document.documentElement;
      const viewport = doc.clientWidth;
      const elements = Array.from(document.querySelectorAll('body *'));
      const overflow = elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: String(element.className || '').slice(0, 140),
            text: (element.innerText || element.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewport + 1))
        .slice(0, 8);

      return {
        route: location.pathname,
        viewport,
        documentScrollWidth: doc.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        overflow,
      };
    })()`,
  });

  return evaluation.result.value;
}

async function main() {
  if (typeof WebSocket !== 'function') {
    throw new Error('This check requires a Node.js runtime with a global WebSocket implementation.');
  }

  const browserPath = getBrowserPath();
  if (!browserPath) {
    throw new Error('Could not find Edge, Chrome, or Chromium. Set MOBILE_CHECK_BROWSER to a browser executable path.');
  }

  const { server, origin } = await startStaticServer();
  const userDataDir = path.join(os.tmpdir(), `necs-mobile-check-${Date.now()}`);
  const debugPort = 9400 + Math.floor(Math.random() * 1000);
  const browser = spawn(browserPath, [
    '--headless',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let cdp;
  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
    const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(origin)}`, { method: 'PUT' })
      .then((response) => response.json());

    cdp = await connectToCdp(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: 3,
      mobile: true,
    });

    const results = [];
    for (const route of ROUTES) {
      results.push(await checkRoute(cdp, origin, route));
    }

    const failures = results.filter((result) => (
      result.documentScrollWidth > result.viewport ||
      result.bodyScrollWidth > result.viewport ||
      result.overflow.length > 0
    ));

    for (const result of results) {
      console.log(`${result.route}: viewport=${result.viewport}, document=${result.documentScrollWidth}, body=${result.bodyScrollWidth}, overflow=${result.overflow.length}`);
      for (const item of result.overflow) {
        console.log(`  ${item.tag}.${item.className} right=${item.right} width=${item.width} text="${item.text}"`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`${failures.length} route(s) overflow at ${VIEWPORT.width}px.`);
    }
  } finally {
    if (cdp) cdp.close();
    browser.kill();
    server.close();
    await delay(300);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Browser profile locks can linger briefly on Windows.
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
