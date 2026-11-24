// README images: docs/shelf.png, docs/open.png, docs/spread.png, docs/preview.png and docs/demo.gif
// (open, scrub through every page, close). Needs ffmpeg on PATH for the GIF.
// The open and close animations are slowed with CDP Animation.setPlaybackRate so each frame can be captured;
// page positions are set directly with scrubTo().
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { serve } from './preview.mjs';

const docs = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const server = await serve(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();

async function load(w, h, dpr = 1) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, colorScheme: 'light' });
  await p.goto(base);
  await p.waitForFunction(() => window.__shelf);
  await p.waitForTimeout(300);
  return p;
}
const settle = (p) => p.waitForFunction(() => { const s = window.__shelf.state; return !s.busy && s.position === s.page; });

// Stills.
{
  const p = await load(1280, 800, 1.25);
  await p.screenshot({ path: path.join(docs, 'shelf.png') });
  await p.locator('.nbs-cover').first().click();
  await settle(p);
  await p.evaluate(() => window.__shelf.goTo(3));
  await settle(p);
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(docs, 'open.png') });
  await p.evaluate(() => { window.__shelf._scrub = true; window.__shelf.scrubTo(1.5); });
  await p.waitForTimeout(100);
  await p.screenshot({ path: path.join(docs, 'spread.png') });
  await p.screenshot({ path: path.join(docs, 'preview.png') });
  await p.close();
}

// GIF frames.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbs-'));
let f = 0;
const p = await load(720, 450);
const shot = async (n = 1) => {
  const buf = await p.screenshot();
  for (let i = 0; i < n; i++) fs.writeFileSync(path.join(tmp, `f${String(f++).padStart(4, '0')}.png`), buf);
};
const cdp = await p.context().newCDPSession(p);
await cdp.send('Animation.enable');
await shot(8);
await p.locator('.nbs-cover').nth(0).hover();
await p.waitForTimeout(450);
await shot(8);
await p.evaluate(() => { window.__shelf._scrub = true; });
await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
await p.locator('.nbs-cover').nth(0).click();
for (let i = 0; i < 16; i++) { await p.waitForTimeout(260); await shot(); }
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
await p.waitForFunction(() => !window.__shelf.state.busy);
const pages = await p.evaluate(() => window.__shelf.state.pages);
for (let x = 0; x <= pages - 1 + 1e-6; x += 0.125) {
  await p.evaluate((v) => window.__shelf.scrubTo(v), x);
  await shot(Math.abs(x - Math.round(x)) < 1e-6 ? 5 : 1);
}
await shot(8);
for (let x = pages - 1; x >= -1e-6; x -= 0.25) {
  await p.evaluate((v) => window.__shelf.scrubTo(v), Math.max(0, x));
  await shot();
}
await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
await p.evaluate(() => { window.__shelf.close(); });
for (let i = 0; i < 18; i++) { await p.waitForTimeout(260); await shot(); }
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
await p.waitForTimeout(800);
await shot(10);
await p.close();
await browser.close();
server.close();

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '12', '-i', path.join(tmp, 'f%04d.png'),
  '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', path.join(docs, 'demo.gif')]);
fs.rmSync(tmp, { recursive: true });
console.log(`${f} frames, wrote docs/demo.gif and stills`);
