// VICE PRESS screenshot driver.
// Serves app/ on localhost, checks the editor boots and an export produces
// a real PNG, then captures the shots from shots.json as JPEGs.
// Usage: node tools/shoot.mjs [--port 8902]
import { chromium } from '/home/hatch/workspace/makefun/tools/node_modules/playwright-core/index.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, statSync, readFileSync } from 'node:fs';

const repo = '/home/hatch/workspace/makefun/repos/makefun-gta6-cover-art-01';
const portArg = process.argv.indexOf('--port');
let port = 8902;
if (portArg !== -1) {
  const argPort = Number(process.argv[portArg + 1]);
  if (Number.isInteger(argPort)) port = argPort;
}

const results = [];
function check(name, ok, detail) {
  const entry = { name, ok, detail: detail ? detail : '' };
  results.push(entry);
  let line = (ok ? 'PASS  ' : 'FAIL  ') + name;
  if (detail) line += ' — ' + detail;
  console.log(line);
}

const server = spawn('node', ['serve.ts', '--port', String(port)], { cwd: repo, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1500));

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const requests = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('request', (r) => requests.push(r.url()));
page.on('requestfailed', (r) => errors.push('reqfail: ' + r.url()));

// --- Editor smoke test: boots, photos load, cover paints, export is a PNG ---
await page.goto('http://localhost:' + port + '/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__vicepress !== undefined, { timeout: 15000 });
await page.waitForTimeout(1500);
const loaded = await page.evaluate(() => window.__vicepress.photosLoaded);
check('editor boots, 4 sample photos loaded', loaded === 4, 'loaded=' + loaded);
const painted = await page.evaluate(() => {
  const c = window.__vicepress.canvas;
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let distinct = new Set();
  for (let i = 0; i < d.length; i += 4000) distinct.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
  return distinct.size;
});
check('cover canvas paints varied pixels', painted > 20, 'distinct=' + painted);
const pngSize = await page.evaluate(() => window.__vicepress.exportPng());
check('export produces a non-empty PNG', pngSize > 10000, pngSize + ' bytes');
// Switch layout and grade through the real buttons and confirm a repaint.
await page.click('[data-layout="grid"]');
await page.click('[data-grade="neon"]');
await page.waitForTimeout(400);
const afterSwitch = await page.evaluate(() => window.__vicepress.state.layout + '/' + window.__vicepress.state.grade);
check('layout + grade buttons work', afterSwitch === 'grid/neon', afterSwitch);
check('zero console errors in editor', errors.length === 0, errors.slice(0, 3).join(' | '));
const external = requests.filter((u) => u.startsWith('http://localhost:' + port) === false);
check('zero network requests outside localhost', external.length === 0, external.slice(0, 3).join(' | '));
await page.close();

// --- Screenshots ---
async function takeShot(shot) {
  const sp = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
  const serrs = [];
  sp.on('console', (m) => { if (m.type() === 'error') serrs.push(m.text()); });
  sp.on('pageerror', (e) => serrs.push('pageerror: ' + e.message));
  await sp.goto('http://localhost:' + port + '/' + shot.query, { waitUntil: 'load' });
  try {
    await sp.waitForFunction(() => window.__shotReady === true, { timeout: 60000, polling: 500 });
  } catch {
    console.log('TIMEOUT ' + shot.name + ' — capturing anyway');
  }
  await sp.waitForTimeout(400);
  const out = repo + '/screenshots/' + shot.name;
  await sp.screenshot({ path: out, type: 'jpeg', quality: 82 });
  const { size } = statSync(out);
  check('screenshot ' + shot.name + ' (' + size + ' bytes, limit 262144)', size <= 262144 && serrs.length === 0, serrs.slice(0, 2).join(' | '));
  await sp.close();
}

mkdirSync(repo + '/screenshots', { recursive: true });
const shots = JSON.parse(readFileSync(repo + '/shots.json', 'utf8'));
for (const shot of shots) await takeShot(shot);

await browser.close();
server.kill();
const failed = results.filter((r) => r.ok === false);
let summary = '\n' + (results.length - failed.length) + '/' + results.length + ' checks passed';
if (failed.length > 0) summary += ' — FAILED: ' + failed.map((r) => r.name).join(', ');
console.log(summary);
process.exit(failed.length > 0 ? 1 : 0);
