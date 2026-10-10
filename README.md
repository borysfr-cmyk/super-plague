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
| `js/save.js` | Save system: local save today, a cloud provider hook, and copy-paste save codes |
| `js/main.js` | UI, game loop, input |
| `tools/balance.mjs` | Plays hundreds of games with simple bots to check balance: `node tools/balance.mjs 200 normal` |

## Saving

The game autosaves to the browser every 10 in-game days and whenever it is paused. "Get Save Code" in the pause menu produces a code that loads the game on any other device. Cloud save plugs in through `CloudSaveProvider` in `js/save.js`.
