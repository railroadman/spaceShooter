This document provides a detailed overview of the project's architecture, structure, and core components.

## High-Level Architecture

The game is built using the [Phaser 3](https://phaser.io/) framework and follows a modern JavaScript (ES6) component-based architecture. This design pattern promotes separation of concerns, making the code more modular, reusable, and easier to maintain.

The core architectural concepts are:

- **Scenes:** The game is divided into distinct scenes (`BootScene`, `PreloadScene`, `GameScene`, `PauseScene`, `GameOverScene`), each managing a specific part of the game loop (e.g., loading, gameplay, menus).
- **Game Objects:** These are the primary entities in the game, such as the `Player` and different `Enemy` types. They are composed of various components that define their behavior.
- **Components:** These are reusable modules that encapsulate specific functionalities like `Movement`, `Health`, `Weapon`, or `Input`. Game objects use these components to build their complete behavior.

## Folder Structure

The project is organized into the following main directories:

- **`/assets`**: Contains all game assets, including images, audio, and data files (like animation definitions).
- **`/src`**: The main source code directory.
  - **`/components`**: Houses all reusable components. Each sub-directory corresponds to a specific type of functionality (e.g., `collider`, `input`, `weapon`).
  - **`/lib`**: Contains the Phaser 3 framework library.
  - **`/objects`**: Defines the main game objects. It has sub-directories for `enemies`, `ui` elements and the `background`.
  - **`/scenes`**: Contains all game scenes.
  - **`/types`**: Holds type definitions for better code assistance and clarity.
  - **`/utils`**: Small helpers without game state (e.g. `viewport.js` computes the world height for the window shape).
  - **`config.js`**: A central configuration file for game constants like speed, health, and spawn rates.
  - **`main.js`**: The main entry point of the game, where the Phaser Game instance is created.

## Core Classes and Components

Below is a breakdown of the most important classes and their roles.

### Scenes

- **`BootScene.js`**: The very first scene to run. Its sole purpose is to load the assets required for the `PreloadScene`.
- **`PreloadScene.js`**: Loads all game assets (images, sounds, spritesheets) and creates all necessary animations. Once complete, it launches the `GameScene`.
- **`GameScene.js`**: The main scene where the actual gameplay occurs. It is responsible for:
  - Spawning the player and enemies.
  - Setting up physics and collision detection.
  - Managing the UI (score, lives).
  - Handling player input for pausing the game.
- **`PauseScene.js`**: A simple overlay scene that is launched when the game is paused. It displays a "Paused" message and waits for the player to resume.
- **`GameOverScene.js`**: Displayed when the player runs out of lives. It shows the final score and prompts for a restart.

### Game Objects

- **`Player.js`**: Represents the player's spaceship. It is composed of:
  - `KeyboardInputComponent`: Handles keyboard input for movement and firing.
  - `PlayerHorizontalMovementComponent` & `PlayerVerticalMovementComponent`: Manages the ship's movement.
  - `WeaponComponent`: Controls the firing mechanism and manages projectiles.
  - `HealthComponent`: Tracks the player's health and lives.
- **`ScoutEnemy.js` & `FighterEnemy.js`**: Represent the two types of enemy ships. They are composed of similar components to the player, but with different configurations and AI-driven input components (`BotScoutInputComponent`, `BotFighterInputComponent`).

### Components

- **`InputComponent.js` (and its subclasses)**: Defines how a game object is controlled. `KeyboardInputComponent` reads from the keyboard, while bot components implement simple AI patterns.
- **`MovementComponent.js` (and its subclasses)**: Manages the velocity and position of game objects.
- **`WeaponComponent.js`**: A generic component for managing weapon systems, including firing rates, projectile pools, and bullet destruction.
- **`HealthComponent.js`**: Manages the health of a game object, handling damage and death events.
- **`EventBusComponent.js`**: A simple event bus used for communication between different components and game objects, decoupling them from each other.

### Viewport

World width is fixed (`GAME_WIDTH`), height follows the window shape and is clamped to `GAME_MIN_HEIGHT`..`GAME_MAX_HEIGHT`, so wide screens give no advantage. `utils/viewport.js` computes the height and the HUD safe area; `main.js` calls `scale.setGameSize` on window resize. Scenes listen to the Scale `resize` event and remove the listener on shutdown.

### Background

All textures are generated procedurally by `objects/background/space-textures.js` (no image files).

- **`ParallaxLayer`**: one seamless scrolling `TileSprite`; speed from `BACKGROUND_LAYERS`, movement scaled by `delta`.
- **`SpaceBackground`**: assembles the star layers and fast streaks, handles `update(delta)` and `resize(w, h)`. Speeds up while the player thrusts (`PLAYER_THRUST` event).
- **`SpacePropSpawner`** (`components/spawners/`): pooled planets and nebulae that drift and fade in/out.

### UI

`objects/ui/ui-style.js` is the single source of HUD text styles (Orbitron font, colors and sizes come from `UI_*` in `config.js`). `Score` shows zero-padded points with a pop effect and pooled floating "+N" text. `PauseScene` and `GameOverScene` use the same styles and re-center on resize.

### Enemy Behavior

`components/movement/movement-patterns.js` holds trajectory strategies (wave, zigzag, chase, dash decorator). Bot input components pick a pattern per enemy type and drive left/right flags from it. `WeaponComponent` supports angled shots, bursts and aimed shots via options. `EnemySpawnerComponent` can spawn formations (line, V). All parameters live in `config.js`.

### Rendering

Renderer is `Phaser.AUTO` (WebGL with Canvas fallback), `antialias` on. Loaded sprites use NEAREST filtering to stay crisp; procedural background textures stay smooth. Engines and bullets use additive blending.

## Game Flow

1.  **`main.js`** initializes the Phaser game with the scene configuration.
2.  **`BootScene`** loads minimal assets for the preloader.
3.  **`PreloadScene`** loads all game assets and defines animations.
4.  **`GameScene`** starts, creating the player, enemy spawners, and UI.
5.  The player controls their ship, and enemies are spawned periodically by `EnemySpawnerComponent`.
6.  Collisions are detected by the Phaser Arcade Physics engine.
7.  `HealthComponent` and `Score` components listen to events (like `ENEMY_DESTROYED`) to update the game state.
8.  If the player presses `ESC`, the `GameScene` is paused, and the `PauseScene` is launched.
9.  If the player loses all lives, the `GameScene` is paused, and the `GameOverScene` is launched.

## Conventions

- **New game objects** should be placed in the `/src/objects/` directory. If it's an enemy, it goes into `/src/objects/enemies/`.
- **New components** should be created in the relevant sub-directory under `/src/components/`.
- **Game-wide constants** (like stats, speeds, or scoring values) should be added to `src/config.js` to allow for easy tweaking.
- **File names** use `kebab-case.js`.

```mermaid
classDiagram
    direction LR

    class GameScene {
        +player: Player
        +enemies: Group
    }

    class Player {
        +healthComponent: HealthComponent
        +weaponComponent: WeaponComponent
        +movementComponent: HorizontalMovementComponent
        +inputComponent: KeyboardInputComponent
    }

    class BaseEnemy {
        <<Abstract>>
        +healthComponent: HealthComponent
        +inputComponent: InputComponent
    }

    class FighterEnemy {
        +weaponComponent: WeaponComponent
        +movementComponent: VerticalMovementComponent
    }

    class ScoutEnemy {
        +horizMovement: HorizontalMovementComponent
        +vertMovement: VerticalMovementComponent
    }

    class InputComponent {
        <<Abstract>>
    }
    class KeyboardInputComponent
    class BotInputComponent

    class SpaceBackground
    class ParallaxLayer
    class SpacePropSpawner
    class Score
    class MovementPattern {
        <<Abstract>>
    }

    class WeaponComponent
    class HealthComponent
    class HorizontalMovementComponent
    class VerticalMovementComponent

    GameScene o-- Player
    GameScene o-- BaseEnemy
    GameScene o-- SpaceBackground
    GameScene o-- Score
    SpaceBackground o-- ParallaxLayer
    SpaceBackground o-- SpacePropSpawner
    InputComponent ..> MovementPattern : bots use

    Player o-- "1" HealthComponent
    Player o-- "1" WeaponComponent
    Player o-- "1" HorizontalMovementComponent
    Player o-- "1.0" KeyboardInputComponent

    BaseEnemy <|-- FighterEnemy
    BaseEnemy <|-- ScoutEnemy
    BaseEnemy o-- "1" HealthComponent
    BaseEnemy o-- "1" InputComponent

    InputComponent <|-- KeyboardInputComponent
    InputComponent <|-- BotInputComponent
```