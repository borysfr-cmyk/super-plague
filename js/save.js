// Save system. Every storage backend implements the same small interface:
//   name, isAvailable(), save(slot, { savedAt, state }), load(slot), remove(slot)
// LocalSaveProvider always works. CloudSaveProvider uses Firebase (js/cloud.js)
// once js/firebase-config.js holds a config and the player has signed in.
import { SAVE_VERSION } from './sim.js';
import * as cloudApi from './cloud.js';

const PREFIX = 'superplague.save.';
const CODE_PREFIX = 'SP1:';

export class LocalSaveProvider {
  id = 'local';
  name = 'To urządzenie';
  isAvailable() {
    try {
      localStorage.setItem(PREFIX + '_test', '1');
      localStorage.removeItem(PREFIX + '_test');
      return true;
    } catch { return false; }
  }
  async save(slot, record) {
    localStorage.setItem(PREFIX + slot, JSON.stringify(record));
  }
  async load(slot) {
    try {
      const raw = localStorage.getItem(PREFIX + slot);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  async remove(slot) {
    try { localStorage.removeItem(PREFIX + slot); } catch { /* ignore */ }
  }
}

export class CloudSaveProvider {
  id = 'cloud';
  name = 'Chmura';
  isAvailable() { return cloudApi.isReady() && !!cloudApi.currentUser(); }
  save(slot, record) { return cloudApi.cloudSave(slot, record); }
  load(slot) { return cloudApi.cloudLoad(slot); }
  remove(slot) { return cloudApi.cloudRemove(slot); }
}

export const local = new LocalSaveProvider();
export const cloud = new CloudSaveProvider();

export async function saveGame(state, slot = 'auto') {
  const results = {};
  const record = { savedAt: Date.now(), state };
  for (const p of [local, cloud]) {
    if (!p.isAvailable()) continue;
    try { await p.save(slot, record); results[p.id] = true; } catch (e) { console.warn(e); results[p.id] = false; }
  }
  return results;
}

// Loads the newest save across all available providers.
export async function loadGame(slot = 'auto') {
  let best = null;
  for (const p of [local, cloud]) {
    if (!p.isAvailable()) continue;
    const rec = await p.load(slot).catch(() => null);
    if (rec && rec.state?.version === SAVE_VERSION && (!best || rec.savedAt > best.savedAt)) best = rec;
  }
  return best;
}

export async function deleteSave(slot = 'auto') {
  for (const p of [local, cloud]) if (p.isAvailable()) await p.remove(slot).catch(() => {});
}

// Save codes let a player move a game between devices by copy & paste.
export function exportCode(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return CODE_PREFIX + btoa(bin);
}

export function importCode(code) {
  const clean = code.trim().replace(/\s+/g, '');
  if (!clean.startsWith(CODE_PREFIX)) throw new Error('To nie jest kod zapisu gry Super Plague.');
  let state;
  try {
    const bin = atob(clean.slice(CODE_PREFIX.length));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    state = JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw new Error('Ten kod zapisu jest uszkodzony lub niekompletny.'); }
  if (state.version !== SAVE_VERSION || !state.regions) throw new Error('Ten kod zapisu pochodzi z niezgodnej wersji gry.');
  return state;
}
