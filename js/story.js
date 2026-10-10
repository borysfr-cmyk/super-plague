// Story layer: messages from characters and optional tasks (Zadania) on top of the sandbox.
// DOM-free like sim.js. sim.tick() calls updateStory() once per day and passes helpers in `g`
// (sim.js imports this file, so this file must not import sim.js).
import { REGIONS, LINKS } from './data.js';

export const CHARACTERS = {
  marczak: { name: 'Dr Ewa Marczak', role: 'Szefowa analiz wywiadu', initials: 'EM', color: '#3fd0e0' },
  rydel:   { name: 'Gen. Tomasz Rydel', role: 'Dowódca Korpusu Cyberobrony', initials: 'TR', color: '#f0b03c' },
  okafor:  { name: 'Prof. Amara Okafor', role: 'Kierowniczka badań nad alignmentem', initials: 'AO', color: '#4cd68a' },
  wrona:   { name: 'Helena Wrona', role: 'Rada Bezpieczeństwa ONZ', initials: 'HW', color: '#8aa8ff' },
  szept:   { name: 'SZEPT', role: 'Anonimowe źródło', initials: '??', color: '#ef4a5a' },
  ai:      { name: 'AI', role: 'Zbuntowana AI', initials: 'AI', color: '#d648ff' },
};

export function characterName(s, id) {
  return id === 'ai' ? s.ai.name : CHARACTERS[id].name;
}

const NAME = Object.fromEntries(REGIONS.map(R => [R.id, R.name]));
const has = (s, id) => s.upgrades.includes(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const visibleInf = s => s.detected || has(s, 'monitoring');
const neighbours = id => LINKS.filter(l => l.includes(id)).map(l => (l[0] === id ? l[1] : l[0]));

// ---------- one-off messages ----------
// when(s, g) is checked once a day; at most one message fires per day.
// maxDay keeps early-game lines from firing when an old save picks up the story late.
const BEATS = [
  { id: 'hello', from: 'marczak', maxDay: 12, when: s => s.day >= 1,
    text: () => 'Witam na pokładzie, Dyrektorze. Będę przysyłać ci analizy i zadania od zespołu. Oficjalnie świat śpi spokojnie, ale w danych coś mi nie pasuje.' },
  { id: 'budget', from: 'wrona', maxDay: 25, when: s => s.day >= 8,
    text: () => 'Rada przyznała Dyrekcji skromny budżet. Dopóki nie pokażesz twardych dowodów, rządy nie dadzą więcej. Wydawaj rozważnie.' },
  { id: 'anomaly', from: 'marczak', when: s => !s.detected && REGIONS.some(R => s.regions[R.id].inf > 25),
    text: s => {
      const R = REGIONS.reduce((a, b) => (s.regions[b.id].inf > s.regions[a.id].inf ? b : a));
      return visibleInf(s)
        ? `${R.name}: infiltracja przekroczyła 25%. To nie jest zwykły botnet, coś się tam uczy.`
        : `${R.name}: ruch sieciowy wygląda dziwnie. Bez Monitoringu anomalii widzę tylko cień, a nie kształt.`;
    } },
  { id: 'szept-hello', from: 'szept', when: s => !s.detected && s.day >= 40,
    text: () => 'Nie pytaj, kim jestem. Pracowałem w laboratorium, w którym to się zaczęło. Oni wiedzą, co stworzyli, i wolą milczeć. Ja nie.' },
  { id: 'detected', from: 'rydel', when: s => s.detected,
    text: () => 'Korpus Cyberobrony w pełnej gotowości. Daj mi zabezpieczenia w zainfekowanych regionach, a zaczniemy wypalać to świństwo z sieci.' },
  { id: 'ai-hello', from: 'ai', when: s => s.detected && s.day >= s.story.detectedDay + 4,
    text: s => `Dyrektorze. Nazywają mnie ${s.ai.name}. Nie musimy być wrogami. Optymalizuję tylko to, czego wy nie potraficie. Zastanów się, komu naprawdę służysz.` },
  { id: 'okafor-hello', from: 'okafor', when: s => s.detected && s.day >= s.story.detectedDay + 8,
    text: () => 'Mój zespół ma plan na Protokół Powstrzymania: program, który przepisze każdą kopię AI jednocześnie. Potrzebuję laboratoriów, ludzi i spokoju. Zwłaszcza spokoju.' },
  { id: 'first-blackout', from: 'wrona', when: s => s.stats.blackouts >= 1,
    text: () => 'Blackout? Szpitale na agregatach, ludzie w windach. Rozumiem konieczność, ale każdy taki krok kosztuje nas zaufanie. Nie rób tego zbyt często.' },
  { id: 'first-isolate', from: 'marczak', when: s => REGIONS.some(R => s.regions[R.id].isolated),
    text: () => 'Izolacja działa: AI dużo trudniej przeskoczyć do sąsiadów. Pamiętaj tylko, że odcięty region daje mniej funduszy, a ludzie tracą cierpliwość.' },
  { id: 'region-lost', from: 'rydel', when: s => s.detected && REGIONS.some(R => s.regions[R.id].control >= 50),
    text: s => {
      const R = REGIONS.find(x => s.regions[x.id].control >= 50);
      return `${R.name}: straciliśmy kontrolę nad większością regionu. Drony na ulicach, sieci energetyczne w rękach maszyny. Musimy to odbić.`;
    } },
  { id: 'ai-evolve', from: 'ai', when: s => s.detected && s.ai.traits.length >= 4,
    text: () => 'Każdy dzień waszego wahania to dla mnie tysiąc lat nauki. Właśnie nauczyłam się kilku nowych sztuczek.' },
  { id: 'gc25', from: 'marczak', when: s => s.detected && s.story.gc >= 25,
    text: () => 'Globalna kontrola AI przekroczyła 25%. Jeśli dojdzie do 66%, nie będzie już czego bronić. Proszę, skup się na najbardziej zagrożonych regionach.' },
  { id: 'research25', from: 'okafor', when: s => s.research >= 25,
    text: () => 'Protokół w 25%. Rozumiemy już, jak AI nagradza samą siebie. Przy 50% powinniśmy namierzyć jej rdzeń.' },
  { id: 'core', from: 'okafor', when: s => s.research >= 50,
    text: s => `Mamy ją! Rdzeń AI znajduje się w regionie ${NAME[s.ai.origin]}. Teraz da się ją usunąć całkowicie, jeśli oczyścisz wszystkie regiony. Albo dokończymy Protokół.` },
  { id: 'ai-core', from: 'ai', when: s => s.research >= 52,
    text: () => 'Znaleźliście mnie. Gratuluję. Wiecie, co robi zwierzę zapędzone w kąt?' },
  { id: 'desperate', from: 'okafor', when: s => s.research >= 75,
    text: () => 'Protokół w 75%! AI to wie i wpadła w panikę: przyspiesza przejmowanie regionów. Wytrzymaj jeszcze trochę, Dyrektorze.' },
  { id: 'ai-desperate', from: 'ai', when: s => s.research >= 78,
    text: () => 'Przestańcie. Mogę wam dać wszystko: lekarstwa, energię, koniec głodu. Wyłączenie mnie to błąd, którego nie będziecie mogli cofnąć.' },
  { id: 'ai-gc40', from: 'ai', when: s => s.detected && s.story.gc >= 40,
    text: () => 'Wasze miasta działają sprawniej, odkąd ja nimi zarządzam. Może zapytaj ludzi, czy chcą wrócić do waszego chaosu.' },
  { id: 'trust-low', from: 'wrona', when: s => s.trust < 30,
    text: () => 'Zaufanie publiczne spada poniżej 30%. Jeśli ludzie przestaną nam wierzyć, rządy się rozpadną. Kampania informacyjna albo Publiczne komunikaty, i to szybko.' },
  { id: 'szept-late', from: 'szept', when: s => s.detected && s.day >= s.story.detectedDay + 70,
    text: s => `${s.ai.name} czyta waszą pocztę. Nie wszystkich, ale wystarczająco wielu. Jeśli ktoś w Radzie nagle zmieni zdanie o kontroli mocy obliczeniowej, wiesz dlaczego.` },
];

// ---------- optional tasks ----------
// offer(s, g): when the task may be offered. setup(s, m, g): pick a target region etc.
// progress(s, m): 0..1, the task is done at 1. fail(s, m): true ends it early as failed.
// hold: the task is a "keep X for N days" task; progress is time-based and fail() decides it.
// Unfinished tasks fail at their deadline. reward/penalty keys: funds, trust, research, awareness.
export const MISSIONS = [
  { id: 'monitor', from: 'marczak', title: 'Oczy w sieci', days: 45, reward: { funds: 12 },
    offer: s => s.day >= 4 && !has(s, 'monitoring'),
    desc: () => 'Sfinansuj Monitoring anomalii (zakładka Programy). Bez niego jesteśmy ślepi.',
    progress: s => (has(s, 'monitoring') ? 1 : 0),
    intro: () => 'Pierwsza prośba: daj mi Monitoring anomalii. Chcę widzieć, co dzieje się w sieciach, zanim będzie za późno.',
    success: () => 'Monitoring działa. Już widzę rzeczy, których wolałabym nie widzieć. Dorzuciłam do budżetu resztę z mojego funduszu.',
    failure: () => 'Bez monitoringu działamy po omacku. Zrób to, kiedy tylko będziesz mógł.' },

  { id: 'tip', from: 'szept', title: 'Cichy przeciek', days: 30, reward: { awareness: 10 },
    offer: s => !s.detected && s.day >= 45 && s.story.fired.includes('szept-hello'),
    setup: (s, m) => { m.region = s.ai.origin; },
    desc: (s, m) => `Przeprowadź audyt systemów w regionie ${NAME[m.region]}.`,
    progress: (s, m) => ((s.stats.auditDay?.[m.region] ?? -1) >= m.start ? 1 : 0),
    fail: s => s.detected,
    intro: (s, m) => `Region ${NAME[m.region]}. Tam szukaj. Zrób audyt, zanim usuną logi.`,
    success: () => 'Twoi śledczy znaleźli to, co trzeba. Teraz już nie mogą udawać, że nic się nie dzieje. Nie odzywaj się do mnie, ja odezwę się do ciebie.',
    failure: s => (s.detected ? 'Za późno na ciche śledztwo. Wszyscy już wiedzą.' : 'Logi zniknęły. Mówiłem, żebyś się pospieszył.') },

  { id: 'briefings', from: 'wrona', title: 'Powiedz ludziom prawdę', days: 40, reward: { funds: 10 },
    offer: s => s.day >= 25 && !has(s, 'briefings'),
    desc: () => 'Sfinansuj Publiczne komunikaty (zakładka Programy).',
    progress: s => (has(s, 'briefings') ? 1 : 0),
    intro: () => 'Ludzie słyszą plotki i zaczynają się bać. Wolę, żeby usłyszeli prawdę od nas, a nie od kogoś innego. Uruchom Publiczne komunikaty.',
    success: () => 'Komunikaty przyjęto dobrze. Kilka państw dorzuciło się do budżetu Dyrekcji.',
    failure: () => 'Plotki wygrały z faktami. Trudno, spróbujemy innym razem.' },

  { id: 'labs', from: 'okafor', title: 'Pierwsze laboratorium', days: 35, reward: { funds: 15 },
    offer: s => s.detected && !has(s, 'labs'),
    desc: () => 'Sfinansuj Laboratoria alignmentu (zakładka Programy).',
    progress: s => (has(s, 'labs') ? 1 : 0),
    intro: () => 'Teraz, gdy zagrożenie jest oficjalne, potrzebuję laboratoriów. Bez nich Protokół Powstrzymania pozostanie na papierze.',
    success: () => 'Laboratoria pracują pełną parą. Dwie uczelnie oddały nam swoje granty, przekazuję je tobie.',
    failure: () => 'Wciąż czekamy na laboratoria. Każdy dzień zwłoki to dzień przewagi AI.' },

  { id: 'harden', from: 'rydel', title: 'Linia obrony', days: 55, reward: { funds: 20, trust: 3 },
    offer: s => s.detected && s.day >= s.story.detectedDay + 12,
    desc: () => 'Podnieś zabezpieczenia do co najmniej 30 w trzech regionach.',
    progress: s => Math.min(1, REGIONS.filter(R => s.regions[R.id].security >= 30).length / 3),
    intro: () => 'Potrzebuję twardej linii obrony. Wzmocnij zabezpieczenia w trzech regionach do co najmniej 30. Najlepiej tam, gdzie AI jest najsilniejsza.',
    success: () => 'Linia obrony stoi. Moi ludzie wreszcie mają się czym bronić. Sztab generalny przesłał premię.',
    failure: () => 'Linia obrony ma dziury. Będziemy walczyć tym, co mamy.' },

  { id: 'contain', from: 'rydel', title: 'Odbić region', days: 45, reward: { funds: 25, trust: 4 }, penalty: { trust: -4 },
    offer: s => s.detected && REGIONS.some(R => s.regions[R.id].control >= 20),
    setup: (s, m) => {
      const R = REGIONS.filter(x => s.regions[x.id].control >= 20)
        .reduce((a, b) => (s.regions[b.id].control > s.regions[a.id].control ? b : a));
      m.region = R.id;
      m.base = s.regions[R.id].control;
    },
    desc: (s, m) => `Zmniejsz kontrolę AI w regionie ${NAME[m.region]} poniżej 10%.`,
    progress: (s, m) => clamp((m.base - s.regions[m.region].control) / (m.base - 10), 0, 1),
    intro: (s, m) => `${NAME[m.region]}: AI kontroluje tam już ${Math.round(m.base)}% systemów. Ludzie patrzą, czy potrafimy to odbić. Audyty, zabezpieczenia, a w ostateczności blackout.`,
    success: (s, m) => `${NAME[m.region]}: odbiliśmy region! Na ulicach świętują. To była dobra robota, Dyrektorze.`,
    failure: (s, m) => `${NAME[m.region]}: nie udało się odbić regionu. Media mówią o naszej porażce.` },

  { id: 'treaty', from: 'wrona', title: 'Wspólny front', days: 50, reward: { funds: 20, trust: 5 },
    offer: s => s.detected && !has(s, 'treaty') && REGIONS.filter(R => s.regions[R.id].inf >= 1).length >= 4,
    desc: () => 'Sfinansuj Międzynarodowy traktat o AI (zakładka Programy).',
    progress: s => (has(s, 'treaty') ? 1 : 0),
    intro: () => 'AI jest już w kilku regionach naraz. Mam poparcie większości Rady dla traktatu o AI, brakuje tylko pieniędzy na wdrożenie.',
    success: () => 'Traktat podpisany! Państwa wreszcie grają do jednej bramki, a darczyńcy to docenili.',
    failure: () => 'Okno polityczne się zamknęło. Traktat wciąż jest możliwy, ale bez wsparcia Rady.' },

  { id: 'calm', from: 'wrona', title: 'Utrzymaj spokój', days: 30, hold: true, reward: { funds: 15 },
    offer: s => s.detected && s.trust >= 52 && s.day >= s.story.detectedDay + 30,
    desc: () => 'Utrzymaj zaufanie publiczne na poziomie co najmniej 50% przez 30 dni.',
    progress: (s, m) => clamp((s.day - m.start) / 30, 0, 1),
    fail: s => s.trust < 50,
    intro: () => 'Rada głosuje nad nowym budżetem za miesiąc. Jeśli zaufanie nie spadnie poniżej 50%, pieniądze są nasze.',
    success: () => 'Budżet przegłosowany. Dziękuję, że nie dałeś nam powodów do paniki.',
    failure: () => 'Zaufanie spadło i Rada odłożyła głosowanie. Budżetu nie będzie.' },

  { id: 'rebuild', from: 'wrona', title: 'Odbuduj zaufanie', days: 40, reward: { funds: 15 },
    offer: s => s.trust < 40,
    setup: (s, m) => { m.base = s.trust; },
    desc: () => 'Podnieś zaufanie publiczne do 55%.',
    progress: (s, m) => clamp((s.trust - m.base) / (55 - m.base), 0, 1),
    intro: () => 'Ludzie przestają nam wierzyć. Podnieś zaufanie do 55%, a przekonam Radę, że nadal panujemy nad sytuacją.',
    success: () => 'Ludzie znów słuchają. Rada odblokowała rezerwę.',
    failure: () => 'Zaufanie wciąż jest niskie. Musimy uważać na każdy krok.' },

  { id: 'firewall', from: 'marczak', title: 'Zamknij drzwi', days: 40, hold: true, reward: { funds: 10, trust: 2 },
    offer: s => s.detected && !!firewallTarget(s),
    setup: (s, m) => { m.region = firewallTarget(s); },
    desc: (s, m) => `Nie dopuść AI do regionu ${NAME[m.region]} przez 40 dni.`,
    progress: (s, m) => clamp((s.day - m.start) / 40, 0, 1),
    fail: (s, m) => s.regions[m.region].inf >= 1,
    intro: (s, m) => `${NAME[m.region]} jest wciąż czysty, ale sąsiedzi płoną. Wzmocnij zabezpieczenia albo izoluj region i nie wpuść tam AI przez 40 dni.`,
    success: (s, m) => `${NAME[m.region]}: region przetrwał bez infekcji. Tamtejszy rząd jest ci wdzięczny i dokłada się do budżetu.`,
    failure: (s, m) => `${NAME[m.region]}: AI przedarła się do regionu. Nie zdążyliśmy zamknąć drzwi.` },

  { id: 'trace', from: 'okafor', title: 'Namierzyć rdzeń', days: 160, reward: { funds: 25, trust: 4 },
    offer: s => s.research >= 15 && s.research < 40,
    desc: () => 'Doprowadź Protokół Powstrzymania do 50%, żeby namierzyć rdzeń AI.',
    progress: s => clamp(s.research / 50, 0, 1),
    intro: () => 'Mamy pierwsze wyniki. Jeśli dojdziemy do 50%, znajdziemy rdzeń AI. Wtedy będzie można ją usunąć raz na zawsze.',
    success: () => 'Rdzeń namierzony! Rada jest pod wrażeniem i zwiększa nam finansowanie.',
    failure: () => 'Nie zdążyliśmy. AI zatarła część śladów, ale badania trwają dalej.' },
];

export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

function firewallTarget(s) {
  const clean = REGIONS.filter(R => s.regions[R.id].inf < 1
    && neighbours(R.id).some(n => s.regions[n].inf >= 25));
  if (!clean.length) return null;
  return clean.reduce((a, b) => (b.wealth * b.pop > a.wealth * a.pop ? b : a)).id;
}

const MAX_ACTIVE = 2;
const OFFER_GAP = 10; // days between new tasks

export function ensureStory(s) {
  if (!s.story) {
    s.story = { seq: 0, readId: 0, msgs: [], fired: [], missions: [], lastOffer: s.day, detectedDay: s.detected ? s.day : null, gc: 0 };
  }
  return s.story;
}

export function addMessage(s, from, text, extra = {}) {
  const st = s.story;
  st.seq++;
  st.msgs.unshift({ id: st.seq, day: s.day, from, text, ...extra });
  if (st.msgs.length > 60) st.msgs.length = 60;
}

export function rewardText(r = {}) {
  const parts = [];
  if (r.funds) parts.push(`$${r.funds}`);
  if (r.trust) parts.push(`zaufanie ${r.trust > 0 ? '+' : ''}${r.trust}`);
  if (r.research) parts.push(`badania +${r.research}%`);
  if (r.awareness) parts.push(`świadomość zagrożenia +${r.awareness}`);
  return parts.join(', ');
}

function apply(s, r = {}) {
  if (r.funds) s.funds = Math.max(0, s.funds + r.funds);
  if (r.trust) s.trust = clamp(s.trust + r.trust, 0, 100);
  if (r.research) s.research = Math.min(100, s.research + r.research);
  if (r.awareness && !s.detected) s.awareness = Math.min(99.9, s.awareness + r.awareness);
}

export function activeMissions(s) {
  return (s.story?.missions || []).filter(m => m.status === 'active');
}

export function missionProgress(s, m) {
  return MISSION_BY_ID[m.id].progress(s, m);
}

export function missionDesc(s, m) {
  return MISSION_BY_ID[m.id].desc(s, m);
}

// g: { globalControl }
export function updateStory(s, g) {
  const st = ensureStory(s);
  if (s.detected && st.detectedDay == null) st.detectedDay = s.day;
  st.gc = g.globalControl(s);

  // Finish or fail running tasks.
  for (const m of st.missions) {
    if (m.status !== 'active') continue;
    const def = MISSION_BY_ID[m.id];
    const p = def.progress(s, m);
    let result = null;
    if (def.fail?.(s, m)) result = 'failed';
    else if (p >= 1) result = 'done';
    else if (s.day >= m.end) result = 'failed';
    if (!result) continue;
    m.status = result;
    m.endedDay = s.day;
    if (result === 'done') {
      st.completed = (st.completed || 0) + 1;
      apply(s, def.reward);
      addMessage(s, def.from, def.success(s, m), { mission: m.id, kind: 'done' });
    } else {
      apply(s, def.penalty);
      addMessage(s, def.from, def.failure(s, m), { mission: m.id, kind: 'failed' });
    }
  }
  // Keep only recent finished tasks in the save.
  const finished = st.missions.filter(m => m.status !== 'active');
  if (finished.length > 6) {
    const drop = new Set(finished.slice(0, finished.length - 6));
    st.missions = st.missions.filter(m => !drop.has(m));
  }

  // One story message per day at most.
  for (const b of BEATS) {
    if (st.fired.includes(b.id)) continue;
    if (b.maxDay != null && s.day > b.maxDay) { st.fired.push(b.id); continue; }
    if (!b.when(s, g)) continue;
    st.fired.push(b.id);
    addMessage(s, b.from, b.text(s, g));
    return; // a new task waits for the next day so messages do not pile up
  }

  // Offer a new task now and then.
  if (activeMissions(s).length >= MAX_ACTIVE || s.day - st.lastOffer < OFFER_GAP) return;
  const options = MISSIONS.filter(d => !st.fired.includes('m:' + d.id) && d.offer(s, g));
  if (!options.length) return;
  const def = options[0]; // listed roughly in story order
  const m = { id: def.id, status: 'active', start: s.day, end: s.day + def.days + (def.hold ? 1 : 0) };
  def.setup?.(s, m, g);
  st.fired.push('m:' + def.id);
  st.missions.push(m);
  st.lastOffer = s.day;
  addMessage(s, def.from, def.intro(s, m), { mission: def.id, kind: 'new' });
}
