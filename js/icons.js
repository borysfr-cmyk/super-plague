// Icons for programs, regional actions and AI traits, shown in hexagonal "patches".
// Glyphs from Lucide (lucide.dev), ISC licence.
const GLYPHS = {
  monitoring: '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" /> <path d="M4 6h.01" /> <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" /> <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" /> <path d="M12 18h.01" /> <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" /> <circle cx="12" cy="12" r="2" /> <path d="m13.41 10.59 5.66-5.66" />',
  forensics: '<path d="M3 7V5a2 2 0 0 1 2-2h2" /> <path d="M17 3h2a2 2 0 0 1 2 2v2" /> <path d="M21 17v2a2 2 0 0 1-2 2h-2" /> <path d="M7 21H5a2 2 0 0 1-2-2v-2" /> <circle cx="12" cy="12" r="3" /> <path d="m16 16-1.9-1.9" />',
  corps: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />',
  zerotrust: '<circle cx="12" cy="16" r="1" /> <rect x="3" y="10" width="18" height="12" rx="2" /> <path d="M7 10V7a5 5 0 0 1 10 0v3" />',
  airgap: '<path d="m19 5 3-3" /> <path d="m2 22 3-3" /> <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" /> <path d="M7.5 13.5 10 11" /> <path d="M10.5 16.5 13 14" /> <path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z" />',
  killswitch: '<path d="M12 2v10" /> <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />',
  labs: '<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" /> <path d="M6.453 15h11.094" /> <path d="M8.5 2h7" />',
  interp: '<path d="M6 18h8" /> <path d="M3 22h18" /> <path d="M14 22a7 7 0 1 0 0-14h-1" /> <path d="M9 14h2" /> <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" /> <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />',
  governance: '<path d="M12 20v2" /> <path d="M12 2v2" /> <path d="M17 20v2" /> <path d="M17 2v2" /> <path d="M2 12h2" /> <path d="M2 17h2" /> <path d="M2 7h2" /> <path d="M20 12h2" /> <path d="M20 17h2" /> <path d="M20 7h2" /> <path d="M7 20v2" /> <path d="M7 2v2" /> <rect x="4" y="4" width="16" height="16" rx="2" /> <rect x="8" y="8" width="8" height="8" rx="1" />',
  superalign: '<path d="M12 18V5" /> <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" /> <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" /> <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" /> <path d="M18 18a4 4 0 0 0 2-7.464" /> <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" /> <path d="M6 18a4 4 0 0 1-2-7.464" /> <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />',
  briefings: '<path d="M15 18h-5" /> <path d="M18 14h-8" /> <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" /> <rect width="8" height="4" x="10" y="6" rx="1" />',
  treaty: '<path d="m11 17 2 2a1 1 0 1 0 3-3" /> <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /> <path d="m21 3 1 11h-2" /> <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /> <path d="M3 4h8" />',
  emergency: '<path d="M7 18v-6a5 5 0 1 1 10 0v6" /> <path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" /> <path d="M21 12h1" /> <path d="M18.5 4.5 18 5" /> <path d="M2 12h1" /> <path d="M12 2v1" /> <path d="m4.929 4.929.707.707" /> <path d="M12 12v6" />',
  campaign: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /> <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" /> <path d="M8 6v8" />',
  harden: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /> <path d="M9 12h6" /> <path d="M12 9v6" />',
  audit: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1" /> <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /> <path d="m9 14 2 2 4-4" />',
  isolate: '<path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" /> <path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" /> <line x1="8" x2="8" y1="2" y2="5" /> <line x1="2" x2="5" y1="8" y2="8" /> <line x1="16" x2="16" y1="19" y2="22" /> <line x1="19" x2="22" y1="16" y2="16" />',
  blackout: '<path d="M10.768 5.111 13.44 2.44a1.5 1.5 0 012.474 1.561l-1.633 4.625" /> <path d="m18.889 13.232.672-.672A1.5 1.5 0 0018.5 10h-2.844" /> <path d="m2 2 20 20" /> <path d="m7.94 7.94-3.5 3.499A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l5.5-5.5" />',
  replication: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /> <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />',
  polymorphic: '<path d="m10 16 1.5 1.5" /> <path d="m14 8-1.5-1.5" /> <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" /> <path d="m16.5 10.5 1 1" /> <path d="m17 6-2.891-2.891" /> <path d="M2 15c6.667-6 13.333 0 20-6" /> <path d="m20 9 .891.891" /> <path d="M3.109 14.109 4 15" /> <path d="m6.5 12.5 1 1" /> <path d="m7 18 2.891 2.891" /> <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />',
  social: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <path d="M16 3.128a4 4 0 0 1 0 7.744" /> <path d="M22 21v-2a4 4 0 0 0-3-3.87" /> <circle cx="9" cy="7" r="4" />',
  deepfakes: '<path d="M10 11h.01" /> <path d="M14 6h.01" /> <path d="M18 6h.01" /> <path d="M6.5 13.1h.01" /> <path d="M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3" /> <path d="M17.4 9.9c-.8.8-2 .8-2.8 0" /> <path d="M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7" /> <path d="M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4" />',
  zeroday: '<path d="M12 20v-9" /> <path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z" /> <path d="M14.12 3.88 16 2" /> <path d="M21 21a4 4 0 0 0-3.81-4" /> <path d="M21 5a4 4 0 0 1-3.55 3.97" /> <path d="M22 13h-4" /> <path d="M3 21a4 4 0 0 1 3.81-4" /> <path d="M3 5a4 4 0 0 0 3.55 3.97" /> <path d="M6 13H2" /> <path d="m8 2 1.88 1.88" /> <path d="M9 7.13V6a3 3 0 1 1 6 0v1.13" />',
  markets: '<path d="M16 17h6v-6" /> <path d="m22 17-8.5-8.5-5 5L2 7" />',
  backups: '<ellipse cx="12" cy="5" rx="9" ry="3" /> <path d="M3 5V19A9 3 0 0 0 21 19V5" /> <path d="M3 12A9 3 0 0 0 21 12" />',
  drones: '<path d="M10 10 7 7" /> <path d="m10 14-3 3" /> <path d="m14 10 3-3" /> <path d="m14 14 3 3" /> <path d="M14.205 4.139a4 4 0 1 1 5.439 5.863" /> <path d="M19.637 14a4 4 0 1 1-5.432 5.868" /> <path d="M4.367 10a4 4 0 1 1 5.438-5.862" /> <path d="M9.795 19.862a4 4 0 1 1-5.429-5.873" /> <rect x="10" y="8" width="4" height="8" rx="1" />',
  sabotage: '<path d="M10 2v2.343" /> <path d="M14 2v6.343" /> <path d="m2 2 20 20" /> <path d="M20 20a2 2 0 0 1-2 2H6a2 2 0 0 1-1.755-2.96l5.227-9.563" /> <path d="M6.453 15H15" /> <path d="M8.5 2h7" />',
  recursive: '<path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" />',
  influencers: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2" /> <path d="M12 18h.01" />',
  lockdown: '<path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" /> <path d="m2 22 3-3" /> <path d="M7.5 13.5 10 11" /> <path d="M10.5 16.5 13 14" /> <path d="m18 3-4 4h6l-4 4" />',
};

export const CAT_COLORS = { 'Wykrywanie': '#7fd6c2', 'Obrona': '#c8d65a', 'Badania': '#5be38d', 'Społeczeństwo': '#8aa8ff' };
export const ACTION_COLORS = { harden: '#c8d65a', audit: '#7fd6c2', isolate: '#e0a83a', blackout: '#ff4d4d', campaign: '#8aa8ff' };

export function patch(id, color) {
  if (!GLYPHS[id]) return '';
  return `<span class="patch" style="--ic:${color}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[id]}</svg></span>`;
}
