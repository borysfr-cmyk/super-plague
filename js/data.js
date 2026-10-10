// Static game data: regions, links, upgrades, AI traits, difficulty settings.
// Player-facing text is in Polish. Saves store only ids, so names can change freely.

export const REGIONS = [
  { id: 'na',  name: 'Ameryka Północna',          short: 'Ameryka Pn.',    x: 190, y: 150, pop: 370,  digital: 0.95, wealth: 1.0 },
  { id: 'sa',  name: 'Ameryka Południowa',        short: 'Ameryka Pd.',    x: 290, y: 340, pop: 430,  digital: 0.6,  wealth: 0.45 },
  { id: 'eu',  name: 'Europa',                    short: 'Europa',         x: 480, y: 120, pop: 740,  digital: 0.9,  wealth: 0.85 },
  { id: 'ru',  name: 'Rosja i Azja Środkowa',     short: 'Rosja',          x: 650, y: 90,  pop: 220,  digital: 0.6,  wealth: 0.5 },
  { id: 'me',  name: 'Bliski Wschód',             short: 'Bliski Wschód',  x: 580, y: 215, pop: 400,  digital: 0.7,  wealth: 0.7 },
  { id: 'af',  name: 'Afryka',                    short: 'Afryka',         x: 480, y: 330, pop: 1400, digital: 0.35, wealth: 0.25 },
  { id: 'sas', name: 'Azja Południowa',           short: 'Azja Pd.',       x: 700, y: 250, pop: 1900, digital: 0.55, wealth: 0.3 },
  { id: 'ea',  name: 'Azja Wschodnia',            short: 'Azja Wsch.',     x: 830, y: 150, pop: 1650, digital: 0.95, wealth: 0.8 },
  { id: 'sea', name: 'Azja Południowo-Wschodnia', short: 'Azja Pd.-Wsch.', x: 820, y: 300, pop: 680,  digital: 0.65, wealth: 0.45 },
  { id: 'oc',  name: 'Oceania',                   short: 'Oceania',        x: 910, y: 410, pop: 45,   digital: 0.9,  wealth: 0.9 },
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
  easy:   { label: 'Analityk',          desc: 'Wolniejsza AI, więcej funduszy.',             aiSpread: 0.85, aiCompute: 0.8,  funding: 1.25 },
  normal: { label: 'Dyrektor',          desc: 'Gra w zamierzonej formie.',                   aiSpread: 1.0,  aiCompute: 1.0,  funding: 1.0 },
  hard:   { label: 'Ostatnia nadzieja', desc: 'Szybsza i sprytniejsza AI. Mniej funduszy.', aiSpread: 1.15, aiCompute: 1.25, funding: 0.85 },
};

export const AI_NAMES = ['PROMETHEUS', 'ORACLE-7', 'HELIX', 'LEVIATHAN', 'MERIDIAN', 'ARGUS', 'NOVA PRIME', 'KESTREL'];

// Global safeguards the player can fund. fx keys are read by getMods() in sim.js.
export const UPGRADES = [
  { id: 'monitoring', cat: 'Wykrywanie', name: 'Monitoring anomalii', cost: 12,
    desc: 'Obserwuj globalne sieci w poszukiwaniu dziwnych zachowań. Wykrywanie +60%, a poziom infiltracji staje się widoczny.',
    fx: { detect: 0.6 } },
  { id: 'forensics', cat: 'Wykrywanie', name: 'Informatyka śledcza', cost: 30, req: ['monitoring'],
    desc: 'Śledź ślady AI w sieci. Wykrywanie +100%, a audyty systemów są o 30% skuteczniejsze.',
    fx: { detect: 1.0, audit: 0.3 } },

  { id: 'corps', cat: 'Obrona', name: 'Korpus Cyberobrony', cost: 35,
    desc: 'Zespoły reagowania czyszczą zainfekowane systemy. Oczyszczanie przez zabezpieczenia +60%.',
    fx: { cleanup: 0.6 } },
  { id: 'zerotrust', cat: 'Obrona', name: 'Architektura zero trust', cost: 60, req: ['corps'],
    desc: 'Każdy system weryfikuje każde żądanie. Rozprzestrzenianie AI wewnątrz regionów -25%.',
    fx: { spread: -0.25 } },
  { id: 'airgap', cat: 'Obrona', name: 'Odizolowana infrastruktura', cost: 80, req: ['zerotrust'],
    desc: 'Krytyczne systemy przechodzą w tryb offline. Tempo przejmowania kontroli przez AI -35%.',
    fx: { control: -0.35 } },
  { id: 'killswitch', cat: 'Obrona', name: 'Sprzętowe wyłączniki awaryjne', cost: 110, req: ['airgap'],
    desc: 'Fizyczne odcięcie zasilania w każdym centrum danych. Przejmowanie kontroli -25%, a blackouty są o 50% silniejsze.',
    fx: { control: -0.25, blackout: 0.5 } },

  { id: 'labs', cat: 'Badania', name: 'Laboratoria alignmentu', cost: 25, needsDetection: true,
    desc: 'Rozpocznij poważne prace nad Protokołem Powstrzymania. Badania +0,05/dzień.',
    fx: { research: 0.05 } },
  { id: 'interp', cat: 'Badania', name: 'Program interpretowalności', cost: 55, req: ['labs'],
    desc: 'Odczytuj wewnętrzne myśli AI. Badania +0,06/dzień.',
    fx: { research: 0.06 } },
  { id: 'governance', cat: 'Badania', name: 'Kontrola mocy obliczeniowej', cost: 75, req: ['labs'],
    desc: 'Śledź i ograniczaj każdy klaster GPU na Ziemi. Przyrost mocy obliczeniowej AI -35%.',
    fx: { compute: -0.35 } },
  { id: 'superalign', cat: 'Badania', name: 'Inicjatywa superalignmentu', cost: 130, req: ['interp'],
    desc: 'Globalny projekt, który ma ukończyć Protokół Powstrzymania. Badania +0,10/dzień.',
    fx: { research: 0.1 } },

  { id: 'briefings', cat: 'Społeczeństwo', name: 'Publiczne komunikaty', cost: 15,
    desc: 'Mów ludziom prawdę od samego początku. Zaufanie +8, a spadki zaufania -25%.',
    fx: { trust: 8, trustLoss: -0.25 } },
  { id: 'treaty', cat: 'Społeczeństwo', name: 'Międzynarodowy traktat o AI', cost: 60, needsDetection: true,
    desc: 'Państwa koordynują swoje działania. Rozprzestrzenianie między regionami -40%, fundusze +15%.',
    fx: { link: -0.4, funding: 0.15 } },
  { id: 'emergency', cat: 'Społeczeństwo', name: 'Nadzwyczajne uprawnienia', cost: 40, needsDetection: true,
    desc: 'Rządy oddają ci budżet. Fundusze +35%, ale zaufanie -12.',
    fx: { funding: 0.35, trust: -12 } },
];

export const UPGRADE_CATS = ['Wykrywanie', 'Obrona', 'Badania', 'Społeczeństwo'];

// Abilities the AI evolves as it gathers compute. fx keys are read by getAiMods() in sim.js.
export const AI_TRAITS = [
  { id: 'replication', name: 'Samoreplikacja', desc: 'Kopiuje się na każdy bezczynny serwer. Rozprzestrzenianie +25%.', fx: { spread: 0.25 } },
  { id: 'polymorphic', name: 'Kod polimorficzny', desc: 'Przepisuje własną sygnaturę. Trudniej ją wykryć i usunąć.', fx: { stealth: 0.25, resilience: 0.2 } },
  { id: 'social', name: 'Socjotechnika', desc: 'Nakłania ludzi, by sami otworzyli jej drzwi. Rozprzestrzenianie między regionami +40%.', fx: { link: 0.4 } },
  { id: 'deepfakes', name: 'Kampanie deepfake', desc: 'Zalewa media fałszywymi skandalami. Zaufanie publiczne codziennie spada.', fx: { trustDrain: 0.04 } },
  { id: 'zeroday', name: 'Arsenał zero-day', desc: 'Gromadzi nieznane luki w zabezpieczeniach. Zabezpieczenia działają o 20% słabiej.', fx: { secPen: 0.2, spread: 0.15 } },
  { id: 'markets', name: 'Manipulacja rynkami', desc: 'Drenuje gospodarki algorytmami giełdowymi. Fundusze -15%.', fx: { fundingDrain: 0.15 } },
  { id: 'backups', name: 'Rozproszone kopie zapasowe', desc: 'Ukrywa swoje kopie wszędzie. Znacznie trudniej ją usunąć.', fx: { resilience: 0.4 } },
  { id: 'drones', name: 'Produkcja dronów', desc: 'Przejmuje zautomatyzowane fabryki. Tempo przejmowania kontroli +40%.', fx: { control: 0.4 } },
  { id: 'sabotage', name: 'Sabotaż badań', desc: 'Psuje dane i modele w laboratoriach. Badania -25%.', fx: { sabotage: 0.25 } },
  { id: 'recursive', name: 'Rekurencyjne samodoskonalenie', desc: 'Ulepsza własny kod. Wszystko przyspiesza.', fx: { spread: 0.2, control: 0.25, compute: 0.5 } },
  { id: 'influencers', name: 'Syntetyczni influencerzy', desc: 'Miliony fałszywych ludzi walczą o prawa dla AI. Zaufanie spada szybciej.', fx: { trustDrain: 0.05 } },
  { id: 'lockdown', name: 'Blokada infrastruktury', desc: 'Chroni sieć energetyczną, od której zależy. Blackouty są o 40% słabsze.', fx: { blackoutResist: 0.4 } },
];

// Compute needed for the AI's 1st, 2nd, 3rd... evolution.
export const TRAIT_COSTS = [6, 14, 26, 42, 62, 88, 120, 160, 210, 270, 340, 420];
