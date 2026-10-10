// Save system. Every storage backend implements the same small interface:
//   name, isAvailable(), save(slot, state), load(slot), remove(slot)
// LocalSaveProvider works today. CloudSaveProvider is the hook for cloud save
// (e.g. Firebase) and stays disabled until it is configured.
import { SAVE_VERSION } from './sim.js';

const PREFIX = 'superplague.save.';
const CODE_PREFIX = 'SP1:';

export class LocalSaveProvider {
  name = 'This device';
  isAvailable() {
    try {
      localStorage.setItem(PREFIX + '_test', '1');
      localStorage.removeItem(PREFIX + '_test');
      return true;
    } catch { return false; }
  }
  async save(slot, state) {
    localStorage.setItem(PREFIX + slot, JSON.stringify({ savedAt: Date.now(), state }));
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
  name = 'Cloud';
  isAvailable() { return false; } // not configured yet
  async save() { throw new Error('Cloud save is not configured yet.'); }
  async load() { return null; }
  async remove() {}
}

export const local = new LocalSaveProvider();
export const cloud = new CloudSaveProvider();

export async function saveGame(state, slot = 'auto') {
  const results = {};
  for (const p of [local, cloud]) {
    if (!p.isAvailable()) continue;
    try { await p.save(slot, state); results[p.name] = true; } catch { results[p.name] = false; }
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
  for (const p of [local, cloud]) if (p.isAvailable()) await p.remove(slot);
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
  if (!clean.startsWith(CODE_PREFIX)) throw new Error('This is not a Super Plague save code.');
  const bin = atob(clean.slice(CODE_PREFIX.length));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const state = JSON.parse(new TextDecoder().decode(bytes));
  if (state.version !== SAVE_VERSION || !state.regions) throw new Error('This save code is from an incompatible version.');
  return state;
}
