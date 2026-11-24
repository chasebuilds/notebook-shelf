// Headless smoke test in Chromium: loads the demo, opens a book, scrubs by drag and keys,
// reaches the last page and closes, checks reduced motion, phone width and accessibility basics.
import { chromium } from 'playwright';
import { serve } from '../scripts/preview.mjs';

const server = await serve(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();

const failures = [];
const check = (ok, label) => {
  if (!ok) failures.push(label);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
};

async function open(path = '', options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  // Record every Web Animations keyframe property so we can check only transform and opacity animate.
  await context.addInitScript(() => {
    window.__animProps = new Set();
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (frames, opts) {
      (Array.isArray(frames) ? frames : [frames]).forEach((f) => Object.keys(f).forEach((k) => { if (!['offset', 'easing', 'composite'].includes(k)) window.__animProps.add(k); }));
      return orig.call(this, frames, opts);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + path);
  return { page, errors, context };
}
const state = (page) => page.evaluate(() => window.__shelf.state);
const idle = (page) => page.waitForFunction(() => { const s = window.__shelf.state; return !s.busy && s.position === s.page; }, null, { timeout: 5000 });

// Accessibility basics, axe-style: names on buttons and links, alt on images, unique ids, lang.
const a11y = (page) => page.evaluate(() => {
  const bad = [];
  const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const name = (e) => (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || '').trim();
  document.querySelectorAll('button, a[href], [role=button]').forEach((e) => { if (visible(e) && !name(e)) bad.push(`unnamed ${e.tagName} ${e.className}`); });
  document.querySelectorAll('img').forEach((e) => { if (!e.hasAttribute('alt')) bad.push(`img without alt ${e.src}`); });
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  ids.filter((id, i) => ids.indexOf(id) !== i).forEach((id) => bad.push(`duplicate id ${id}`));
  if (!document.documentElement.lang) bad.push('no lang');
  document.querySelectorAll('svg').forEach((s) => { if (s.closest('button') && s.getAttribute('aria-hidden') !== 'true') bad.push('icon svg not hidden'); });
  return bad;
});

try {
  // 1. Desktop: load, open with a click, drag, keys, last page, close.
  {
    const { page, errors, context } = await open();
    await page.waitForFunction(() => window.__shelf);
    const covers = await page.locator('.nbs-shelf > li > button.nbs-cover').count();
    check(covers === 5, `shelf is a real list of ${covers} cover buttons`);
    check((await a11y(page)).length === 0, `accessibility basics on the shelf ${JSON.stringify(await a11y(page))}`);

    await page.locator('.nbs-cover').first().click();
    await idle(page);
    let s = await state(page);
    check(s.view === 'open' && s.notebook === 'field-notes' && s.page === 1, `click opens the notebook at page 1 (${s.view}, ${s.notebook}, page ${s.page})`);
    check(await page.evaluate(() => document.querySelector('.nbs-reader').contains(document.activeElement)), 'focus moved into the open book');
    check((await page.locator('.nbs-page').count()) === s.pages && (await page.locator('ol.nbs-book > li').count()) === s.pages, `pages are a real list (${s.pages} items: cover, 4 pages, end)`);
    check((await a11y(page)).length === 0, `accessibility basics in the open book ${JSON.stringify(await a11y(page))}`);

    // Drag left about one page width: should move forward one page.
    const box = await page.locator('.nbs-stage').boundingBox();
    const cy = box.y + box.height * 0.85;
    let maxIn = 0;
    await page.mouse.move(box.x + box.width * 0.7, cy);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(box.x + box.width * 0.7 - i * 15, cy);
      maxIn = Math.max(maxIn, (await state(page)).inThreeD);
    }
    const mid = (await state(page)).position;
    await page.mouse.up();
    await idle(page);
    s = await state(page);
    check(mid > 1.2 && s.page >= 2, `mouse drag scrubs pages (position ${mid.toFixed(2)} mid-drag, settled on page ${s.page})`);

    // Touch-style swipe with pointer events (CDP touch), to the right goes back.
    const cdp = await context.newCDPSession(page);
    const tx = box.x + box.width * 0.3;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: cy }] });
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + i * 25, y: cy }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await idle(page);
    const back = await state(page);
    check(back.page < s.page, `touch swipe right goes back (page ${s.page} to ${back.page})`);

    await page.keyboard.press('ArrowRight');
    await idle(page);
    const k1 = (await state(page)).page;
    await page.keyboard.press('ArrowLeft');
    await idle(page);
    const k2 = (await state(page)).page;
    check(k1 === back.page + 1 && k2 === back.page, `Right and Left arrows flip (${back.page} to ${k1} to ${k2})`);

    for (let i = 0; i < 8 && (await state(page)).page < (await state(page)).pages - 1; i++) {
      await page.keyboard.press('ArrowRight');
      maxIn = Math.max(maxIn, (await state(page)).inThreeD);
      await page.waitForTimeout(120);
    }
    await idle(page);
    s = await state(page);
    const endText = await page.locator('.nbs-page').last().innerText();
    check(s.page === s.pages - 1 && /bye/i.test(endText), `reached the last page with the sign-off ("${endText.split('\n')[0]}")`);
    check(maxIn <= 9, `at most ${maxIn} pages in 3D at once (cap 9 with window 3)`);

    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.__shelf.state.view === 'shelf' && !window.__shelf.state.busy, null, { timeout: 5000 });
    check(await page.evaluate(() => document.activeElement?.dataset.id === 'field-notes'), 'Right on the last page closes the book and focus returns to its cover');
    check(await page.locator('.nbs-reader').isHidden(), 'reader is hidden after close');

    // Keyboard only: Tab to the second cover, Enter opens, Escape closes.
    await page.keyboard.press('ArrowRight');
    check(await page.evaluate(() => document.activeElement?.dataset.id === 'soup-log'), 'Right arrow on the shelf moves focus to the next cover');
    await page.keyboard.press('Enter');
    await idle(page);
    s = await state(page);
    check(s.view === 'open' && s.notebook === 'soup-log', 'Enter opens the focused notebook');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__shelf.state.view === 'shelf' && !window.__shelf.state.busy, null, { timeout: 5000 });
    check(await page.evaluate(() => document.activeElement?.dataset.id === 'soup-log'), 'Escape closes and focus returns to the cover');

    // Close button and link on a page.
    await page.locator('.nbs-cover[data-id="how-it-works"]').click();
    await idle(page);
    const href = await page.locator('.nbs-page:not([inert]) .nbs-links a').first().getAttribute('href');
    check(/github\.com\/chasebuilds\/notebook-shelf/.test(href), 'current page has a real link');
    await page.getByRole('button', { name: 'Close notebook' }).click();
    await page.waitForFunction(() => window.__shelf.state.view === 'shelf' && !window.__shelf.state.busy, null, { timeout: 5000 });
    check(true, 'close button closes');

    const props = await page.evaluate(() => [...window.__animProps]);
    check(props.every((p) => p === 'transform' || p === 'opacity'), `animations touch only transform and opacity (${props.join(', ')})`);

    await page.locator('[data-action="add"]').click();
    check((await page.locator('.nbs-cover').count()) === 6, 'add button appends a notebook with setData()');
    check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
    await context.close();
  }

  // 2. Reduced motion: no 3D, one page shown at a time.
  {
    const { page, errors, context } = await open('', { reducedMotion: 'reduce' });
    await page.waitForFunction(() => window.__shelf);
    await page.locator('.nbs-cover').nth(2).click();
    await idle(page);
    await page.keyboard.press('ArrowRight');
    await idle(page);
    // Let the 0.18 s fade finish: wait until exactly one page is fully opaque.
    await page.waitForFunction(() => [...document.querySelectorAll('.nbs-page')].filter((p) => getComputedStyle(p).opacity === '1').length === 1, null, { timeout: 3000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const pages = [...document.querySelectorAll('.nbs-page.nbs-in')];
      return {
        reduce: window.__shelf.state.reducedMotion,
        page: window.__shelf.state.page,
        threeD: [...document.querySelectorAll('.nbs-page')].filter((p) => /rotate|translate3d/.test(p.style.transform)).length,
        visible: pages.filter((p) => p.style.opacity === '1').length, // target state; the fade itself runs on the browser clock
        all: [...document.querySelectorAll('.nbs-page')].map((p) => `${p.classList.contains('nbs-in') ? 'in' : 'out'}:${getComputedStyle(p).opacity}`).join(' '),
      };
    });
    check(r.reduce && r.threeD === 0 && r.visible === 1 && r.page === 2, `reduced motion: no 3D transforms, ${r.visible} page visible, keys still flip (page ${r.page})${r.visible === 1 ? '' : ' [' + r.all + ']'}`);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__shelf.state.view === 'shelf' && !window.__shelf.state.busy, null, { timeout: 3000 });
    check(true, 'reduced motion: Escape closes');
    check(errors.length === 0, 'reduced motion: no console errors');
    await context.close();
  }

  // 3. Phone width: no sideways scroll in either view.
  {
    const { page, errors, context } = await open('', { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.waitForFunction(() => window.__shelf);
    const sw = () => page.evaluate(() => document.documentElement.scrollWidth);
    const shelfW = await sw();
    await page.locator('.nbs-cover').first().tap();
    await idle(page);
    const openW = await sw();
    const btns = await page.evaluate(() => [...document.querySelectorAll('.nbs-rbar button')].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width >= 44; }));
    check(shelfW <= 375 && openW <= 375, `375 px: no sideways scroll (scrollWidth ${shelfW} on shelf, ${openW} open)`);
    check(btns, '375 px: reader buttons on screen and at least 44 px');
    check(errors.length === 0, '375 px: no console errors');
    await context.close();
  }

  // 4. One-script drop-in mounts from inline JSON.
  {
    const { page, errors, context } = await open('demo/drop-in.html');
    await page.waitForSelector('.nbs-cover');
    check((await page.locator('.nbs-cover').count()) === 2 && (await page.locator('.nbs-title').innerText()) === 'Two notebooks', 'drop-in div mounts itself from inline JSON');
    check(errors.length === 0, 'drop-in: no console errors');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nall smoke checks passed');
