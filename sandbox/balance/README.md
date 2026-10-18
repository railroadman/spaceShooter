# Balance sandbox

Runs the real game (`GameScene`) with a bot player, fast and without rendering, many times with different seeds
and config values, and shows the numbers. **It does not modify any game file**: the game is loaded from `src/` as is.

## Run

```
python -m http.server 8080
```

Open `http://localhost:8080/sandbox/balance/`.

## How it works

- `index.html` + `panel.js`: the panel (scenario, config overrides, sweep, results, targets, presets).
- `sim-orchestrator.js`: runs games in hidden iframes (`run.html`), several at a time.
- `run.html` + `boot.js` + `run.js`: one game. `boot.js` reads the run parameters (URL hash JSON), builds a patched copy of
  `src/config.js` (`config-patcher.js`) and plugs it in with an import map, so the game sees the overridden values.
  `run.js` drives time with a fixed 1/60 s step without rendering (about 100-200x real time), seeds `Phaser.Math.RND`
  (same seed + same config = same run) and collects metrics.
- `bot-driver.js` + `bot-profiles.js`: the bot presses keys by emitting keyboard events. Profiles: `idle` (stands and shoots),
  `novice`, `average`, `expert`.
- `metrics-collector.js`, `stats.js`, `targets.js`: per-run numbers, aggregates over seeds, pass/fail ranges.
- `presets/`: example presets (`index.json` lists them) and `targets.json`.

## Panel

- **Scenario:** bot profiles, number of seeds, first seed, game time limit, parallel runs.
- **Config overrides:** every number, boolean and string of `src/config.js` as a dotted path (`WEAPONS.types.plasma.base.interval`,
  `PLAYER_HEALTH`, `DIFFICULTY.stages.1.from`). A top-level constant replaces its declaration, so constants derived from it
  follow; a nested value is set after the config is evaluated (constants copied from it earlier keep the old value).
  Debug switches (`BOSS.debug.spawnAt`, `DIFFICULTY.debug.startAt`, `DROP.debug.forceAll`, `WEAPONS.debug.*`) are plain overrides.
- **Results:** win rate, run time, lives lost, score, boss reach and kill time, accuracy, pickups, health lost per source,
  deaths per difficulty stage, run list with a timeline chart and a "watch" link (the same run in real time with rendering).
- **Baseline:** "Set as baseline" stores the current numbers (in `localStorage`); later runs show the change against it.
- **Sweep:** one or two parameters over a range, one metric, shown as a table with a heat map.
- **Targets:** `presets/targets.json` ranges per profile and metric, checked after every run.
- **Presets / export:** save and load scenario + overrides as JSON, results as JSON or CSV, "Show diff for config.js" prints
  the changed values to copy into `src/config.js` by hand (a browser page cannot write files).

## Notes

- The bot is not a human. Use it for relative comparisons (before/after a change) and for the skill scale between profiles.
- Run parameters (`run.html#{...}`): `seed`, `profile`, `limit` (game ms), `overrides`, `h` (world height), `render`,
  `timeline`, `bot` (fields replacing the profile ones, for tuning the bot).
- `python -m http.server` lets browsers cache scripts: after editing `bot-*.js`, `run.js`, `metrics-collector.js` and similar, hard-reload the panel (Ctrl+Shift+R)
  or keep DevTools open with "Disable cache". `run.html`, `boot.js` and `config-patcher.js` are loaded fresh by every run.
