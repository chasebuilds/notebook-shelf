/*! notebook-shelf v1.0.0 | MIT | https://github.com/chasebuilds/notebook-shelf */
// A shelf of notebooks that open in 3D. Vanilla JS and CSS 3D transforms, no dependencies.
// Classic script: sets window.NotebookShelf and auto-mounts any [data-notebook-shelf] element.
(function (g) {
  'use strict';
  const VERSION = '1.0.0';

  const PATHS = {
    more: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
    share: '<path d="M12 14V4M8 8l4-4 4 4"/><path d="M7 11H6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.2"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  };
  const icon = (name, size = 20) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || ''}</svg>`;

  const PALETTE = ['#e8a39d', '#f1c67c', '#9ccfb2', '#8eb2e6', '#c5a4e2', '#efa6c6', '#a3d4de', '#d8c19c', '#b5c37b', '#f0b48f'];
  const PATTERNS = ['plain', 'dots', 'lines', 'grid', 'stripe'];

  const CSS = `
.nbs{--nbs-bg1:#c6cbef;--nbs-bg2:#98a2d1;--nbs-ink:#222744;--nbs-ink2:rgba(34,39,68,.68);--nbs-btn:rgba(255,255,255,.5);--nbs-btn-hi:rgba(255,255,255,.85);--nbs-edge:rgba(255,255,255,.65);--nbs-shadow:rgba(26,30,72,.38);--nbs-paper:#fbfaf6;--nbs-paper-ink:#262a44;--nbs-rule:rgba(88,102,170,.13);--nbs-focus:#3a43c4;
position:relative;isolation:isolate;display:flex;flex-direction:column;min-height:var(--nbs-height,580px);border-radius:var(--nbs-radius,28px);color:var(--nbs-ink);background:radial-gradient(120% 90% at 50% 0%,var(--nbs-bg1),var(--nbs-bg2));overflow:hidden;-webkit-tap-highlight-color:transparent}
@media (prefers-color-scheme:dark){.nbs{--nbs-bg1:#3b4273;--nbs-bg2:#1d2240;--nbs-ink:#eef0ff;--nbs-ink2:rgba(238,240,255,.7);--nbs-btn:rgba(255,255,255,.1);--nbs-btn-hi:rgba(255,255,255,.22);--nbs-edge:rgba(255,255,255,.18);--nbs-shadow:rgba(0,0,0,.6);--nbs-focus:#b8bfff}}
.nbs *,.nbs *::before,.nbs *::after{box-sizing:border-box}
.nbs :focus-visible{outline:3px solid var(--nbs-focus);outline-offset:3px}
.nbs-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.nbs-home{flex:1;display:flex;flex-direction:column;justify-content:center;padding:14px 0 22px}
.nbs[data-view=open] .nbs-home{visibility:hidden}
.nbs-top{position:absolute;top:0;left:0;right:0;z-index:2;display:flex;justify-content:flex-end;gap:8px;padding:12px 14px}
.nbs-top:empty{display:none}
.nbs-round{flex:none;width:44px;height:44px;padding:0;border-radius:50%;display:inline-grid;place-items:center;border:1px solid var(--nbs-edge);background:var(--nbs-btn);color:inherit;font:inherit;cursor:pointer;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);transition:background-color .2s,transform .2s}
.nbs-round:hover{background:var(--nbs-btn-hi)}
.nbs-round:active{transform:scale(.93)}
.nbs-round:disabled{opacity:.4;cursor:default}
.nbs-head{text-align:center;padding:40px 18px 0}
.nbs-title{margin:0;font-size:clamp(28px,5.4vw,50px);font-weight:700;letter-spacing:-.03em;line-height:1.08;min-height:1.08em;overflow-wrap:anywhere;text-wrap:balance}
.nbs-count{margin:6px 0 0;font-size:13px;color:var(--nbs-ink2);font-variant-numeric:tabular-nums}
.nbs-shelfwrap{position:relative;margin-top:14px}
.nbs-shelf{list-style:none;margin:0;padding:34px 22px 0;display:flex;align-items:flex-end;gap:var(--nbs-gap,16px);overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scrollbar-width:none}
.nbs-shelf::-webkit-scrollbar{display:none}
.nbs-shelf::before,.nbs-shelf::after{content:"";flex:none;margin:auto}
.nbs-item{flex:none;scroll-snap-align:center}
.nbs-cover{position:relative;display:block;width:var(--nbs-cw,clamp(80px,9.2vw,112px));aspect-ratio:5/7;padding:0;margin:0;border:0;border-radius:5px 12px 12px 5px;background:var(--nbs-c) center/cover no-repeat;color:#262a44;font:inherit;cursor:pointer;box-shadow:inset 7px 0 0 rgba(0,0,0,.13),inset 10px 0 6px -5px rgba(255,255,255,.4),0 20px 16px -14px var(--nbs-shadow),0 2px 3px rgba(0,0,0,.1);transition:transform .38s cubic-bezier(.2,.9,.25,1.25)}
.nbs-cover::after{content:"";position:absolute;right:-4px;top:5px;bottom:5px;width:5px;border-radius:0 3px 3px 0;background:repeating-linear-gradient(180deg,#fffdf8 0 2px,#dcd8cc 2px 3px)}
.nbs-cover:hover,.nbs-cover:focus-visible{transform:translateY(-12px) rotate(-2deg)}
.nbs-pat::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none}
.nbs-p-dots::before{background:radial-gradient(rgba(255,255,255,.42) 1.3px,transparent 1.7px) 3px 3px/11px 11px}
.nbs-p-lines::before{background:repeating-linear-gradient(0deg,rgba(255,255,255,.3) 0 2px,transparent 2px 10px)}
.nbs-p-grid::before{background:linear-gradient(rgba(255,255,255,.28) 1px,transparent 1px) 0 0/12px 12px,linear-gradient(90deg,rgba(255,255,255,.28) 1px,transparent 1px) 0 0/12px 12px}
.nbs-p-stripe::before{background:repeating-linear-gradient(135deg,rgba(255,255,255,.26) 0 6px,transparent 6px 14px)}
.nbs-label{position:absolute;left:13%;right:13%;top:17%;padding:6px 5px;border-radius:5px;background:rgba(255,255,255,.9);font-size:10.5px;font-weight:600;line-height:1.2;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.12);overflow-wrap:anywhere}
.nbs-plank{height:16px;margin:0 14px;border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.6),rgba(255,255,255,.18));box-shadow:0 16px 22px -12px var(--nbs-shadow),inset 0 1px 0 rgba(255,255,255,.75)}
.nbs-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:14px;margin-top:26px;padding:0 16px}
.nbs-actions:empty{display:none}
.nbs-reader{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column}
.nbs-reader[hidden]{display:none}
.nbs-rbar{display:flex;align-items:center;gap:8px;padding:12px 14px 0}
.nbs-rtitle{flex:1;min-width:0;margin:0;text-align:center;font-size:15px;font-weight:600;line-height:1.25}
.nbs-rtitle span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nbs-rtitle small{display:block;font-size:12px;font-weight:500;color:var(--nbs-ink2);font-variant-numeric:tabular-nums}
.nbs-stage{position:relative;flex:1;min-height:0;overflow:hidden;perspective:calc(var(--nbs-pw,300px)*3.6);perspective-origin:50% 42%;touch-action:pan-y;cursor:grab;-webkit-user-select:none;user-select:none}
.nbs-stage:focus-visible{outline-offset:-6px;border-radius:18px}
.nbs-dragging .nbs-stage{cursor:grabbing}
.nbs-book{position:absolute;left:50%;top:50%;width:0;height:0;margin:0;padding:0;list-style:none;transform-style:preserve-3d}
.nbs-page{position:absolute;left:calc(var(--nbs-pw)/-2);top:calc(var(--nbs-ph)/-2);width:var(--nbs-pw);height:var(--nbs-ph);visibility:hidden;font-size:clamp(12px,calc(var(--nbs-pw)*.043),14px)}
.nbs-page.nbs-in{visibility:visible;will-change:transform}
.nbs-paper{position:absolute;inset:0;display:flex;flex-direction:column;gap:.75em;padding:1.3em 1.3em 1.4em;border-radius:5px 12px 12px 5px;color:var(--nbs-paper-ink);background:repeating-linear-gradient(180deg,transparent 0 23px,var(--nbs-rule) 23px 24px) 0 10px,var(--nbs-paper);box-shadow:0 22px 40px -20px var(--nbs-shadow),0 2px 6px rgba(0,0,0,.09);overflow:hidden}
.nbs-shade,.nbs-curl{position:absolute;top:0;bottom:0;pointer-events:none;opacity:0;border-radius:5px 12px 12px 5px}
.nbs-shade{left:0;right:0;background:#1b1f45}
.nbs-curl{width:42%;right:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.6) 72%,rgba(20,24,60,.18))}
.nbs-page[data-side=l] .nbs-curl{right:auto;left:0;transform:scaleX(-1)}
.nbs-img{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:8px;background:rgba(88,102,170,.14);flex:none;-webkit-user-drag:none}
.nbs-ptitle{margin:0;font-size:1.2em;font-weight:700;line-height:1.25;overflow-wrap:anywhere}
.nbs-text{margin:0;font-size:1em;line-height:1.45;color:#41465f}
.nbs-note{margin:0;padding:.55em .75em;border-radius:10px;background:rgba(62,170,128,.15);font-size:.92em;line-height:1.4}
.nbs-note b{display:block;font-size:.78em;letter-spacing:.06em;text-transform:uppercase;color:#17704f}
.nbs-links{margin-top:auto;display:flex;flex-wrap:wrap;gap:8px}
.nbs-links a,.nbs-endbtn{display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:999px;font:inherit;font-size:max(13px,.95em);font-weight:600;text-decoration:none;color:#262a44;background:#fff;border:1px solid rgba(38,42,68,.18);cursor:pointer;-webkit-user-drag:none}
.nbs-links a:hover,.nbs-endbtn:hover{background:#eef0fb}
.nbs-paper.nbs-cv{justify-content:center;align-items:center;text-align:center;background-color:var(--nbs-c);background-image:none;box-shadow:inset 9px 0 0 rgba(0,0,0,.12),0 22px 40px -20px var(--nbs-shadow)}
.nbs-cv .nbs-ctitle{position:relative;margin:0;padding:.7em .8em;border-radius:8px;background:rgba(255,255,255,.92);font-size:1.45em;font-weight:700;line-height:1.2;max-width:86%;overflow-wrap:anywhere}
.nbs-cv p{position:relative;margin:0;font-size:.95em;font-weight:600}
.nbs-cv .nbs-hint{font-weight:500;opacity:.8;font-size:.85em}
.nbs-paper.nbs-end{justify-content:center;align-items:center;text-align:center;gap:1.4em}
.nbs-signoff{margin:0;font-size:2.1em;font-weight:700;letter-spacing:-.02em;line-height:1.1;transform:rotate(-3deg)}
.nbs-progress{flex:none;width:min(240px,60%);height:4px;margin:4px auto 18px;border-radius:4px;background:rgba(255,255,255,.4);overflow:hidden}
.nbs-progress i{display:block;height:100%;background:var(--nbs-ink);transform-origin:0 50%;transform:scaleX(0)}
.nbs-toast{position:absolute;left:50%;bottom:18px;z-index:5;transform:translateX(-50%);padding:8px 14px;border-radius:999px;background:var(--nbs-ink);color:var(--nbs-bg1);font-size:13px;font-weight:600;opacity:0;pointer-events:none;transition:opacity .2s}
.nbs-toast.nbs-show{opacity:1}
.nbs-reduce .nbs-page{transition:opacity .18s}
@media (prefers-reduced-motion:reduce){.nbs-cover,.nbs-round,.nbs-toast{transition:none}.nbs-cover:hover,.nbs-cover:focus-visible{transform:none}}
@media (max-width:480px){.nbs-head{padding-top:46px}.nbs-actions{gap:12px}}
`;

  function injectCSS(doc) {
    if (doc.getElementById('nbs-style')) return;
    const s = doc.createElement('style');
    s.id = 'nbs-style';
    s.textContent = CSS;
    (doc.head || doc.documentElement).prepend(s);
  }

  // Where page i sits when the reader is at a fractional position. d = i - position.
  // Center page is flat; neighbors fold back on a hinge at their inner edge like an accordion;
  // pages further out stack behind with a small peek. Returns numbers only, so it is easy to test.
  function layout(d, W, window_ = 3) {
    const s = d < 0 ? -1 : 1;
    const a = Math.abs(d);
    const t = Math.min(a, 1);
    const far = Math.max(a - 1, 0);
    const gap = W * 0.04;
    return {
      side: s,
      x: s * (t * (W + gap) + far * W * 0.16),
      z: Math.sin(Math.PI * t) * W * 0.3 - far * W * 0.5,
      rot: s * 68 * t,
      hinge: -s * W / 2,
      shade: Math.min(0.12 + 0.1 * far, 0.45) * t,
      curl: 4 * t * (1 - t) * 0.9,
      opacity: a <= window_ - 0.5 ? 1 : Math.max(0, window_ + 0.5 - a),
      visible: a < window_ + 0.5,
    };
  }

  const isColor = (c) => typeof c === 'string' && /^(#[0-9a-f]{3,8}|(rgb|hsl|oklch|oklab|lab|lch)a?\([^;{}"]*\)|[a-z]+)$/i.test(c.trim());
  const isSafeHref = (h) => typeof h === 'string' && !/^\s*(javascript|data|vbscript):/i.test(h);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const roundBtn = (name, label) => {
    const b = el('button', 'nbs-round');
    b.type = 'button';
    b.innerHTML = icon(name);
    b.setAttribute('aria-label', label);
    b.title = label;
    return b;
  };

  function normalize(data) {
    const list = Array.isArray(data) ? data : (data && data.notebooks) || [];
    return list.map((nb, i) => ({
      id: String(nb.id ?? `notebook-${i + 1}`),
      title: String(nb.title ?? `Notebook ${i + 1}`),
      subtitle: nb.subtitle ? String(nb.subtitle) : '',
      cover: {
        color: isColor(nb.cover?.color) ? nb.cover.color.trim() : PALETTE[i % PALETTE.length],
        pattern: PATTERNS.includes(nb.cover?.pattern) ? nb.cover.pattern : PATTERNS[i % PATTERNS.length],
        image: typeof nb.cover?.image === 'string' ? nb.cover.image : '',
      },
      pages: (nb.pages || []).map((p) => ({
        title: String(p.title ?? ''),
        text: p.text ? String(p.text) : '',
        note: p.note ? String(p.note) : '',
        noteLabel: p.noteLabel ? String(p.noteLabel) : '',
        image: typeof p.image === 'string' ? { src: p.image } : p.image && p.image.src ? p.image : null,
        links: (p.links || []).filter((l) => l && isSafeHref(l.href)).map((l) => ({ label: String(l.label ?? l.href), href: l.href, newTab: !!l.newTab })),
      })),
    }));
  }

  function mount(root, data, options = {}) {
    if (typeof root === 'string') root = document.querySelector(root);
    if (!root) throw new Error('NotebookShelf.mount: element not found');
    if (root.__nbs) root.__nbs.destroy();
    const doc = root.ownerDocument;
    if (options.injectCSS !== false) injectCSS(doc);
    if (data && !Array.isArray(data)) options = { ...data, ...options };
    const opts = {
      title: 'Notebooks',
      signoff: "ok, that's everything. bye for now :)",
      endButton: 'Back to the shelf',
      hint: 'Drag, swipe or use the arrow keys',
      noteLabel: 'Note',
      unit: 'page',
      window: 3,
      pageWidth: 340,
      actions: [],
      topActions: [],
      ...options,
    };
    let notebooks = normalize(data);
    const mq = g.matchMedia ? g.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    let reduce = opts.reducedMotion ?? mq.matches;

    // ---------- DOM ----------
    root.classList.add('nbs');
    root.textContent = '';
    root.dataset.view = 'shelf';
    const home = el('div', 'nbs-home');
    const top = el('div', 'nbs-top');
    const head = el('div', 'nbs-head');
    const bigTitle = el('p', 'nbs-title');
    const bigCount = el('p', 'nbs-count');
    bigTitle.setAttribute('aria-hidden', 'true');
    bigCount.setAttribute('aria-hidden', 'true');
    head.append(bigTitle, bigCount);
    const shelfWrap = el('div', 'nbs-shelfwrap');
    const shelf = el('ul', 'nbs-shelf');
    const plank = el('div', 'nbs-plank');
    plank.setAttribute('aria-hidden', 'true');
    shelfWrap.append(shelf, plank);
    const actions = el('div', 'nbs-actions');
    home.append(head, shelfWrap, actions);

    const reader = el('section', 'nbs-reader');
    reader.hidden = true;
    const rbar = el('div', 'nbs-rbar');
    const closeBtn = roundBtn('close', 'Close notebook');
    const rtitle = el('p', 'nbs-rtitle');
    const rtitleName = el('span');
    const rtitleCount = el('small');
    rtitle.append(rtitleName, rtitleCount);
    const prevBtn = roundBtn('prev', 'Previous page');
    const nextBtn = roundBtn('next', 'Next page');
    rbar.append(closeBtn, rtitle, prevBtn, nextBtn);
    const stage = el('div', 'nbs-stage');
    stage.tabIndex = 0;
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-roledescription', 'pages');
    const book = el('ol', 'nbs-book');
    stage.append(book);
    const progress = el('div', 'nbs-progress');
    progress.setAttribute('aria-hidden', 'true');
    const thumb = el('i');
    progress.append(thumb);
    const live = el('p', 'nbs-sr');
    live.setAttribute('aria-live', 'polite');
    reader.append(rbar, stage, progress, live);
    const toastEl = el('div', 'nbs-toast');
    toastEl.setAttribute('role', 'status');
    root.append(top, home, reader, toastEl);

    // ---------- state ----------
    let view = 'shelf';
    let current = -1; // open notebook index
    let pageEls = [];
    let n = 0;
    let pos = 0;
    let target = 0;
    let W = 300;
    let raf = 0;
    let last = 0;
    let shown = new Set();
    let drag = null;
    let suppressClick = false;
    let busy = false;
    let wheelAcc = 0;
    let wheelTimer = 0;
    const listeners = [];
    const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); listeners.push([t, type, fn, o]); };
    const emit = (type, detail) => root.dispatchEvent(new CustomEvent('notebookshelf:' + type, { detail }));
    const ctx = () => api;

    function setReduce(v) {
      reduce = v;
      root.classList.toggle('nbs-reduce', reduce);
      if (view === 'open') { pos = target; render(); }
    }
    setReduce(reduce);
    const onMq = (e) => { if (opts.reducedMotion == null) setReduce(e.matches); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);

    function makeAction(a, where) {
      const b = roundBtn(a.icon || 'more', a.label || a.icon || 'Action');
      if (a.id) b.dataset.action = a.id;
      on(b, 'click', (e) => a.onClick && a.onClick(ctx(), e, b));
      where.append(b);
    }
    opts.actions.forEach((a) => makeAction(a, actions));
    opts.topActions.forEach((a) => makeAction(a, top));

    const totalPages = () => notebooks.reduce((s, nb) => s + nb.pages.length, 0);
    const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
    function headDefault() {
      bigTitle.textContent = opts.title;
      bigCount.textContent = opts.subtitle || `${plural(notebooks.length, 'notebook')}, ${plural(totalPages(), opts.unit)}`;
    }
    function headFor(i) {
      const nb = notebooks[i];
      bigTitle.textContent = nb.title;
      bigCount.textContent = nb.subtitle || plural(nb.pages.length, opts.unit);
    }

    function renderShelf() {
      shelf.textContent = '';
      shelf.setAttribute('aria-label', opts.title);
      notebooks.forEach((nb, i) => {
        const li = el('li', 'nbs-item');
        const b = el('button', `nbs-cover nbs-pat nbs-p-${nb.cover.pattern}`);
        b.type = 'button';
        b.dataset.i = i;
        b.dataset.id = nb.id;
        b.style.setProperty('--nbs-c', nb.cover.color);
        if (nb.cover.image) b.style.backgroundImage = `url(${JSON.stringify(nb.cover.image)})`;
        b.setAttribute('aria-label', `Open ${nb.title}, ${plural(nb.pages.length, opts.unit)}`);
        const lab = el('span', 'nbs-label', nb.title);
        lab.setAttribute('aria-hidden', 'true');
        b.append(lab);
        li.append(b);
        shelf.append(li);
      });
      headDefault();
    }
    renderShelf();
    const coverEl = (i) => shelf.querySelector(`.nbs-cover[data-i="${i}"]`);

    on(shelf, 'click', (e) => {
      const b = e.target.closest('.nbs-cover');
      if (b) open(Number(b.dataset.i));
    });
    const hoverHead = (e) => {
      const b = e.target.closest && e.target.closest('.nbs-cover');
      if (b) headFor(Number(b.dataset.i));
    };
    on(shelf, 'pointerover', hoverHead);
    on(shelf, 'focusin', hoverHead);
    on(shelf, 'pointerleave', () => { if (!shelf.contains(doc.activeElement)) headDefault(); });
    on(shelf, 'focusout', (e) => { if (!shelf.contains(e.relatedTarget)) headDefault(); });
    on(shelf, 'keydown', (e) => {
      const b = e.target.closest('.nbs-cover');
      if (!b) return;
      const i = Number(b.dataset.i);
      const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: notebooks.length - 1 }[e.key];
      if (k == null) return;
      e.preventDefault();
      const nb = coverEl(Math.max(0, Math.min(notebooks.length - 1, k)));
      nb.focus();
      nb.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });

    // ---------- pages ----------
    function pageLabel(i) {
      if (i === 0) return 'Cover';
      if (i === n - 1) return 'Last page';
      return `Page ${i} of ${n - 2}`;
    }
    function buildPages(nb) {
      book.textContent = '';
      const leaves = [{ kind: 'cover' }, ...nb.pages.map((p) => ({ kind: 'page', p })), { kind: 'end' }];
      n = leaves.length;
      pageEls = leaves.map((leaf, i) => {
        const li = el('li', 'nbs-page');
        li.setAttribute('aria-roledescription', 'page');
        const paper = el('div', 'nbs-paper');
        if (leaf.kind === 'cover') {
          paper.classList.add('nbs-cv', 'nbs-pat', `nbs-p-${nb.cover.pattern}`);
          paper.style.setProperty('--nbs-c', nb.cover.color);
          if (nb.cover.image) paper.style.backgroundImage = `url(${JSON.stringify(nb.cover.image)})`;
          paper.append(el('h3', 'nbs-ctitle', nb.title), el('p', '', plural(nb.pages.length, opts.unit)), el('p', 'nbs-hint', opts.hint));
        } else if (leaf.kind === 'end') {
          paper.classList.add('nbs-end');
          const bye = el('p', 'nbs-signoff', opts.signoff);
          const back = el('button', 'nbs-endbtn', opts.endButton);
          back.type = 'button';
          back.addEventListener('click', () => close());
          paper.append(bye, back);
        } else {
          const p = leaf.p;
          if (p.image) {
            const img = el('img', 'nbs-img');
            img.alt = p.image.alt || '';
            img.decoding = 'async';
            img.loading = 'lazy';
            img.draggable = false;
            if (p.image.width) img.width = p.image.width;
            if (p.image.height) img.height = p.image.height;
            img.dataset.src = p.image.src;
            paper.append(img);
          }
          paper.append(el('h3', 'nbs-ptitle', p.title));
          if (p.text) paper.append(el('p', 'nbs-text', p.text));
          if (p.note) {
            const note = el('p', 'nbs-note');
            note.append(el('b', '', p.noteLabel || opts.noteLabel), doc.createTextNode(p.note));
            paper.append(note);
          }
          if (p.links.length) {
            const links = el('div', 'nbs-links');
            p.links.forEach((l) => {
              const a = el('a', '', l.label);
              a.href = l.href;
              a.draggable = false;
              if (l.newTab) { a.target = '_blank'; a.rel = 'noopener'; }
              links.append(a);
            });
            paper.append(links);
          }
        }
        const shade = el('i', 'nbs-shade');
        const curl = el('i', 'nbs-curl');
        li.append(paper, shade, curl);
        li._shade = shade;
        li._curl = curl;
        li._side = 0;
        book.append(li);
        return li;
      });
      shown = new Set();
    }

    function measure() {
      const r = stage.getBoundingClientRect();
      W = Math.max(160, Math.round(Math.min(opts.pageWidth, r.width * 0.8, (r.height - 28) / 1.3)));
      const H = Math.round(Math.min(r.height - 28, W * 1.75));
      stage.style.setProperty('--nbs-pw', W + 'px');
      stage.style.setProperty('--nbs-ph', H + 'px');
    }

    // Runs only when the target page changes: who is focusable, which images load, what is announced.
    function settle() {
      const t = Math.round(target);
      pageEls.forEach((li, i) => {
        const cur = i === t;
        li.inert = !cur;
        if (cur) li.removeAttribute('aria-hidden'); else li.setAttribute('aria-hidden', 'true');
        li.setAttribute('aria-label', pageLabel(i));
        // Load and decode images a full window ahead, so a page is ready before it turns into view.
        if (Math.abs(i - t) <= opts.window + 1) {
          const img = li.querySelector('img[data-src]');
          if (img) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            if (img.decode) img.decode().catch(() => {});
          }
        }
      });
      const nb = notebooks[current];
      rtitleCount.textContent = t === 0 ? 'Cover' : t === n - 1 ? 'The end' : `${t} / ${n - 2}`;
      prevBtn.disabled = t === 0;
      const leaf = t > 0 && t < n - 1 ? nb.pages[t - 1].title : '';
      live.textContent = `${pageLabel(t)}${leaf ? ': ' + leaf : ''}`;
      if (opts.onPage) opts.onPage(t, nb, api);
      emit('page', { page: t, notebook: nb.id });
    }

    function render() {
      const R = opts.window;
      const lo = Math.max(0, Math.floor(pos - R - 1));
      const hi = Math.min(n - 1, Math.ceil(pos + R + 1));
      const now = new Set();
      for (let i = lo; i <= hi; i++) {
        const li = pageEls[i];
        if (reduce) {
          const cur = i === Math.round(target);
          if (cur) now.add(i);
          li.style.transform = 'none';
          li.style.opacity = cur ? '1' : '0';
          continue;
        }
        const L = layout(i - pos, W, R);
        if (!L.visible) continue;
        now.add(i);
        li.style.transform = `translate3d(${L.x.toFixed(2)}px,0,${L.z.toFixed(2)}px) translateX(${L.hinge}px) rotateY(${L.rot.toFixed(3)}deg) translateX(${-L.hinge}px)`;
        li.style.opacity = L.opacity.toFixed(3);
        li._shade.style.opacity = L.shade.toFixed(3);
        li._curl.style.opacity = L.curl.toFixed(3);
        if (li._side !== L.side) { li._side = L.side; li.dataset.side = L.side < 0 ? 'l' : 'r'; }
      }
      for (const i of now) if (!shown.has(i)) pageEls[i].classList.add('nbs-in');
      for (const i of shown) if (!now.has(i)) pageEls[i].classList.remove('nbs-in');
      shown = now;
      thumb.style.transform = `scaleX(${n > 1 ? Math.max(0, Math.min(1, pos / (n - 1))).toFixed(4) : 1})`;
    }

    function tick(now) {
      const dt = Math.min(64, now - (last || now)) / 1000;
      last = now;
      if (!drag && !api._scrub) {
        if (reduce) pos = target;
        else {
          pos += (target - pos) * (1 - Math.exp(-dt * 9));
          if (Math.abs(target - pos) < 0.0015) pos = target;
        }
      }
      render();
      if (pos !== target || drag || api._scrub) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }

    function goTo(i) {
      if (view !== 'open') return;
      const t = Math.max(0, Math.min(n - 1, Math.round(i)));
      const changed = t !== Math.round(target);
      target = t;
      if (changed) settle();
      kick();
    }
    // While dragging or scrubbing, the page under the center becomes the target (counter, images, focus).
    function follow() {
      const r = Math.max(0, Math.min(n - 1, Math.round(pos)));
      if (r !== target) { target = r; settle(); }
    }
    const next = () => { if (Math.round(target) >= n - 1) close(); else goTo(target + 1); };
    const prev = () => goTo(target - 1);

    on(closeBtn, 'click', () => close());
    on(prevBtn, 'click', prev);
    on(nextBtn, 'click', next);
    on(reader, 'keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key;
      if (k === 'Escape') { e.preventDefault(); close(); }
      else if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
      else if (k === 'Home' && e.target === stage) { e.preventDefault(); goTo(0); }
      else if (k === 'End' && e.target === stage) { e.preventDefault(); goTo(n - 1); }
    });

    // Drag or swipe to scrub. Capture starts only after a 6 px move so taps on links still work.
    on(stage, 'pointerdown', (e) => {
      if (view !== 'open' || busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: pos, live: false, hist: [[e.timeStamp, e.clientX]] };
    });
    on(stage, 'pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      if (!drag.live) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y0)) return;
        drag.live = true;
        drag.x0 = e.clientX;
        drag.p0 = pos;
        try { stage.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
        root.classList.add('nbs-dragging');
        kick();
        return;
      }
      pos = Math.max(-0.35, Math.min(n - 0.65, drag.p0 - dx / (W * 0.85)));
      follow();
      drag.hist.push([e.timeStamp, e.clientX]);
      if (drag.hist.length > 6) drag.hist.shift();
      if (reduce) render();
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      root.classList.remove('nbs-dragging');
      if (!d.live) {
        if (e.type === 'pointerup') {
          const cur = pageEls[Math.round(target)];
          if (!cur.contains(e.target)) {
            const r = stage.getBoundingClientRect();
            if (e.clientX < r.left + r.width / 2) prev(); else goTo(target + 1);
          }
        }
        return;
      }
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      const [t0, x0] = d.hist[0];
      const [t1, x1] = d.hist[d.hist.length - 1];
      const v = t1 > t0 ? (x1 - x0) / (t1 - t0) : 0; // px per ms
      const fling = Math.max(-2, Math.min(2, (-v * 220) / (W * 0.85)));
      goTo(Math.round(pos + fling));
      if (reduce) pos = target;
      kick();
    };
    on(stage, 'pointerup', endDrag);
    on(stage, 'pointercancel', endDrag);
    on(stage, 'click', (e) => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); } }, true);
    on(stage, 'dragstart', (e) => e.preventDefault());
    on(stage, 'wheel', (e) => {
      if (view !== 'open' || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      wheelAcc += e.deltaX;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { wheelAcc = 0; }, 160);
      if (Math.abs(wheelAcc) > 60) { goTo(target + Math.sign(wheelAcc)); wheelAcc = 0; }
    }, { passive: false });

    const ro = g.ResizeObserver ? new ResizeObserver(() => { if (view === 'open') { measure(); render(); } }) : null;
    if (ro) ro.observe(root);

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = (fn, ms) => new Promise((resolve) => {
      const t0 = performance.now();
      const step = () => (fn() || performance.now() - t0 > ms ? resolve() : requestAnimationFrame(step));
      step();
    });
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    function flyFrom(cover) {
      const c = cover.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      const ph = parseFloat(stage.style.getPropertyValue('--nbs-ph'));
      const k = c.width / W;
      const dx = c.left + c.width / 2 - (s.left + s.width / 2);
      const dy = c.top + c.height / 2 - (s.top + s.height / 2);
      return `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${k.toFixed(3)},${(c.height / ph).toFixed(3)})`;
    }

    async function open(which) {
      const i = typeof which === 'number' ? which : notebooks.findIndex((nb) => nb.id === String(which));
      if (busy || view === 'open' || !notebooks[i]) return;
      busy = true;
      current = i;
      const nb = notebooks[i];
      const cover = coverEl(i);
      buildPages(nb);
      reader.setAttribute('aria-label', nb.title);
      stage.setAttribute('aria-label', `${nb.title}. ${opts.hint}.`);
      rtitleName.textContent = nb.title;
      view = 'open';
      reader.hidden = false;
      measure();
      pos = 0;
      target = 0;
      settle();
      render();
      home.inert = true;
      top.inert = true;
      if (!reduce) {
        // Shelf and reader swap with opacity while the book flies in from its cover.
        home.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out' }).finished.then(() => { root.dataset.view = 'open'; });
        reader.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
        await book.animate([{ transform: flyFrom(cover) }, { transform: 'none' }], { duration: 460, easing: ease }).finished.catch(() => {});
      } else {
        root.dataset.view = 'open';
        await reader.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 }).finished.catch(() => {});
      }
      root.dataset.view = 'open';
      stage.focus({ preventScroll: true });
      busy = false;
      goTo(opts.startPage ?? 1);
      if (opts.onOpen) opts.onOpen(nb, api);
      emit('open', { notebook: nb.id });
    }

    async function close() {
      if (busy || view !== 'open') return;
      busy = true;
      const nb = notebooks[current];
      const cover = coverEl(current);
      if (!reduce) {
        if (pos > opts.window + 1) { pos = opts.window + 1; }
        target = 0;
        settle();
        kick();
        await until(() => pos === 0, 1400);
        root.dataset.view = 'shelf';
        home.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 160, easing: 'ease-in', fill: 'backwards' });
        const fade = reader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: 260, fill: 'forwards' });
        await book.animate([{ transform: 'none' }, { transform: flyFrom(cover) }], { duration: 420, easing: ease, fill: 'forwards' }).finished.catch(() => {});
        await fade.finished.catch(() => {});
      } else {
        await reader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }).finished.catch(() => {});
        root.dataset.view = 'shelf';
      }
      reader.getAnimations().forEach((a) => a.cancel());
      book.getAnimations().forEach((a) => a.cancel());
      cancelAnimationFrame(raf);
      raf = 0;
      reader.hidden = true;
      home.inert = false;
      top.inert = false;
      view = 'shelf';
      book.textContent = '';
      pageEls = [];
      n = 0;
      cover.focus({ preventScroll: true });
      headFor(current);
      if (!reduce) cover.animate([{ transform: 'translateY(-18px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' });
      busy = false;
      if (opts.onClose) opts.onClose(nb, api);
      emit('close', { notebook: nb.id });
    }

    let toastTimer = 0;
    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('nbs-show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('nbs-show'), 1800);
    }

    const api = {
      el: root,
      version: VERSION,
      open,
      close,
      next,
      prev,
      goTo,
      toast,
      _scrub: false,
      // For measurement and custom controls: place the reader at a fractional page position.
      scrubTo(p) { if (view !== 'open') return; pos = Math.max(0, Math.min(n - 1, p)); follow(); render(); },
      setData(d) {
        if (view === 'open') return false;
        notebooks = normalize(d);
        renderShelf();
        return true;
      },
      get data() { return notebooks; },
      get state() {
        return { view, busy, notebook: current >= 0 && view === 'open' ? notebooks[current].id : null, page: Math.round(target), pages: n, position: pos, reducedMotion: reduce, inThreeD: shown.size };
      },
      destroy() {
        cancelAnimationFrame(raf);
        listeners.forEach(([t, type, fn, o]) => t.removeEventListener(type, fn, o));
        if (mq.removeEventListener) mq.removeEventListener('change', onMq);
        if (ro) ro.disconnect();
        root.textContent = '';
        root.classList.remove('nbs', 'nbs-reduce');
        delete root.__nbs;
      },
    };
    root.__nbs = api;
    return api;
  }

  // Drop-in: <div data-notebook-shelf data-src="shelf.json" data-title="My shelf"></div>
  // or put the JSON in a <script type="application/json"> inside the element.
  async function autoMount(doc = document) {
    const els = [...doc.querySelectorAll('[data-notebook-shelf]')].filter((e) => !e.__nbs);
    return Promise.all(els.map(async (e) => {
      try {
        let data;
        const inline = e.querySelector('script[type="application/json"]');
        if (inline) data = JSON.parse(inline.textContent);
        else if (e.dataset.src) data = await (await fetch(e.dataset.src)).json();
        else return null;
        const o = {};
        if (e.dataset.title) o.title = e.dataset.title;
        if (e.dataset.signoff) o.signoff = e.dataset.signoff;
        return mount(e, data, o);
      } catch (err) {
        console.warn('notebook-shelf: could not load data', err);
        return null;
      }
    }));
  }

  const NotebookShelf = { mount, autoMount, layout, icon, icons: Object.keys(PATHS), version: VERSION, css: CSS };
  g.NotebookShelf = NotebookShelf;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => autoMount());
    else autoMount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
