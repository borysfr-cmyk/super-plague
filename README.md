# Super Plague

A browser strategy game in the spirit of Plague Inc, reversed: a rogue AI is spreading through the world's networks, and you run the agency that has to stop it. Allocate funding to regional countermeasures and global safeguards, research the Containment Protocol, and keep public trust from collapsing.

- Runs in any modern browser, no install or build step.
- Designed for landscape screens, including phones.
- One playthrough takes about 30 minutes at normal speed. Pause any time.

## Play

Once GitHub Pages is enabled, the game is served at `https://<user>.github.io/super-plague/`.

To run it locally, serve the folder with any static server (ES modules don't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## How it works

| File | What it holds |
| --- | --- |
| `js/data.js` | Regions, network links, safeguards, AI abilities, difficulty settings |
| `js/sim.js` | The whole simulation as pure functions (no DOM), one call to `tick()` per in-game day |
| `js/save.js` | Save system: device save, cloud save, and copy-paste save codes |
| `js/cloud.js`, `js/firebase-config.js` | Firebase cloud save (Google sign-in + Firestore) |
| `js/main.js` | UI, game loop, input |
| `tools/balance.mjs` | Plays hundreds of games with simple bots to check balance: `node tools/balance.mjs 200 normal` |

## Saving

The game autosaves every 10 in-game days and whenever it is paused: always to the browser, and also to the cloud when the player is signed in. "Continue" picks the newest save. "Get Save Code" in the pause menu produces a code that loads the game on any other device without an account.

### Enabling cloud save (Firebase, free plan)

1. Create a project at https://console.firebase.google.com (Google Analytics is not needed).
2. **Build > Authentication > Get started**, then enable the **Google** sign-in provider.
3. **Authentication > Settings > Authorized domains**: add `<user>.github.io`.
4. **Build > Firestore Database > Create database** (production mode, any location), then replace the rules with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/saves/{slot} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
5. **Project settings > General > Your apps > Web (`</>`)**: register an app and copy the `firebaseConfig` object into `js/firebase-config.js`.

The config values are public by design; the rules above make sure each player can only read and write their own saves. With no config the game hides cloud save and works as before.
