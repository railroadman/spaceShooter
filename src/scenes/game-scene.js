import { EnemySpawnerComponent } from '../components/spawners/enemy-spawner-component.js';
import Phaser from '../lib/phaser.js';
import { FighterEnemy } from '../objects/enemies/fighter-enemy.js';
import { ScoutEnemy } from '../objects/enemies/scout-enemy.js';
import { Player } from '../objects/player.js';
import * as CONFIG from '../config.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../components/events/event-bus-component.js';
import { EnemyDestroyedComponent } from '../components/spawners/enemy-destroyed-component.js';
import { Score } from '../objects/ui/score.js';
import { Lives } from '../objects/ui/lives.js';
import { AudioManager } from '../objects/audio-manager.js';
import { getSafeArea } from '../utils/viewport.js';
import { SpaceBackground } from '../objects/background/space-background.js';
import { BossSpawnerComponent } from '../components/spawners/boss-spawner-component.js';
import { BossHealthBar } from '../objects/ui/boss-health-bar.js';
import { GameTimer } from '../objects/ui/game-timer.js';

/**
 * Core Phaser 3 Scene that has the actual game play of our Space Shooter Game.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * Creates all of the required game objects for our scene and sets up the required
   * collision checks using the built in Phaser 3 Arcade Physics.
   * @returns {void}
   */
  create() {
    // common components
    const eventBusComponent = new EventBusComponent();

    // space background (parallax layers, drifting planets, streaks)
    this.background = new SpaceBackground(this, eventBusComponent);

    this.updateWorldBounds();
    this.scale.on('resize', this.updateWorldBounds, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.updateWorldBounds, this);
      this.scale.off('resize', this.repositionUI, this);
    });

    // spawn player
    const player = new Player(this, eventBusComponent);

    // spawn enemies
    const scoutSpawner = new EnemySpawnerComponent(
      this,
      ScoutEnemy,
      {
        interval: CONFIG.ENEMY_SCOUT_GROUP_SPAWN_INTERVAL,
        spawnAt: CONFIG.ENEMY_SCOUT_GROUP_SPAWN_START,
        formations: CONFIG.ENEMY_SCOUT_FORMATIONS,
      },
      eventBusComponent,
      player
    );
    const fighterSpawner = new EnemySpawnerComponent(
      this,
      FighterEnemy,
      {
        interval: CONFIG.ENEMY_FIGHTER_GROUP_SPAWN_INTERVAL,
        spawnAt: CONFIG.ENEMY_FIGHTER_GROUP_SPAWN_START,
        formations: CONFIG.ENEMY_FIGHTER_FORMATIONS,
      },
      eventBusComponent,
      player
    );
    new EnemyDestroyedComponent(this, eventBusComponent);
    new BossSpawnerComponent(this, eventBusComponent, player);

    // collisions for player and enemy groups
    this.physics.add.overlap(
      player,
      scoutSpawner.phaserGroup,
      (/** @type {Player}*/ playerGameObject, /** @type {ScoutEnemy}*/ enemyGameObject) => {
        if (!enemyGameObject.active || !playerGameObject.active) {
          return;
        }
        playerGameObject.colliderComponent.collideWithEnemyShip();
        enemyGameObject.colliderComponent.collideWithEnemyShip();
      }
    );
    this.physics.add.overlap(
      player,
      fighterSpawner.phaserGroup,
      (/** @type {Player}*/ playerGameObject, /** @type {FighterEnemy}*/ enemyGameObject) => {
        if (!enemyGameObject.active || !playerGameObject.active) {
          return;
        }
        playerGameObject.colliderComponent.collideWithEnemyShip();
        enemyGameObject.colliderComponent.collideWithEnemyShip();
      }
    );
    eventBusComponent.on(CUSTOM_EVENTS.ENEMY_INIT, (gameObject) => {
      // if name is an enemy from pool, add collision check for weapon group if needed
      if (!gameObject.weaponGameObjectGroup) {
        return;
      }

      this.physics.add.overlap(
        player,
        gameObject.weaponGameObjectGroup,
        (
          /** @type {Player}*/ playerGameObject,
          /** @type {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody}*/ projectileGameObject
        ) => {
          if (!playerGameObject.active || !projectileGameObject.active) {
            return;
          }

          if (gameObject.weaponComponent) {
            gameObject.weaponComponent.destroyBullet(projectileGameObject);
          }
          playerGameObject.colliderComponent.collideWithEnemyProjectile();
        }
      );
    });

    // collisions for player weapons and enemy groups
    this.physics.add.overlap(
      player.weaponGameObjectGroup,
      scoutSpawner.phaserGroup,
      (
        /** @type {ScoutEnemy}*/ enemyGameObject,
        /** @type {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody}*/ projectileGameObject
      ) => {
        if (!enemyGameObject.active) {
          return;
        }
        player.weaponComponent.destroyBullet(projectileGameObject);
        enemyGameObject.colliderComponent.collideWithEnemyProjectile();
      }
    );
    this.physics.add.overlap(
      player.weaponGameObjectGroup,
      fighterSpawner.phaserGroup,
      (
        /** @type {FighterEnemy}*/ enemyGameObject,
        /** @type {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody}*/ projectileGameObject
      ) => {
        if (!enemyGameObject.active) {
          return;
        }
        player.weaponComponent.destroyBullet(projectileGameObject);
        enemyGameObject.colliderComponent.collideWithEnemyProjectile();
      }
    );

    // the level ends when the boss is defeated
    eventBusComponent.on(CUSTOM_EVENTS.BOSS_DEFEATED, () => {
      this.time.delayedCall(CONFIG.BOSS.victory.delay, () => {
        if (this.scene.isActive('GameOverScene') || !this.scene.isActive('GameScene')) {
          return;
        }
        this.scene.pause('GameScene');
        this.scene.launch('LevelEndScene');
      });
    });

    // collisions for the boss: it is created later, when its spawner announces it
    eventBusComponent.on(CUSTOM_EVENTS.BOSS_SPAWN, (/** @type {import('../objects/enemies/boss-enemy.js').BossEnemy}*/ boss) => {
      this.physics.add.overlap(
        boss,
        player.weaponGameObjectGroup,
        (
          /** @type {import('../objects/enemies/boss-enemy.js').BossEnemy}*/ bossGameObject,
          /** @type {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody}*/ projectileGameObject
        ) => {
          if (!bossGameObject.active || !projectileGameObject.active) {
            return;
          }
          player.weaponComponent.destroyBullet(projectileGameObject);
          bossGameObject.colliderComponent.collideWithEnemyProjectile();
        }
      );
      // ramming the boss only hurts the player
      this.physics.add.overlap(player, boss, (/** @type {Player}*/ playerGameObject, bossGameObject) => {
        if (!bossGameObject.active || !playerGameObject.active) {
          return;
        }
        playerGameObject.colliderComponent.collideWithEnemyShip();
      });
      boss.weaponComponents.forEach((weaponComponent) => {
        this.physics.add.overlap(
          player,
          weaponComponent.bulletGroup,
          (
            /** @type {Player}*/ playerGameObject,
            /** @type {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody}*/ projectileGameObject
          ) => {
            if (!playerGameObject.active || !projectileGameObject.active) {
              return;
            }
            weaponComponent.destroyBullet(projectileGameObject);
            playerGameObject.colliderComponent.collideWithEnemyProjectile();
          }
        );
      });
    });

    // ui
    this.score = new Score(this, eventBusComponent);
    this.bossHealthBar = new BossHealthBar(this, eventBusComponent);
    this.timer = new GameTimer(this);
    this.lives = new Lives(this, eventBusComponent);
    this.repositionUI();
    this.scale.on('resize', this.repositionUI, this);

    // audio
    new AudioManager(this, eventBusComponent);

    // pause functionality
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.pause('GameScene');
      this.scene.launch('PauseScene');
    });
  }

  repositionUI() {
    if (!this.score || !this.lives || !this.timer) {
      return;
    }
    const safe = getSafeArea(this.scale);
    this.score.setPosition(safe.right, safe.top + 10);
    this.timer.setPosition(this.scale.width / 2, safe.top + 10);
    this.lives.setPosition(safe.left, safe.bottom - 5);
  }

  /**
   * Keeps arcade physics world bounds equal to the current game size.
   * @returns {void}
   */
  updateWorldBounds() {
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
  }
}
