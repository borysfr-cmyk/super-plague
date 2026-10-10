// Headless balance check: plays many games with simple bots and prints outcomes.
// Usage: node tools/balance.mjs [games] [difficulty]
import { REGIONS, UPGRADES } from '../js/data.js';
import * as sim from '../js/sim.js';

const games = Number(process.argv[2] || 200);
const difficulty = process.argv[3] || 'normal';

const ORDER = ['monitoring', 'briefings', 'corps', 'labs', 'forensics', 'interp', 'treaty', 'zerotrust',
  'governance', 'airgap', 'superalign', 'killswitch'];

const bots = {
  idle: () => {},
  decent: s => {
    for (const id of ORDER) {
      const u = UPGRADES.find(x => x.id === id);
      const st = sim.upgradeStatus(s, u).state;
      if (st === 'available') { sim.buyUpgrade(s, id); }
      if (st !== 'owned' && st !== 'locked') break; // save up for the next one in order
    }
    if (s.trust < 45) sim.runCampaign(s);
    const sorted = [...REGIONS].sort((a, b) => s.regions[b.id].inf - s.regions[a.id].inf);
    for (const R of sorted.slice(0, 3)) {
      const r = s.regions[R.id];
      if (!sim.canSeeInfiltration(s) || r.inf < 3) continue;
      if (r.inf > 15) sim.regionAction(s, R.id, 'audit');
      if (s.detected && r.control > 30 && s.trust > 40) sim.regionAction(s, R.id, 'blackout');
      if (s.funds > 40) sim.regionAction(s, R.id, 'harden');
    }
  },
};

for (const [name, bot] of Object.entries(bots)) {
  const res = { win: 0, lose: 0, days: [], detect: [], reasons: {}, traits: [] };
  for (let i = 0; i < games; i++) {
    const s = sim.newGame(difficulty, 1000 + i);
    let detectDay = null;
    while (!s.over && s.day < 3000) {
      sim.tick(s);
      if (s.detected && detectDay === null) detectDay = s.day;
      bot(s);
    }
    res[s.over?.result || 'lose']++;
    res.days.push(s.day);
    res.detect.push(detectDay ?? NaN);
    res.traits.push(s.ai.traits.length);
    const k = s.over ? `${s.over.result}:${s.over.reason}` : 'timeout';
    res.reasons[k] = (res.reasons[k] || 0) + 1;
  }
  const avg = a => (a.filter(x => !isNaN(x)).reduce((x, y) => x + y, 0) / a.filter(x => !isNaN(x)).length).toFixed(0);
  const sorted = [...res.days].sort((a, b) => a - b);
  console.log(`${name.padEnd(7)} win ${(100 * res.win / games).toFixed(0)}%  days avg ${avg(res.days)} (p10 ${sorted[Math.floor(games * 0.1)]}, p90 ${sorted[Math.floor(games * 0.9)]})  detect avg ${avg(res.detect)}  traits ${avg(res.traits)}`, res.reasons);
}
