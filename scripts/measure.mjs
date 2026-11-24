// Frame-rate measurement for a mounted shelf.
//   node scripts/measure.mjs                    # this repo's demo, writes docs/MEASURED.md
//   node scripts/measure.mjs --dir ../site --notebook data --out none
// Setups: headed Chromium with vsync and the frame cap off (throughput), then the same with the
// CPU slowed 4x through CDP Emulation.setCPUThrottlingRate as a rough phone stand-in.
// Scenarios, 5 seconds each: scrub (the reader position sweeps back and forth across every page,
// one new position per frame, like a long drag) and open-close (the open and close animations in a loop).
import fs from 'node:fs';
import os from 'node:os';
import { chromium } from 'playwright';
import { serve } from './preview.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const dir = arg('dir');
const notebook = arg('notebook');
const out = arg('out', 'docs/MEASURED.md');
const [vw, vh] = arg('size', '1280x800').split('x').map(Number);
const css = arg('css'); // extra CSS to inject, for experiments
const warm = process.argv.includes('--warm'); // scrub through every page once before sampling, so images are already decoded
const only = arg('only'); // 'scrub' to skip the open-close loop

const server = await serve(0, dir);
const base = `http://localhost:${server.address().port}/`;
const setups = [
  { name: 'Uncapped', rate: 1 },
  { name: 'Uncapped, CPU 4x slower', rate: 4 },
];
const rows = [];
const browser = await chromium.launch({ headless: false, args: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
for (const s of setups) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('.nbs')?.__nbs);
  if (css) await page.addStyleTag({ content: css });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: s.rate });

  await page.evaluate((id) => {
    const api = document.querySelector('.nbs').__nbs;
    window.__m = api;
    const nb = id ? api.data.find((x) => x.id === id) : api.data.reduce((a, b) => (b.pages.length > a.pages.length ? b : a));
    window.__nb = nb.id;
    document.querySelector('.nbs').scrollIntoView({ block: 'center' });
  }, notebook);

  const sample = (fn) => page.evaluate(`new Promise((done) => {
    const times = []; const work = [];
    const start = performance.now();
    const step = (now) => {
      times.push(now);
      const t0 = performance.now();
      (${fn})(now - start);
      work.push(performance.now() - t0);
      if (now - start < 5000) requestAnimationFrame(step);
      else {
        const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
        done({ fps: (times.length - 1) / ((times.at(-1) - times[0]) / 1000), p95: gaps[Math.floor(gaps.length * 0.95)],
          slow: gaps.filter((g) => g > 1000 / 60).length / gaps.length, js: work.reduce((a, b) => a + b, 0) / work.length,
          inThreeD: window.__m.state.inThreeD });
      }
    };
    requestAnimationFrame(step);
  })`);

  // Scrub: open the notebook, then drive the position directly each frame.
  await page.evaluate(() => window.__m.open(window.__nb));
  await page.waitForFunction(() => !window.__m.state.busy && window.__m.state.position === window.__m.state.page);
  await page.waitForTimeout(300);
  const pages = await page.evaluate(() => window.__m.state.pages);
  if (warm) {
    for (let x = 0; x <= pages - 1; x += 0.25) { await page.evaluate((v) => window.__m.scrubTo(v), x); await page.waitForTimeout(30); }
    await page.evaluate(() => window.__m.scrubTo(0));
    await page.waitForTimeout(500);
  }
  const scrub = await sample(`(t) => window.__m.scrubTo((${pages} - 1) * (0.5 - 0.5 * Math.cos(t / 1400)))`);
  rows.push({ setup: s.name, scenario: `scrub across ${pages} pages`, ...scrub });
  console.log(s.name, 'scrub', scrub.fps.toFixed(0), 'fps', scrub.p95.toFixed(2), 'ms p95');
  await page.evaluate(() => { window.__m.scrubTo(window.__m.state.page); });
  await page.evaluate(() => window.__m.close());
  await page.waitForFunction(() => window.__m.state.view === 'shelf' && !window.__m.state.busy);

  if (only === 'scrub') { await page.close(); continue; }
  // Open and close in a loop while counting frames.
  await page.evaluate(() => {
    window.__loop = true;
    (async () => {
      while (window.__loop) {
        await window.__m.open(window.__nb);
        await new Promise((r) => setTimeout(r, 400));
        await window.__m.close();
        await new Promise((r) => setTimeout(r, 150));
      }
    })();
  });
  const oc = await sample('() => {}');
  await page.evaluate(() => { window.__loop = false; });
  rows.push({ setup: s.name, scenario: 'open and close loop', ...oc });
  console.log(s.name, 'open-close', oc.fps.toFixed(0), 'fps', oc.p95.toFixed(2), 'ms p95');
  await page.waitForTimeout(1500);
  await page.close();
}
const renderer = await (async () => {
  const p = await browser.newPage();
  const r = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await p.close();
  return r;
})();
await browser.close();
server.close();

const cpu = os.cpus()[0].model.trim();
const table = [
  '| Setup | Scenario | Frames per second | 95th percentile frame time | Frames over 16.7 ms | Script per frame | Pages in 3D |',
  '|---|---|---:|---:|---:|---:|---:|',
  ...rows.map((r) => `| ${r.setup} | ${r.scenario} | ${r.fps.toFixed(0)} | ${r.p95.toFixed(1)} ms | ${(r.slow * 100).toFixed(1)}% | ${r.scenario.startsWith("scrub") ? r.js.toFixed(2) + " ms" : "n/a"} | ${r.inThreeD} |`),
];
console.log(table.join('\n'));
if (out !== 'none') {
  fs.writeFileSync(new URL(`../${out}`, import.meta.url), [
    '# Measured frame rate',
    '',
    `Run with \`npm run measure\` on ${new Date().toISOString().slice(0, 10)}. Headed Chromium (Playwright 1.65.1), window ${vw} x ${vh}, device pixel ratio 1, vsync and the frame cap off, 5 seconds per scenario. CPU: ${cpu}. GPU: ${renderer.replace(/\|/g, '/')}.`,
    '',
    ...table,
    '',
    '"CPU 4x slower" uses the DevTools CPU throttle (`Emulation.setCPUThrottlingRate`, rate 4). It slows script and layout, not the GPU, so it is a rough stand-in for a mid-range phone, not a real one.',
    '',
    '"Script per frame" is the time spent in the shelf\'s own code for one frame (placing the pages); the rest of each frame is the browser compositing.',
    '',
  ].join('\n'));
  console.log('wrote', out);
}
