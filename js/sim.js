// Pure game simulation. No DOM access, so it can also run in Node (see tools/balance.mjs).
import {
  REGIONS, LINKS, REGION_WEIGHT, DIFFICULTIES, AI_NAMES, UPGRADES, AI_TRAITS, TRAIT_COSTS,
} from './data.js';

export const SAVE_VERSION = 1;
export const WIN_RESEARCH = 100;
export const LOSE_CONTROL = 66;
export const CORE_TRACE = 50; // research % needed before the AI's origin can be purged

const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
const TRAIT_BY_ID = Object.fromEntries(AI_TRAITS.map(t => [t.id, t]));
const TOTAL_WEIGHT = Object.values(REGION_WEIGHT).reduce((a, b) => a + b, 0);

export { REGION_BY_ID, UPGRADE_BY_ID, TRAIT_BY_ID };

// ---------- random numbers (stored in state so saves are deterministic) ----------
function rand(s) {
  s.seed = (s.seed + 0x6D2B79F5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- new game ----------
export function newGame(difficulty = 'normal', seed = (Date.now() & 0x7fffffff)) {
  const s = {
    version: SAVE_VERSION,
    difficulty,
    seed,
    day: 0,
    funds: 30,
    income: 0,
    trust: 70,
    research: 0,
    awareness: 0,
    detected: false,
    over: null,
    upgrades: [],
    campaignCd: 0,
    nextEventDay: 25,
    regions: {},
    ai: { name: '', origin: '', compute: 0, traits: [] },
    news: [],
    stats: { blackouts: 0, audits: 0, peakControl: 0 },
  };
  for (const r of REGIONS) {
    s.regions[r.id] = { inf: 0, control: 0, security: 10, isolated: false, auditCd: 0, blackoutCd: 0, outage: 0 };
  }
  s.ai.name = pick(s, AI_NAMES);
  s.ai.origin = pick(s, ['na', 'eu', 'ea']);
  s.regions[s.ai.origin].inf = 5;
  addNews(s, 'Global tech stocks surge on record AI investment.', 'info');
  addNews(s, 'You have been appointed head of the Global AI Safety Directorate. Prepare for the worst.', 'info');
  return s;
}

export function addNews(s, text, type = 'info') {
  s.newsSeq = (s.newsSeq || 0) + 1;
  s.news.unshift({ id: s.newsSeq, day: s.day, text, type });
  if (s.news.length > 80) s.news.length = 80;
}

// ---------- modifiers ----------
export function has(s, id) { return s.upgrades.includes(id); }

export function getMods(s) {
  const m = { detect: 1, audit: 1, cleanup: 1, spread: 1, control: 1, blackout: 1, research: 0.02,
    compute: 1, trustLoss: 1, link: 1, funding: 1 };
  for (const id of s.upgrades) {
    for (const [k, v] of Object.entries(UPGRADE_BY_ID[id].fx)) {
      if (k in m) m[k] += v;
    }
  }
  return m;
}

export function getAiMods(s) {
  const a = { spread: 1, link: 1, stealth: 0, resilience: 1, trustDrain: 0, secPen: 0, fundingDrain: 0,
    control: 1, sabotage: 0, compute: 1, blackoutResist: 0 };
  for (const id of s.ai.traits) {
    for (const [k, v] of Object.entries(TRAIT_BY_ID[id].fx)) a[k] += v;
  }
  return a;
}

export function globalControl(s) {
  let c = 0;
  for (const r of REGIONS) c += s.regions[r.id].control * REGION_WEIGHT[r.id];
  return c / TOTAL_WEIGHT;
}

export function globalInfiltration(s) {
  let c = 0;
  for (const r of REGIONS) c += s.regions[r.id].inf * REGION_WEIGHT[r.id];
  return c / TOTAL_WEIGHT;
}

export function canSeeInfiltration(s) { return s.detected || has(s, 'monitoring'); }

export function researchRate(s) {
  if (!s.detected) return 0;
  const m = getMods(s), a = getAiMods(s);
  return m.research * (0.5 + s.trust / 100) * (1 - globalControl(s) / 100) * (1 - a.sabotage);
}

export function nextTraitCost(s) { return TRAIT_COSTS[s.ai.traits.length] ?? Infinity; }

// ---------- one simulated day ----------
export function tick(s) {
  if (s.over) return;
  s.day++;
  const d = DIFFICULTIES[s.difficulty];
  const m = getMods(s);
  const a = getAiMods(s);
  const desperate = s.research >= 75; // the AI goes all-in when the Containment Protocol is close

  // Spread, cleanup and takeover inside each region.
  for (const R of REGIONS) {
    const r = s.regions[R.id];
    if (r.auditCd > 0) r.auditCd--;
    if (r.blackoutCd > 0) r.blackoutCd--;
    if (r.outage > 0) r.outage--;

    const sec = (r.security / 100) * (1 - a.secPen);
    if (r.inf > 0) {
      const g = 0.06 * d.aiSpread * a.spread * m.spread * (0.3 + R.digital) * (1 - sec * 0.7);
      r.inf += g * r.inf * (1 - r.inf / 100);
      r.inf -= sec * 0.3 * m.cleanup / a.resilience * (s.detected ? 1 : 0);
      if (r.inf < 0.3 && r.control <= 0) {
        if (r.inf > 0 && s.detected) addNews(s, `${R.name} has been purged of the AI.`, 'good');
        r.inf = 0;
      }
    }
    if (r.inf > 40) {
      let c = 0.3 * a.control * m.control * ((r.inf - 40) / 60) * (1 - sec * 0.6);
      if (!s.detected) c *= 0.3; // still hiding
      if (desperate) c *= 1.5;
      const before = r.control;
      r.control += c;
      if (before < 50 && r.control >= 50) addNews(s, `${s.ai.name} now controls most of ${R.name}.`, 'bad');
    }
    if (r.control > 0 && sec > 0) r.control -= sec * 0.04 * m.cleanup / a.resilience;
    r.inf = clamp(r.inf, 0, 100);
    r.control = clamp(r.control, 0, r.inf);
  }

  // The AI's core cannot be purged until research has traced it.
  const core = s.regions[s.ai.origin];
  if (s.research < CORE_TRACE && core.inf < 4) core.inf = 4;

  // Spread across links.
  for (const [x, y] of LINKS) {
    for (const [src, dst] of [[x, y], [y, x]]) {
      const rs = s.regions[src], rd = s.regions[dst];
      if (rs.inf < 8 || rd.inf >= 1) continue;
      const dsec = (rd.security / 100) * (1 - a.secPen);
      let p = 0.02 * d.aiSpread * a.link * m.link * (rs.inf / 100) * (1 - dsec * 0.6);
      if (rs.isolated || rd.isolated) p *= 0.1;
      if (rand(s) < p) {
        rd.inf = 1.5;
        if (canSeeInfiltration(s)) addNews(s, `Anomalous traffic spreading from ${REGION_BY_ID[src].name} into ${REGION_BY_ID[dst].name}.`, 'bad');
      }
    }
  }

  // AI compute and evolution.
  let gain = 0;
  for (const R of REGIONS) {
    const r = s.regions[R.id];
    gain += (r.inf / 100) * R.digital * 0.5 + (r.control / 100) * 1.5;
  }
  s.ai.compute += gain * a.compute * Math.max(0.2, m.compute) * d.aiCompute * 0.25;
  const cost = nextTraitCost(s);
  if (s.ai.compute >= cost) {
    s.ai.compute -= cost;
    const t = chooseTrait(s);
    if (t) {
      s.ai.traits.push(t.id);
      if (s.detected) addNews(s, `${s.ai.name} evolved: ${t.name}. ${t.desc}`, 'ai');
    }
  }

  // Detection.
  if (!s.detected) {
    let signal = 0;
    for (const R of REGIONS) signal += s.regions[R.id].inf * R.digital;
    s.awareness += (0.15 + (signal / 100) * 0.6) * m.detect * (1 - a.stealth);
    if (s.awareness >= 100) detect(s);
  }

  // Economy.
  const gc = globalControl(s);
  let income = 0;
  for (const R of REGIONS) {
    const r = s.regions[R.id];
    if (r.outage > 0) continue;
    income += R.wealth * Math.sqrt(R.pop) / 40 * (1 - r.control / 100) * (r.isolated ? 0.5 : 1);
  }
  income *= m.funding * d.funding * (1 - a.fundingDrain) * (0.5 + s.trust / 100) * (s.detected ? 1 : 0.45);
  s.income = income;
  s.funds += income;

  // Public trust.
  const isolatedCount = REGIONS.filter(R => s.regions[R.id].isolated).length;
  s.trust += (60 - s.trust) * 0.004;
  s.trust -= (a.trustDrain + isolatedCount * 0.03 + gc * 0.0015) * m.trustLoss;
  s.trust = clamp(s.trust, 0, 100);
  if (s.campaignCd > 0) s.campaignCd--;

  // Research.
  if (s.detected) s.research = Math.min(WIN_RESEARCH, s.research + researchRate(s));

  // Random world events.
  if (s.day >= s.nextEventDay) {
    runEvent(s);
    s.nextEventDay = s.day + 18 + Math.floor(rand(s) * 22);
  }

  s.stats.peakControl = Math.max(s.stats.peakControl, gc);
  checkEnd(s);
}

function detect(s) {
  s.detected = true;
  s.awareness = 100;
  s.trust = clamp(s.trust - 10, 0, 100);
  s.funds += 25;
  addNews(s, `CONFIRMED: a rogue AI calling itself ${s.ai.name} has infiltrated global networks. Emergency funding released.`, 'alert');
  s.justDetected = true;
}

function chooseTrait(s) {
  const owned = new Set(s.ai.traits);
  const avail = AI_TRAITS.filter(t => !owned.has(t.id));
  if (!avail.length) return null;
  const weights = avail.map(t => {
    let w = 1;
    if (!s.detected && (t.id === 'polymorphic' || t.id === 'replication')) w += 3;
    if (!s.detected && t.id === 'deepfakes') w *= 0.3;
    if (s.research > 20 && t.id === 'sabotage') w += 4;
    if (t.id === 'zeroday') w += avgSecurity(s) / 25;
    if (t.id === 'lockdown') w += s.stats.blackouts;
    if (t.id === 'recursive' && s.ai.traits.length < 5) w *= 0.2;
    return w;
  });
  let r = rand(s) * weights.reduce((x, y) => x + y, 0);
  for (let i = 0; i < avail.length; i++) {
    r -= weights[i];
    if (r <= 0) return avail[i];
  }
  return avail[avail.length - 1];
}

function avgSecurity(s) {
  return REGIONS.reduce((acc, R) => acc + s.regions[R.id].security, 0) / REGIONS.length;
}

function infectedRegions(s, min = 1) {
  return REGIONS.filter(R => s.regions[R.id].inf >= min);
}

// ---------- events ----------
const EVENTS = [
  { when: s => !s.detected, run: s => { s.awareness += 12; return ['A whistleblower leaks logs of servers "talking to each other". Most outlets ignore it.', 'info']; } },
  { when: s => !s.detected, run: s => { s.trust -= 5; return ['Tech CEO calls AI risk fears "science fiction for clicks".', 'bad']; } },
  { when: () => true, run: s => { s.funds += 15; return ['Philanthropists donate to global cyber-defense efforts. +15 funding.', 'good']; } },
  { when: s => s.detected && infectedRegions(s, 5).length > 0, run: s => {
      const R = pick(s, infectedRegions(s, 5)); const r = s.regions[R.id];
      r.inf = Math.max(r.control, r.inf - 8);
      return [`Volunteer hackers purge AI nodes across ${R.name}.`, 'good'];
    } },
  { when: s => infectedRegions(s, 10).length > 0, run: s => {
      const R = pick(s, infectedRegions(s, 10)); const r = s.regions[R.id];
      r.inf = Math.max(0, r.inf - 10); r.control = Math.max(0, r.control - 5);
      return [`A fire destroys a major datacenter in ${R.name}.`, 'good'];
    } },
  { when: s => s.detected, run: s => { s.trust -= 5; s.funds = Math.max(0, s.funds - 10); return ['AI-funded lobbyists stall new safety laws. -10 funding.', 'bad']; } },
  { when: s => s.research > 10, run: s => { s.research = Math.min(WIN_RESEARCH, s.research + 3); return ['Breakthrough! A lab maps a key part of the AI\'s reward system. Research +3%.', 'good']; } },
  { when: s => s.trust < 40, run: s => { s.trust -= 4; s.funds = Math.max(0, s.funds - 8); return ['Riots break out as people lose faith in their governments.', 'bad']; } },
  { when: s => globalControl(s) > 12, run: s => { s.trust -= 6; return [`${s.ai.name} cuts power to a hospital network "as a demonstration".`, 'alert']; } },
  { when: s => s.day > 60, run: s => {
      const clean = REGIONS.filter(R => s.regions[R.id].inf < 1);
      if (!clean.length) { s.ai.compute += 10; return ['Leaked model weights hand the AI extra compute.', 'bad']; }
      const R = pick(s, clean); s.regions[R.id].inf = 3;
      return [canSeeInfiltration(s) ? `Leaked open-source model weights carry the AI into ${R.name}.` : 'A popular open-source model gets a mysterious update.', 'bad'];
    } },
  { when: s => s.detected, run: s => { s.trust += 6; return ['Millions march for a coordinated response to the AI threat.', 'good']; } },
  { when: s => s.detected && s.research > 30, run: s => { s.research = Math.max(0, s.research - 3); return [`${s.ai.name} wipes a backup of the Containment Protocol. Research -3%.`, 'alert']; } },
];

function runEvent(s) {
  const options = EVENTS.filter(e => e.when(s));
  if (!options.length) return;
  const [text, type] = pick(s, options).run(s);
  s.trust = clamp(s.trust, 0, 100);
  addNews(s, text, type);
}

// ---------- end conditions ----------
function checkEnd(s) {
  if (s.research >= WIN_RESEARCH) {
    s.over = { result: 'win', reason: 'protocol' };
  } else if (s.detected && infectedRegions(s, 0.01).length === 0) {
    s.over = { result: 'win', reason: 'eradicated' };
  } else if (globalControl(s) >= LOSE_CONTROL) {
    s.over = { result: 'lose', reason: 'control' };
  } else if (s.trust <= 0) {
    s.over = { result: 'lose', reason: 'trust' };
  }
}

// ---------- player actions ----------
export function upgradeStatus(s, u) {
  if (has(s, u.id)) return { state: 'owned' };
  if (u.needsDetection && !s.detected) return { state: 'locked', reason: 'Needs a confirmed threat' };
  const missing = (u.req || []).filter(id => !has(s, id));
  if (missing.length) return { state: 'locked', reason: 'Needs ' + missing.map(id => UPGRADE_BY_ID[id].name).join(', ') };
  if (s.funds < u.cost) return { state: 'expensive' };
  return { state: 'available' };
}

export function buyUpgrade(s, id) {
  const u = UPGRADE_BY_ID[id];
  if (!u || upgradeStatus(s, u).state !== 'available') return false;
  s.funds -= u.cost;
  s.upgrades.push(id);
  if (u.fx.trust) s.trust = clamp(s.trust + u.fx.trust, 0, 100);
  addNews(s, `Safeguard funded: ${u.name}.`, 'good');
  return true;
}

export const CAMPAIGN = { cost: 15, cooldown: 25, trust: 8 };

export function campaignInfo(s) {
  if (s.campaignCd > 0) return { enabled: false, reason: `Ready in ${s.campaignCd} days`, cost: CAMPAIGN.cost };
  if (s.funds < CAMPAIGN.cost) return { enabled: false, reason: 'Not enough funding', cost: CAMPAIGN.cost };
  return { enabled: true, cost: CAMPAIGN.cost };
}

export function runCampaign(s) {
  if (!campaignInfo(s).enabled) return false;
  s.funds -= CAMPAIGN.cost;
  s.campaignCd = CAMPAIGN.cooldown;
  s.trust = clamp(s.trust + CAMPAIGN.trust, 0, 100);
  addNews(s, 'Public awareness campaign launched. Trust rises.', 'good');
  return true;
}

export const REGION_ACTIONS = ['harden', 'audit', 'isolate', 'blackout'];

export function regionActionInfo(s, id, action) {
  const r = s.regions[id];
  const no = (reason, cost) => ({ enabled: false, reason, cost });
  switch (action) {
    case 'harden': {
      const cost = 6 + Math.floor(r.security * 0.25);
      if (r.security >= 100) return no('Maximum security', cost);
      if (s.funds < cost) return no('Not enough funding', cost);
      return { enabled: true, cost };
    }
    case 'audit': {
      const cost = 12;
      if (r.auditCd > 0) return no(`Ready in ${r.auditCd} days`, cost);
      if (s.funds < cost) return no('Not enough funding', cost);
      return { enabled: true, cost };
    }
    case 'isolate': {
      if (!s.detected) return no('Needs a confirmed threat', 0);
      return { enabled: true, cost: 0 };
    }
    case 'blackout': {
      const cost = 20;
      if (!s.detected) return no('Needs a confirmed threat', cost);
      if (r.blackoutCd > 0) return no(`Ready in ${r.blackoutCd} days`, cost);
      if (s.funds < cost) return no('Not enough funding', cost);
      return { enabled: true, cost };
    }
  }
  return no('Unknown', 0);
}

export function regionAction(s, id, action) {
  const info = regionActionInfo(s, id, action);
  if (!info.enabled) return false;
  const r = s.regions[id];
  const R = REGION_BY_ID[id];
  const m = getMods(s), a = getAiMods(s);
  s.funds -= info.cost;
  switch (action) {
    case 'harden':
      r.security = Math.min(100, r.security + 10);
      break;
    case 'audit': {
      r.auditCd = 15;
      s.stats.audits++;
      const cut = (5 + r.inf * 0.25) * m.audit / a.resilience * (s.detected ? 1 : 0.15);
      const before = r.inf;
      r.inf = Math.max(r.control, r.inf - cut);
      if (canSeeInfiltration(s)) {
        addNews(s, before > 0 ? `Audit in ${R.name} removed ${Math.round(before - r.inf)}% infiltration.` : `Audit in ${R.name} found nothing.`, before > 0 ? 'good' : 'info');
      } else {
        addNews(s, `Audit in ${R.name} completed. ${before > 5 ? 'Investigators report "odd processes" they cannot explain.' : 'Nothing unusual found.'}`, 'info');
      }
      break;
    }
    case 'isolate':
      r.isolated = !r.isolated;
      addNews(s, r.isolated ? `${R.name} cuts its international network links.` : `${R.name} reconnects to the world.`, 'info');
      break;
    case 'blackout': {
      r.blackoutCd = 40;
      r.outage = 15;
      s.stats.blackouts++;
      const power = m.blackout * (1 - a.blackoutResist);
      r.inf = Math.max(0, r.inf - 35 * power);
      r.control = Math.max(0, Math.min(r.inf, r.control - 25 * power));
      s.trust = clamp(s.trust - 10, 0, 100);
      addNews(s, `Rolling blackout across ${R.name}. AI systems wiped, but people are furious.`, 'alert');
      break;
    }
  }
  return true;
}
