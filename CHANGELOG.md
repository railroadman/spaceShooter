# Changelog

## [Unreleased]

### Added
- **Responsive Viewport:** fixed world width, height adapts to the window (min/max clamp); pause and game over scenes and HUD re-layout on resize.
- **Space Background:** procedural multi-layer parallax stars, drifting planets and nebulae, fast streaks and a thrust speed boost.
- **HUD:** Orbitron font, zero-padded score with pop effect and floating "+N" points.
- **Enemy Behavior:** wave, zigzag, chase and dash movement patterns; burst, aimed and fan shots; line and V formations.
- **Glow:** additive blending for engines and bullets.
- **Respawn Invulnerability:** the ship blinks and ignores damage for `PLAYER_INVULNERABLE_DURATION` (3 s) after every spawn.
- **Extra Life:** +1 life each time the score crosses a multiple of `PLAYER_EXTRA_LIFE_SCORE` (5000); new `EXTRA_LIFE` event.
- **Weapons and Pickups:** enemies drop health, shield and weapon boxes (fall, spin, pulse, blink before vanishing); drop chance by enemy class with a cooldown, the boss always drops.
- **Player Weapons:** main slot (plasma, shotgun, laser, chain lightning) and secondary slot (homing rockets with area explosion), 3 levels each; levels are remembered per type and lost on death; per-weapon hit effects and a HUD with both slots.
- **Shield:** absorbs `SHIELD.charges` (3) hits with a ripple effect.
- **Difficulty Stages:** by game time enemies get more health, spawn faster and use stronger weapons (acid, railgun, wider spreads).
- **Boss:** 300 health and a railgun attack.
- **Weapons Atlas:** `weapons` atlas built by `tools/build-weapon-atlas.py`.

### Changed
- Background planets are now 20 planet photos (`assets/images/planets/`, 256 px) instead of generated ones; they spawn at random, planets more often than nebulae (`BACKGROUND_PLANET_NAMES`, `weight` in `BACKGROUND_PROPS`).
- Renderer switched from `Phaser.CANVAS` to `Phaser.AUTO`; smooth filtering for background, crisp filtering for sprites.
- Hardcoded behavior values moved to `src/config.js`: player/enemy body size, depth, bullet offsets, respawn delay, death camera shake, audio volumes, lives icon size/spacing, zigzag interval spread, procedural background textures (stars, nebulae, planets, streak).
- Scout horizontal velocity 40 -> 80; background layers dimmed for better ship/bullet contrast.

### Fixed
- `ENEMTY_SCOUT_MOVEMENT_VERTICAL_VELOCITY` typo that left scout vertical speed undefined.

### Removed
- Unused `ENEMY_FIGHTER_PATROL_DURATION`; old `bg1`-`bg3` background images.

## [1.3.0] - 2025-11-27

### Added
- **WASD Controls:** Players can now use 'WASD' keys for movement, in addition to the arrow keys.

## [1.2.0] - 2025-10-04

### Added
- **Pause Scene:** Players can now pause the game by pressing the 'ESC' key. This opens a dedicated pause menu.

## [1.1.0] - 2025-08-29

### Added
- **Fighter Enemy AI:** Fighters now patrol horizontally using a time-based AI, making their movement more dynamic.
- **Player Controls:** The 'Spacebar' is now implemented as the fire key.
- Added a new sound asset.

### Fixed
- **Game Freeze:** Corrected a critical bug that caused the game to freeze upon enemy spawn. The issue was due to an incorrect class initialization order in the base `InputComponent`.
- **Player Movement:** The player ship now stops correctly when movement keys are released and uses direct velocity setting for more responsive control.

### Changed
- **Balancing:**
    - Increased player ship horizontal velocity.
    - Increased fighter enemy patrol range for wider movement.
    - Decreased enemy spawn rates for both Fighters and Scouts.

### Refactored
- **Movement Components:** Unified player and enemy horizontal movement into a single, configurable `HorizontalMovementComponent`, removing duplicated code.
- **Input Components:** Refactored all input components to ensure correct and consistent state initialization, fixing the root cause of the game freeze.