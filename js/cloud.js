// Firebase cloud save: Google sign-in + one Firestore document per save slot at users/{uid}/saves/{slot}.
// The SDK is loaded lazily from Google's CDN, and only when firebase-config.js holds a config.
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

let fb = null;
let user = null;
let initPromise = null;
const listeners = new Set();

export function isConfigured() {
  return !!(firebaseConfig && firebaseConfig.apiKey);
}

export function initCloud() {
  if (!isConfigured()) return Promise.resolve();
  if (!initPromise) initPromise = load();
  return initPromise;
}

async function load() {
  try {
    const [app, auth, fs] = await Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-firestore.js'),
    ]);
    const a = app.initializeApp(firebaseConfig);
    fb = { auth, fs, authInst: auth.getAuth(a), db: fs.getFirestore(a) };
    await new Promise(resolve => {
      auth.onAuthStateChanged(fb.authInst, u => {
        user = u;
        listeners.forEach(f => f(u));
        resolve();
      });
    });
  } catch (e) {
    console.warn('Cloud save unavailable:', e);
    fb = null;
  }
}

export const isReady = () => !!fb;
export const currentUser = () => user;
export function onUserChange(f) { listeners.add(f); }

export async function signIn() {
  await initCloud();
  if (!fb) throw new Error('Cloud save could not load. Check your connection and try again.');
  const provider = new fb.auth.GoogleAuthProvider();
  try {
    await fb.auth.signInWithPopup(fb.authInst, provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await fb.auth.signInWithRedirect(fb.authInst, provider);
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      throw e;
    }
  }
}

export async function signOut() {
  if (fb) await fb.auth.signOut(fb.authInst);
}

function slotDoc(slot) {
  if (!fb || !user) throw new Error('Not signed in.');
  return fb.fs.doc(fb.db, 'users', user.uid, 'saves', slot);
}

export async function cloudSave(slot, record) {
  await fb.fs.setDoc(slotDoc(slot), { savedAt: record.savedAt, data: JSON.stringify(record.state) });
}

export async function cloudLoad(slot) {
  const snap = await fb.fs.getDoc(slotDoc(slot));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { savedAt: d.savedAt, state: JSON.parse(d.data) };
}

export async function cloudRemove(slot) {
  await fb.fs.deleteDoc(slotDoc(slot));
}
