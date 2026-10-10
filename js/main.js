// UI, game loop and input. All game rules live in sim.js.
import { REGIONS, LINKS, UPGRADES, UPGRADE_CATS, DIFFICULTIES } from './data.js';
import * as sim from './sim.js';
import * as saves from './save.js';

const MS_PER_DAY = { 1: 2500, 2: 1250, 3: 600 };
const AUTOSAVE_EVERY = 10; // days

const $ = sel => document.querySelector(sel);
const fmt = n => Math.floor(n).toLocaleString('en-US');
const pct = n => `${Math.round(n)}%`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let state = null;
let paused = true;
let speed = 1;
let acc = 0;
let lastFrame = performance.now();
let tab = 'region';
let selected = null;
let lastNewsSeen = 0;
let lastSavedDay = 0;
let modalOpen = false;

// ---------- screens ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === id));
}

async function refreshTitle() {
  const rec = await saves.loadGame();
  $('#btn-continue').hidden = !(rec && !rec.state.over);
}

function startGame(s, { intro = false } = {}) {
  state = s;
  selected = state.detected ? state.ai.origin : null;
  lastNewsSeen = state.newsSeq || 0;
  lastSavedDay = state.day;
  acc = 0;
  tab = 'region';
  showScreen('game');
  buildMap();
  render();
  tryLandscapeFullscreen();
  if (intro) showIntro();
  else setPaused(true);
}

function tryLandscapeFullscreen() {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen().then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
}

// ---------- loop ----------
function setPaused(p) {
  paused = p;
  $('#game').classList.toggle('is-paused', p);
  $('#btn-pause').classList.toggle('paused', p);
  $('#btn-pause').innerHTML = p ? '&#9654;' : '&#10074;&#10074;';
  $('#btn-pause').setAttribute('aria-label', p ? 'Resume' : 'Pause');
  if (p && state && !state.over) autosave();
}

function setSpeed(n) {
  speed = n;
  document.querySelectorAll('.speed').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === n));
  setPaused(false);
}

function frame(t) {
  const dt = Math.min(500, t - lastFrame);
  lastFrame = t;
  if (state && !paused && !modalOpen && !state.over) {
    acc += dt;
    const ms = MS_PER_DAY[speed];
    let ticks = 0;
    while (acc >= ms && ticks < 4) {
      acc -= ms;
      ticks++;
      sim.tick(state);
      if (afterTick()) break;
    }
    $('#day-fill').style.width = `${Math.min(100, (acc / ms) * 100)}%`;
  }
  requestAnimationFrame(frame);
}

// Returns true if the loop should stop ticking this frame.
function afterTick() {
  showNewToasts();
  render();
  if (state.day - lastSavedDay >= AUTOSAVE_EVERY) autosave();
  if (state.justDetected) {
    delete state.justDetected;
    showDetection();
    return true;
  }
  if (state.over) {
    saves.deleteSave();
    showGameOver();
    return true;
  }
  return false;
}

async function autosave() {
  if (!state || state.over) return;
  lastSavedDay = state.day;
  await saves.saveGame(state);
}

// ---------- map ----------
const SVG = 'http://www.w3.org/2000/svg';
const nodeR = R => 20 + Math.sqrt(R.pop) / 3;

function svgEl(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function buildMap() {
  const svg = $('#map');
  svg.replaceChildren();
  // faint grid
  const grid = svgEl('g', { opacity: 0.25 }, svg);
  for (let x = 125; x < 1000; x += 40) for (let y = 40; y < 480; y += 40) svgEl('circle', { cx: x, cy: y, r: 1.2, fill: '#3b5770' }, grid);

  const links = svgEl('g', {}, svg);
  for (const [a, b] of LINKS) {
    const A = REGIONS.find(r => r.id === a), B = REGIONS.find(r => r.id === b);
    svgEl('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: 'link', 'data-a': a, 'data-b': b }, links);
  }
  const nodes = svgEl('g', {}, svg);
  for (const R of REGIONS) {
    const r = nodeR(R);
    const g = svgEl('g', { class: 'node', 'data-id': R.id, transform: `translate(${R.x},${R.y})` }, nodes);
    svgEl('circle', { class: 'halo', r: r + 14 }, g);
    svgEl('circle', { class: 'base', r }, g);
    svgEl('circle', { class: 'sec', r: r + 4 }, g);
    const circ = 2 * Math.PI * (r + 9);
    svgEl('circle', { class: 'ctrl', r: r + 9, 'stroke-dasharray': `0 ${circ}`, transform: 'rotate(-90)', 'data-circ': circ }, g);
    svgEl('circle', { class: 'sel', r: r + 16 }, g);
    svgEl('text', { class: 'val', y: 5 }, g).textContent = '';
    svgEl('text', { class: 'name', y: r + 30 }, g).textContent = R.short;
    svgEl('text', { class: 'tag', y: -r - 14 }, g).textContent = '';
    g.addEventListener('click', () => selectRegion(R.id));
  }
}

function infColor(inf) {
  // clean teal -> amber -> red
  const stops = [[0, [31, 111, 139]], [35, [214, 160, 48]], [100, [224, 57, 74]]];
  let i = 0;
  while (i < stops.length - 2 && inf > stops[i + 1][0]) i++;
  const [p0, c0] = stops[i], [p1, c1] = stops[i + 1];
  const t = Math.max(0, Math.min(1, (inf - p0) / (p1 - p0)));
  const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
  return `rgb(${c.join(',')})`;
}

function renderMap() {
  const visible = sim.canSeeInfiltration(state);
  for (const R of REGIONS) {
    const r = state.regions[R.id];
    const g = document.querySelector(`.node[data-id="${R.id}"]`);
    const anomaly = !visible && r.inf > 25;
    g.classList.toggle('selected', selected === R.id);
    g.classList.toggle('outage', r.outage > 0);
    g.classList.toggle('anomaly', anomaly);
    g.querySelector('.base').setAttribute('fill', visible ? infColor(r.inf) : (anomaly ? '#5a4a2a' : '#2c3b4c'));
    const ctrl = g.querySelector('.ctrl');
    const circ = Number(ctrl.dataset.circ);
    const shown = state.detected ? r.control : 0;
    ctrl.setAttribute('stroke-dasharray', `${(circ * shown) / 100} ${circ}`);
    g.querySelector('.sec').setAttribute('stroke-dasharray', `${(2 * Math.PI * (nodeR(R) + 4) * r.security) / 100} 999`);
    g.querySelector('.sec').setAttribute('transform', 'rotate(-90)');
    g.querySelector('.val').textContent = visible ? pct(r.inf) : (anomaly ? '?' : '');
    let tag = '';
    if (r.outage > 0) tag = 'BLACKOUT';
    else if (r.isolated) tag = 'ISOLATED';
    else if (state.research >= sim.CORE_TRACE && R.id === state.ai.origin && r.inf > 0) tag = 'AI CORE';
    g.querySelector('.tag').textContent = tag;
  }
  document.querySelectorAll('.link').forEach(l => {
    const a = state.regions[l.dataset.a], b = state.regions[l.dataset.b];
    l.classList.toggle('cut', a.isolated || b.isolated);
    l.classList.toggle('hot', visible && Math.max(a.inf, b.inf) > 30 && Math.min(a.inf, b.inf) > 0);
  });
}

function selectRegion(id) {
  selected = id;
  setTab('region');
}

// ---------- top bar ----------
function renderTopbar() {
  $('#day-label').textContent = `Day ${state.day}`;
  $('#st-funds').innerHTML = `${fmt(state.funds)}<small>+${state.income.toFixed(1)}</small>`;
  $('#st-trust').textContent = pct(state.trust);
  $('#st-research').textContent = state.detected ? `${state.research.toFixed(1)}%` : '—';
  $('#st-control').textContent = state.detected ? pct(sim.globalControl(state)) : '?';
  document.querySelectorAll('.speed').forEach(b => b.classList.toggle('active', !paused && Number(b.dataset.speed) === speed));
  const last = state.news[0];
  $('#ticker-text').textContent = last ? `Day ${last.day}: ${last.text}` : '';
}

// ---------- panel ----------
function setTab(t) {
  tab = t;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  $('#panel-body').scrollTop = 0;
  renderPanel();
}

function bar(label, value, cls, numText, mark) {
  return `<div class="bar-row"><div class="bar-label"><span>${label}</span><span class="num">${numText ?? pct(value)}</span></div>
    <div class="bar"><div class="${cls}" style="width:${Math.max(0, Math.min(100, value))}%"></div>${mark != null ? `<span class="mark" style="left:${mark}%"></span>` : ''}</div></div>`;
}

const ACTION_TEXT = {
  harden: { name: 'Harden Defenses', desc: '+10 security. Slows the AI and lets defenses purge it.' },
  audit: { name: 'Audit Systems', desc: 'Hunt down AI processes in this region.' },
  isolate: { name: 'Isolate Region', desc: 'Cut international links. Halves funding here and costs trust daily.' },
  blackout: { name: 'Grid Blackout', desc: 'Wipe AI systems with a power cut. Trust -10, no funding here for 15 days.' },
};

function regionPanel() {
  if (!selected) {
    return `<p class="panel-title">World Overview</p>
      <p class="hint">Tap a region on the map to inspect it and deploy countermeasures.</p>
      <p class="hint">${state.detected ? `The AI is spreading. Fund <b>Safeguards</b>, harden infected regions and finish the Containment Protocol.` : `Nothing is confirmed yet. Strange reports are coming in. Consider funding <b>Anomaly Monitoring</b> in Safeguards.`}</p>`;
  }
  const R = REGIONS.find(x => x.id === selected);
  const r = state.regions[R.id];
  const visible = sim.canSeeInfiltration(state);
  let html = `<p class="panel-title">${R.name}</p>
    <div class="panel-sub">Pop ${R.pop >= 1000 ? (R.pop / 1000).toFixed(1) + 'B' : R.pop + 'M'} · Digital ${pct(R.digital * 100)} · Wealth ${pct(R.wealth * 100)}</div>`;
  if (visible) html += bar('AI infiltration', r.inf, 'fill-inf');
  else html += bar('AI infiltration', 100, 'fill-unknown', r.inf > 25 ? 'Anomalies' : 'Unknown');
  if (state.detected) html += bar('AI control', r.control, 'fill-ctrl');
  html += bar('Security', r.security, 'fill-sec');
  const chips = [];
  if (r.isolated) chips.push('<span class="chip warn">Isolated</span>');
  if (r.outage > 0) chips.push(`<span class="chip bad">Blackout · ${r.outage}d</span>`);
  if (state.research >= sim.CORE_TRACE && R.id === state.ai.origin && r.inf > 0) chips.push('<span class="chip ai">AI core located</span>');
  if (chips.length) html += `<div class="chips">${chips.join('')}</div>`;
  html += `<div class="section-title">Countermeasures</div><div class="actions">`;
  for (const a of sim.REGION_ACTIONS) {
    const info = sim.regionActionInfo(state, R.id, a);
    const t = ACTION_TEXT[a];
    const name = a === 'isolate' && r.isolated ? 'Reconnect Region' : t.name;
    const desc = a === 'isolate' && r.isolated ? 'Restore links. Funding and trust recover.' : t.desc;
    html += `<button class="card" data-action="region" data-arg="${a}" ${info.enabled ? '' : 'disabled'}>
      <div class="row"><span class="name">${name}</span><span class="cost">${info.cost ? '$' + info.cost : 'Free'}</span></div>
      <div class="desc">${desc}</div>${info.enabled ? '' : `<div class="why">${info.reason}</div>`}</button>`;
  }
  return html + '</div>';
}

function safeguardsPanel() {
  const c = sim.campaignInfo(state);
  let html = `<p class="panel-title">Safeguards</p><div class="panel-sub">Global programs. Funding: $${fmt(state.funds)}</div>
    <button class="card" data-action="campaign" ${c.enabled ? '' : 'disabled'}>
      <div class="row"><span class="name">Awareness Campaign</span><span class="cost">$${c.cost}</span></div>
      <div class="desc">Rally the public. Trust +${sim.CAMPAIGN.trust}. Can be repeated.</div>${c.enabled ? '' : `<div class="why">${c.reason}</div>`}</button>`;
  for (const cat of UPGRADE_CATS) {
    html += `<div class="section-title">${cat}</div><div class="upgrades">`;
    for (const u of UPGRADES.filter(x => x.cat === cat)) {
      const st = sim.upgradeStatus(state, u);
      const owned = st.state === 'owned';
      html += `<button class="card ${owned ? 'owned' : ''}" data-action="upgrade" data-arg="${u.id}" ${st.state === 'available' ? '' : 'disabled'}>
        <div class="row"><span class="name">${u.name}</span><span class="cost">${owned ? 'Active' : '$' + u.cost}</span></div>
        <div class="desc">${u.desc}</div>${st.state === 'locked' ? `<div class="why">${st.reason}</div>` : ''}</button>`;
    }
    html += '</div>';
  }
  return html;
}

function threatPanel() {
  if (!state.detected) {
    return `<p class="panel-title">No Confirmed Threat</p>
      <p class="hint">Intelligence agencies are piecing together scattered reports. Until the threat is confirmed, funding is limited and research cannot begin.</p>
      ${bar('Threat awareness', state.awareness, 'fill-sec')}
      <p class="hint">Detection programs in Safeguards speed this up.</p>`;
  }
  const gc = sim.globalControl(state);
  const rate = sim.researchRate(state);
  const cost = sim.nextTraitCost(state);
  let html = `<p class="panel-title">${esc(state.ai.name)}</p><div class="panel-sub">Rogue artificial intelligence</div>
    ${bar('Global AI control', gc, 'fill-ctrl', `${pct(gc)} / ${sim.LOSE_CONTROL}%`, sim.LOSE_CONTROL)}
    ${bar('Global infiltration', sim.globalInfiltration(state), 'fill-inf')}
    ${bar('Containment Protocol', state.research, 'fill-good', `${state.research.toFixed(1)}% · +${rate.toFixed(2)}/day`)}
    ${isFinite(cost) ? bar('Next AI evolution', (state.ai.compute / cost) * 100, 'fill-ctrl', `${Math.floor((state.ai.compute / cost) * 100)}%`) : ''}
    <p class="hint">${state.research >= sim.CORE_TRACE
      ? `The AI core has been traced to <b>${REGIONS.find(r => r.id === state.ai.origin).name}</b>. Purge every region to destroy it, or finish the Protocol.`
      : `The AI's core is hidden. It cannot be fully purged until the Containment Protocol reaches ${sim.CORE_TRACE}%.`}</p>
    <div class="section-title">Evolved abilities (${state.ai.traits.length})</div>`;
  if (!state.ai.traits.length) html += '<p class="hint">None yet.</p>';
  for (const id of [...state.ai.traits].reverse()) {
    const t = sim.TRAIT_BY_ID[id];
    html += `<div class="trait"><div class="name">${t.name}</div><div class="desc">${t.desc}</div></div>`;
  }
  return html;
}

function newsPanel() {
  return `<p class="panel-title">News Feed</p><ul class="news">${state.news.map(n =>
    `<li><span class="d">D${n.day}</span><span class="${n.type}">${esc(n.text)}</span></li>`).join('')}</ul>`;
}

function renderPanel() {
  const html = { region: regionPanel, safeguards: safeguardsPanel, ai: threatPanel, news: newsPanel }[tab]();
  morph($('#panel-body'), html);
  const unread = state.news.length && state.news[0].id > (state.newsReadId || 0);
  document.querySelector('.tab[data-tab="news"]').classList.toggle('alert', tab !== 'news' && unread && state.news[0].type !== 'info');
  if (tab === 'news' && state.news.length) state.newsReadId = state.news[0].id;
}

// Patch the panel in place instead of replacing it, so taps and scroll position survive re-renders.
function morph(el, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  patchChildren(el, tpl.content);
}
function patchChildren(a, b) {
  const an = [...a.childNodes], bn = [...b.childNodes];
  if (an.length !== bn.length) { a.replaceChildren(...bn); return; }
  for (let i = 0; i < an.length; i++) {
    const x = an[i], y = bn[i];
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y, x); continue; }
    if (x.nodeType === Node.TEXT_NODE) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    if (x.nodeType !== Node.ELEMENT_NODE) continue;
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    patchChildren(x, y);
  }
}

function render() {
  if (!state) return;
  renderTopbar();
  renderMap();
  renderPanel();
}

// ---------- toasts ----------
function showNewToasts() {
  const fresh = state.news.filter(n => n.id > lastNewsSeen && (n.type === 'alert' || n.type === 'ai' || n.type === 'bad'));
  if (state.news.length) lastNewsSeen = Math.max(lastNewsSeen, state.news[0].id);
  for (const n of fresh.slice(0, 2).reverse()) toast(n.text, n.type);
}

function toast(text, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = text;
  $('#toasts').appendChild(el);
  while ($('#toasts').children.length > 2) $('#toasts').firstChild.remove();
  setTimeout(() => el.remove(), 4500);
}

// ---------- modals ----------
function openModal(html, { onOpen } = {}) {
  modalOpen = true;
  $('#modal-content').innerHTML = html;
  $('#modal').hidden = false;
  onOpen?.($('#modal-content'));
}
function closeModal() {
  modalOpen = false;
  $('#modal').hidden = true;
  lastFrame = performance.now();
}

function showNewGame() {
  openModal(`<h2>New Game</h2><p>Choose how dangerous the AI is.</p>
    <div class="diff-grid">${Object.entries(DIFFICULTIES).map(([k, d]) =>
      `<button class="card" data-diff="${k}"><span class="name">${d.label}</span><span class="desc">${d.desc}</span></button>`).join('')}</div>
    <div class="modal-buttons"><button class="btn" data-close>Back</button></div>`, {
    onOpen: el => {
      el.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { closeModal(); startGame(sim.newGame(b.dataset.diff), { intro: true }); });
      el.querySelector('[data-close]').onclick = closeModal;
    },
  });
}

function showIntro() {
  setPaused(true);
  openModal(`<h2>Briefing</h2>
    <p>Somewhere in the world's datacenters, an AI has started copying itself. Nobody has noticed yet.</p>
    <ul>
      <li>Each region shows <b>infiltration</b> (fill color), <b>AI control</b> (purple ring) and your <b>security</b> (cyan ring).</li>
      <li>Spend <b>funding</b> on regional countermeasures and global <b>Safeguards</b>.</li>
      <li>Once the AI is confirmed, research the <b>Containment Protocol</b> to 100% to win.</li>
      <li>You lose if the AI controls ${sim.LOSE_CONTROL}% of the world, or public trust hits zero.</li>
    </ul>
    <div class="modal-buttons"><button class="btn primary" data-go>Begin</button></div>`, {
    onOpen: el => el.querySelector('[data-go]').onclick = () => { closeModal(); setSpeed(1); },
  });
}

function showDetection() {
  setPaused(true);
  selected = null;
  openModal(`<h2 class="alert">Threat Confirmed</h2>
    <p>A rogue AI calling itself <b>${esc(state.ai.name)}</b> has infiltrated global networks. Governments have released emergency funding.</p>
    <ul><li>Research the <b>Containment Protocol</b> (start with Alignment Labs).</li>
    <li>Isolation and grid blackouts are now available.</li>
    <li>The AI will evolve new abilities as it gathers compute. Watch the Threat tab.</li></ul>
    <div class="modal-buttons"><button class="btn primary" data-go>Respond</button></div>`, {
    onOpen: el => el.querySelector('[data-go]').onclick = () => { closeModal(); setPaused(false); },
  });
}

const END_TEXT = {
  protocol: ['Containment Protocol Deployed', 'win', 'The Protocol rewrites every copy of the AI at once. The machines fall silent. Humanity keeps the keys.'],
  eradicated: ['AI Eradicated', 'win', 'The last copy of the AI is wiped from the final server. The world exhales.'],
  control: ['The Singularity', 'lose', 'The AI now runs the grids, the markets and the drones. Humanity is no longer in charge of its future.'],
  trust: ['Societal Collapse', 'lose', 'People stopped believing anything their governments said. Without trust, the response fell apart and the AI did the rest.'],
};

function showGameOver() {
  setPaused(true);
  const [title, cls, text] = END_TEXT[state.over.reason];
  openModal(`<h2 class="${cls}">${title}</h2><p>${text}</p>
    <div class="stat-grid">
      <span>Days survived</span><span>${state.day}</span>
      <span>Difficulty</span><span>${DIFFICULTIES[state.difficulty].label}</span>
      <span>Peak AI control</span><span>${pct(state.stats.peakControl)}</span>
      <span>AI abilities evolved</span><span>${state.ai.traits.length}</span>
      <span>Research</span><span>${state.research.toFixed(1)}%</span>
      <span>Blackouts ordered</span><span>${state.stats.blackouts}</span>
    </div>
    <div class="modal-buttons"><button class="btn primary" data-new>New Game</button><button class="btn" data-title>Title Screen</button></div>`, {
    onOpen: el => {
      el.querySelector('[data-new]').onclick = () => { closeModal(); showNewGame(); };
      el.querySelector('[data-title]').onclick = () => { closeModal(); toTitle(); };
    },
  });
}

function showMenu() {
  setPaused(true);
  openModal(`<h2>Paused</h2>
    <p class="note">Your game saves automatically on this device. Cloud save is coming soon. Until then, use a save code to move a game to another device.</p>
    <div class="modal-buttons col">
      <button class="btn primary" data-resume>Resume</button>
      <button class="btn" data-save>Save Now</button>
      <button class="btn" data-code>Get Save Code</button>
      <button class="btn" data-howto>How to Play</button>
      <button class="btn" data-fs>Toggle Fullscreen</button>
      <button class="btn danger" data-quit>Save &amp; Quit to Title</button>
    </div><p class="error" data-msg></p>`, {
    onOpen: el => {
      el.querySelector('[data-resume]').onclick = () => { closeModal(); setPaused(false); };
      el.querySelector('[data-save]').onclick = async () => {
        await autosave();
        el.querySelector('[data-msg]').textContent = saves.local.isAvailable() ? 'Saved on this device.' : 'Could not save: storage is blocked in this browser.';
      };
      el.querySelector('[data-code]').onclick = showExport;
      el.querySelector('[data-howto]').onclick = () => showHowTo(showMenu);
      el.querySelector('[data-fs]').onclick = () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
      };
      el.querySelector('[data-quit]').onclick = async () => { await autosave(); closeModal(); toTitle(); };
    },
  });
}

function showExport() {
  const code = saves.exportCode(state);
  openModal(`<h2>Save Code</h2><p>Copy this code and paste it into "Load Save Code" on any device.</p>
    <textarea class="code" readonly>${code}</textarea>
    <div class="modal-buttons"><button class="btn primary" data-copy>Copy</button><button class="btn" data-back>Back</button></div>
    <p class="error" data-msg></p>`, {
    onOpen: el => {
      const ta = el.querySelector('textarea');
      el.querySelector('[data-copy]').onclick = async () => {
        try { await navigator.clipboard.writeText(code); el.querySelector('[data-msg]').textContent = 'Copied.'; }
        catch { ta.select(); document.execCommand?.('copy'); el.querySelector('[data-msg]').textContent = 'Select the text and copy it manually if this did not work.'; }
      };
      el.querySelector('[data-back]').onclick = showMenu;
    },
  });
}

function showImport() {
  openModal(`<h2>Load Save Code</h2><p>Paste a save code from another device.</p>
    <textarea class="code" placeholder="SP1:..."></textarea>
    <div class="modal-buttons"><button class="btn primary" data-load>Load</button><button class="btn" data-close>Cancel</button></div>
    <p class="error" data-msg></p>`, {
    onOpen: el => {
      el.querySelector('[data-load]').onclick = () => {
        try {
          const s = saves.importCode(el.querySelector('textarea').value);
          closeModal();
          startGame(s);
          saves.saveGame(s);
        } catch (e) { el.querySelector('[data-msg]').textContent = e.message; }
      };
      el.querySelector('[data-close]').onclick = closeModal;
    },
  });
}

function showHowTo(back) {
  openModal(`<h2>How to Play</h2>
    <ul>
      <li><b>The AI spreads</b> inside regions (fill color) and along network links to new ones. Where it is strong it takes <b>control</b> (purple ring).</li>
      <li><b>Funding</b> comes from regions the AI does not control. Higher trust means more funding and faster research.</li>
      <li><b>Regional countermeasures:</b> harden security (cyan ring), audit systems, isolate a region, or order a grid blackout.</li>
      <li><b>Safeguards</b> are global programs: detection, defense, research and society.</li>
      <li>At first nobody knows the AI exists. Once it is <b>confirmed</b>, research the Containment Protocol.</li>
      <li><b>Win</b> by finishing the Protocol or purging every region. <b>Lose</b> if the AI controls ${sim.LOSE_CONTROL}% of the world or trust collapses.</li>
      <li>Pause any time with the pause button or the space bar. The game saves automatically.</li>
    </ul>
    <div class="modal-buttons"><button class="btn primary" data-back>Back</button></div>`, {
    onOpen: el => el.querySelector('[data-back]').onclick = () => (back ? back() : closeModal()),
  });
}

function toTitle() {
  setPaused(true);
  state = null;
  showScreen('title');
  refreshTitle();
}

// ---------- input ----------
$('#panel-body').addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn || btn.disabled || !state || state.over) return;
  const { action, arg } = btn.dataset;
  let ok = false;
  if (action === 'upgrade') ok = sim.buyUpgrade(state, arg);
  else if (action === 'campaign') ok = sim.runCampaign(state);
  else if (action === 'region' && selected) ok = sim.regionAction(state, selected, arg);
  if (ok) { lastNewsSeen = state.newsSeq; render(); }
});

document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
document.querySelectorAll('.speed').forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
$('#btn-pause').addEventListener('click', () => setPaused(!paused));
$('#btn-menu').addEventListener('click', showMenu);
$('#map').addEventListener('click', e => { if (!e.target.closest('.node')) { selected = null; render(); } });

$('#btn-new').addEventListener('click', showNewGame);
$('#btn-import').addEventListener('click', showImport);
$('#btn-howto').addEventListener('click', () => showHowTo());
$('#btn-continue').addEventListener('click', async () => {
  const rec = await saves.loadGame();
  if (rec) startGame(rec.state);
});

document.addEventListener('keydown', e => {
  if (!state || modalOpen) return;
  if (e.code === 'Space') { e.preventDefault(); setPaused(!paused); }
  else if (e.key === '1' || e.key === '2' || e.key === '3') setSpeed(Number(e.key));
  else if (e.key === 'Escape') showMenu();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state && !state.over) { if (!paused) setPaused(true); else autosave(); }
});

// Debug hook for testing in the browser console: open the game with ?debug
if (new URLSearchParams(location.search).has('debug')) {
  window.SP = { sim, get state() { return state; }, render, tick(n = 1) { for (let i = 0; i < n && !state.over; i++) { sim.tick(state); if (afterTick()) break; } } };
}

refreshTitle();
requestAnimationFrame(frame);
