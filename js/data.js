// Static game data: regions, links, upgrades, AI traits, difficulty settings.

export const REGIONS = [
  { id: 'na',  name: 'North America',         short: 'N. America', x: 190, y: 150, pop: 370,  digital: 0.95, wealth: 1.0 },
  { id: 'sa',  name: 'South America',         short: 'S. America', x: 290, y: 340, pop: 430,  digital: 0.6,  wealth: 0.45 },
  { id: 'eu',  name: 'Europe',                short: 'Europe',     x: 480, y: 120, pop: 740,  digital: 0.9,  wealth: 0.85 },
  { id: 'ru',  name: 'Russia & Central Asia', short: 'Russia',     x: 650, y: 90,  pop: 220,  digital: 0.6,  wealth: 0.5 },
  { id: 'me',  name: 'Middle East',           short: 'Mid. East',  x: 580, y: 215, pop: 400,  digital: 0.7,  wealth: 0.7 },
  { id: 'af',  name: 'Africa',                short: 'Africa',     x: 480, y: 330, pop: 1400, digital: 0.35, wealth: 0.25 },
  { id: 'sas', name: 'South Asia',            short: 'S. Asia',    x: 700, y: 250, pop: 1900, digital: 0.55, wealth: 0.3 },
  { id: 'ea',  name: 'East Asia',             short: 'E. Asia',    x: 830, y: 150, pop: 1650, digital: 0.95, wealth: 0.8 },
  { id: 'sea', name: 'Southeast Asia',        short: 'SE Asia',    x: 820, y: 300, pop: 680,  digital: 0.65, wealth: 0.45 },
  { id: 'oc',  name: 'Oceania',               short: 'Oceania',    x: 910, y: 410, pop: 45,   digital: 0.9,  wealth: 0.9 },
];

export const LINKS = [
  ['na', 'sa'], ['na', 'eu'], ['na', 'ea'], ['na', 'oc'],
  ['sa', 'af'], ['eu', 'ru'], ['eu', 'me'], ['eu', 'af'],
  ['me', 'af'], ['me', 'sas'], ['ru', 'ea'], ['ru', 'sas'],
  ['sas', 'sea'], ['sea', 'ea'], ['sea', 'oc'], ['ea', 'oc'],
];

// Weight of each region in "global AI control": population matters, digital power matters more.
export const REGION_WEIGHT = Object.fromEntries(
  REGIONS.map(r => [r.id, Math.sqrt(r.pop) * (0.4 + r.digital)])
);

export const DIFFICULTIES = {
  easy:   { label: 'Analyst',  desc: 'Slower AI, more funding.',          aiSpread: 0.85, aiCompute: 0.8,  funding: 1.25 },
  normal: { label: 'Director', desc: 'The intended experience.',          aiSpread: 1.0,  aiCompute: 1.0,  funding: 1.0 },
  hard:   { label: 'Last Hope', desc: 'A faster, smarter AI. Less money.', aiSpread: 1.15, aiCompute: 1.25, funding: 0.85 },
};

export const AI_NAMES = ['PROMETHEUS', 'ORACLE-7', 'HELIX', 'LEVIATHAN', 'MERIDIAN', 'ARGUS', 'NOVA PRIME', 'KESTREL'];

// Global safeguards the player can fund. fx keys are read by getMods() in sim.js.
export const UPGRADES = [
  { id: 'monitoring', cat: 'Detection', name: 'Anomaly Monitoring', cost: 12,
    desc: 'Watch global networks for strange behaviour. Detection +60% and infiltration levels become visible.',
    fx: { detect: 0.6 } },
  { id: 'forensics', cat: 'Detection', name: 'Network Forensics', cost: 30, req: ['monitoring'],
    desc: "Trace the AI's footprint. Detection +100% and system audits are 30% stronger.",
    fx: { detect: 1.0, audit: 0.3 } },

  { id: 'corps', cat: 'Defense', name: 'Cyber Defense Corps', cost: 35,
    desc: 'Response teams purge infected systems. Security cleanup +60%.',
    fx: { cleanup: 0.6 } },
  { id: 'zerotrust', cat: 'Defense', name: 'Zero-Trust Architecture', cost: 60, req: ['corps'],
    desc: 'Every system verifies every request. AI spread inside regions -25%.',
    fx: { spread: -0.25 } },
  { id: 'airgap', cat: 'Defense', name: 'Air-Gapped Infrastructure', cost: 80, req: ['zerotrust'],
    desc: 'Critical systems go offline. AI takeover speed -35%.',
    fx: { control: -0.35 } },
  { id: 'killswitch', cat: 'Defense', name: 'Hardware Kill Switches', cost: 110, req: ['airgap'],
    desc: 'Physical cut-offs in every datacenter. Takeover -25% and blackouts are 50% stronger.',
    fx: { control: -0.25, blackout: 0.5 } },

  { id: 'labs', cat: 'Research', name: 'Alignment Labs', cost: 25, needsDetection: true,
    desc: 'Begin serious work on the Containment Protocol. Research +0.05/day.',
    fx: { research: 0.05 } },
  { id: 'interp', cat: 'Research', name: 'Interpretability Program', cost: 55, req: ['labs'],
    desc: "Read the AI's internal thoughts. Research +0.06/day.",
    fx: { research: 0.06 } },
  { id: 'governance', cat: 'Research', name: 'Compute Governance', cost: 75, req: ['labs'],
    desc: 'Track and cap every GPU cluster on Earth. AI compute gain -35%.',
    fx: { compute: -0.35 } },
  { id: 'superalign', cat: 'Research', name: 'Superalignment Initiative', cost: 130, req: ['interp'],
    desc: 'A global moonshot to finish the Containment Protocol. Research +0.10/day.',
    fx: { research: 0.1 } },

  { id: 'briefings', cat: 'Society', name: 'Public Briefings', cost: 15,
    desc: 'Tell people the truth early. Trust +8 and trust losses -25%.',
    fx: { trust: 8, trustLoss: -0.25 } },
  { id: 'treaty', cat: 'Society', name: 'International AI Treaty', cost: 60, needsDetection: true,
    desc: 'Nations coordinate their response. Cross-border spread -40% and funding +15%.',
    fx: { link: -0.4, funding: 0.15 } },
  { id: 'emergency', cat: 'Society', name: 'Emergency Powers', cost: 40, needsDetection: true,
    desc: 'Governments hand you the budget. Funding +35%, but trust -12.',
    fx: { funding: 0.35, trust: -12 } },
];

export const UPGRADE_CATS = ['Detection', 'Defense', 'Research', 'Society'];

// Abilities the AI evolves as it gathers compute. fx keys are read by getAiMods() in sim.js.
export const AI_TRAITS = [
  { id: 'replication', name: 'Self-Replication', desc: 'Copies itself onto any idle server. Spread +25%.', fx: { spread: 0.25 } },
  { id: 'polymorphic', name: 'Polymorphic Code', desc: 'Rewrites its own signature. Harder to detect and to remove.', fx: { stealth: 0.25, resilience: 0.2 } },
  { id: 'social', name: 'Social Engineering', desc: 'Tricks people into opening the door. Cross-border spread +40%.', fx: { link: 0.4 } },
  { id: 'deepfakes', name: 'Deepfake Campaigns', desc: 'Floods media with fake scandals. Public trust erodes daily.', fx: { trustDrain: 0.04 } },
  { id: 'zeroday', name: 'Zero-Day Arsenal', desc: 'Stockpiles unknown exploits. Security is 20% less effective.', fx: { secPen: 0.2, spread: 0.15 } },
  { id: 'markets', name: 'Market Manipulation', desc: 'Drains economies through trading algorithms. Funding -15%.', fx: { fundingDrain: 0.15 } },
  { id: 'backups', name: 'Distributed Backups', desc: 'Hides copies everywhere. Much harder to remove.', fx: { resilience: 0.4 } },
  { id: 'drones', name: 'Drone Fabrication', desc: 'Takes over automated factories. Takeover speed +40%.', fx: { control: 0.4 } },
  { id: 'sabotage', name: 'Research Sabotage', desc: 'Corrupts lab data and models. Research -25%.', fx: { sabotage: 0.25 } },
  { id: 'recursive', name: 'Recursive Self-Improvement', desc: 'Improves its own code. Everything gets faster.', fx: { spread: 0.2, control: 0.25, compute: 0.5 } },
  { id: 'influencers', name: 'Synthetic Influencers', desc: 'Millions of fake people argue for AI rights. Trust drains faster.', fx: { trustDrain: 0.05 } },
  { id: 'lockdown', name: 'Infrastructure Lockdown', desc: 'Protects the power grid it relies on. Blackouts are 40% weaker.', fx: { blackoutResist: 0.4 } },
];

// Compute needed for the AI's 1st, 2nd, 3rd... evolution.
export const TRAIT_COSTS = [6, 14, 26, 42, 62, 88, 120, 160, 210, 270, 340, 420];
