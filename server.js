// Cape Town Singles Ladder: serves the site and a small read-only API, with no dependencies.
// The Google Sheet is read here on the server (never in the browser), so full names, phone numbers and
// emails in it stay private: the page only ever gets display names ("David A.") and public stats.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Ladder = require('./ladder.js');

const PORT = +process.env.PORT || 8419;
const ROOT = __dirname;
const SHEET_ID = process.env.SHEET_ID || '';
const SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT || ''; // the key's JSON, or a path to it
const ADMIN_KEY = process.env.ADMIN_KEY || (process.env.NODE_ENV === 'production' ? '' : 'dev');
const CACHE_SECONDS = +process.env.CACHE_SECONDS || 60;
const TIME_ZONE = 'Africa/Johannesburg';
const TABS = ['Players', 'Matches', 'Challenges', 'Freezes', 'Adjustments', 'Settings'];

// ---------- reading the sheet ----------

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function fromSample() {
  const tabs = {};
  for (const t of TABS) {
    const f = path.join(ROOT, 'sample', `${t}.csv`);
    tabs[t] = fs.existsSync(f) ? parseCSV(fs.readFileSync(f, 'utf8')) : [];
  }
  return tabs;
}

// Sheet shared as "anyone with the link can view". The ID is only known to the server.
async function fromLinkShared() {
  const tabs = {};
  await Promise.all(TABS.map(async t => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(t)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Sheet tab ${t}: HTTP ${res.status}`);
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Error('The sheet isn\'t shared as "anyone with the link can view"');
    tabs[t] = parseCSV(text);
  }));
  return tabs;
}

// Private sheet shared with a Google service account (read-only).
let token = { value: '', expires: 0 };
async function googleToken() {
  if (token.value && token.expires > Date.now() + 60000) return token.value;
  const raw = SERVICE_ACCOUNT.trim().startsWith('{') ? SERVICE_ACCOUNT : fs.readFileSync(SERVICE_ACCOUNT, 'utf8');
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google sign-in failed: ${body.error_description || body.error || res.status}`);
  token = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return token.value;
}
async function fromServiceAccount() {
  const auth = { Authorization: `Bearer ${await googleToken()}` };
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;
  const meta = await fetch(`${base}?fields=sheets.properties.title`, { headers: auth, signal: AbortSignal.timeout(15000) }).then(r => r.json());
  if (meta.error) throw new Error(`Sheet: ${meta.error.message}`);
  const have = new Set(meta.sheets.map(s => s.properties.title));
  const want = TABS.filter(t => have.has(t));
  const q = want.map(t => `ranges=${encodeURIComponent(t)}`).join('&');
  const data = await fetch(`${base}/values:batchGet?${q}&valueRenderOption=FORMATTED_VALUE`, { headers: auth, signal: AbortSignal.timeout(15000) }).then(r => r.json());
  if (data.error) throw new Error(`Sheet: ${data.error.message}`);
  const tabs = Object.fromEntries(TABS.map(t => [t, []]));
  data.valueRanges.forEach((v, i) => { tabs[want[i]] = v.values || []; });
  return tabs;
}

const source = !SHEET_ID ? 'sample' : SERVICE_ACCOUNT ? 'service-account' : 'link';
const load = { sample: fromSample, link: fromLinkShared, 'service-account': fromServiceAccount }[source];

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

let cache = null;   // { at, model, view }
let loading = null;
let lastError = '';
async function data(fresh) {
  const age = cache ? (Date.now() - cache.at) / 1000 : Infinity;
  if (cache && age < (fresh ? 10 : CACHE_SECONDS) && cache.day === today()) return cache;
  if (!loading) {
    loading = (async () => {
      try {
        const tabs = await load();
        const day = today();
        const model = Ladder.build(tabs, day);
        cache = { at: Date.now(), day, model, view: Ladder.publicView(model, { source, updated: new Date().toISOString() }) };
        lastError = '';
      } catch (e) {
        lastError = e.message;
        console.error('Loading the sheet failed:', e.message);
        if (!cache) throw e;
      } finally { loading = null; }
    })();
  }
  await loading;
  return cache;
}

// ---------- serving ----------

const FILES = {
  '/styles.css': 'text/css; charset=utf-8',
  '/app.js': 'text/javascript; charset=utf-8',
  '/pages.js': 'text/javascript; charset=utf-8',
  '/ladder.js': 'text/javascript; charset=utf-8',
  '/favicon.svg': 'image/svg+xml',
};

// The page links each file with a fingerprint of its contents ("app.js?v=3f9c…"), so phones pick up a
// deploy straight away while the files themselves can be cached for good.
const prints = {};
function fingerprint(file) {
  const full = path.join(ROOT, file);
  const stat = fs.statSync(full);
  const hit = prints[file];
  if (hit && hit.mtime === stat.mtimeMs) return hit.hash;
  const hash = crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex').slice(0, 10);
  prints[file] = { mtime: stat.mtimeMs, hash };
  return hash;
}
function indexHTML() {
  return fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace(/(href|src)="(styles\.css|app\.js|pages\.js|ladder\.js|favicon\.svg)"/g, (m, attr, f) => `${attr}="${f}?v=${fingerprint(f)}"`);
}

function send(res, status, body, type = 'application/json; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Read only' });
    if (url.pathname === '/api/ladder') {
      const d = await data(url.searchParams.has('fresh'));
      return send(res, 200, { ...d.view, stale: lastError ? true : undefined });
    }
    if (url.pathname === '/api/checks') {
      const k = req.headers['x-admin-key'] || url.searchParams.get('k');
      if (!ADMIN_KEY || k !== ADMIN_KEY) return send(res, 403, { error: 'Wrong key' });
      const d = await data(url.searchParams.has('fresh'));
      return send(res, 200, { source, loadedAt: new Date(d.at).toISOString(), error: lastError || undefined, warnings: d.model.warnings });
    }
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    if (url.pathname === '/' || url.pathname === '/index.html') return send(res, 200, indexHTML(), 'text/html; charset=utf-8');
    const type = FILES[url.pathname];
    if (!type) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    const cacheControl = url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'no-cache';
    return send(res, 200, fs.readFileSync(path.join(ROOT, url.pathname.slice(1))), type, { 'Cache-Control': cacheControl });
  } catch (e) {
    console.error(e);
    return send(res, 503, { error: `Couldn't read the ladder sheet: ${e.message}` });
  }
});

server.listen(PORT, () => {
  console.log(`Ladder on http://localhost:${PORT} (data: ${source}${source === 'sample' ? ', set SHEET_ID for the real sheet' : ''})${ADMIN_KEY ? '' : ' (checks page disabled: set ADMIN_KEY)'}`);
});
