# CLAUDE.md

## Project

Arcade 2D space shooter on Phaser 3 (vanilla JS, ES6 modules). No build step, no `package.json`, no bundler, no test suite.

- Entry: `index.html` -> `src/main.js` (creates `Phaser.Game`, 450x640, arcade physics).
- Phaser lib: `assets/js/phaser.min.js` (script tag) and `src/lib/phaser.js` (module import).
- Scenes (`src/scenes/`): BootScene -> PreloadScene -> GameScene; PauseScene and GameOverScene overlay GameScene.

## Running

ES modules require HTTP, so `file://` does not work. Serve the repo root:

```
python -m http.server 8080
```

Open `http://localhost:8080`. Same URL as `.vscode/launch.json`.

## Structure

- `src/config.js` - all tunable constants (speeds, health, spawn rates, scoring). Add new constants here.
- `src/components/` - reusable components by feature: `collider`, `events`, `health`, `input`, `movement`, `spawners`, `weapon`.
- `src/objects/` - game objects (`player.js`, `enemies/`, `ui/`, `background/`, `audio-manager.js`).
- `src/utils/` - stateless helpers (`viewport.js`: world height from window shape).
- `src/types/` - type definitions (`typedef.js`, `phaser.d.ts`). `jsconfig.json` has `checkJs: true`.
- `docs/architecture.md` - detailed architecture and class diagram.

Game objects are composed from components. Components talk through `EventBusComponent`, not direct references.

## Conventions

- Files: `kebab-case.js`.
- Game objects go in `src/objects/`; enemies in `src/objects/enemies/`; components in `src/components/<feature>/`.
- Balance values go in `src/config.js`, not inline in logic.
- Match existing style: ES6 classes, JSDoc on classes and public methods, 2-space indent, single quotes, semicolons.
- Existing files use LF line endings. Keep the file's current line endings when editing.
- Keyboard is the only input (Arrows/WASD move, Space fires, ESC pauses).
