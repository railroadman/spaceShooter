import Phaser from '../../lib/phaser.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';
import * as CONFIG from '../../config.js';

/**
 * Creates a Phaser 3 Group that is used for spawning enemy
 * game objects in our game. This spawner component will generate
 * new enemies on an interval, and spawn those enemies in random
 * locations outside our Phaser 3 Scene.
 *
 * The Phaser 3 Group is used to create a simple object pool that allows
 * us to reuse the enemy game objects that are created.
 */
export class EnemySpawnerComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {number} */
  #spawnInterval;
  /** @type {number} */
  #spawnAt;
  /** @type {Phaser.GameObjects.Group} */
  #group;
  /** @type {{type: string, count: number}[]} */
  #formations;
  /** @type {boolean} */
  #disableSpawning;
  /** @type {import('../../objects/player.js').Player} */
  #player;

  /**
   * @param {Phaser.Scene} scene
   * @param {Function} enemyClass
   * @param {object} spawnConfig
   * @param {number} spawnConfig.interval
   * @param {number} spawnConfig.spawnAt
   * @param {{type: string, count: number}[]} spawnConfig.formations formations to pick from on every spawn
   * @param {EventBusComponent} eventBusComponent
   * @param {import('../../objects/player.js').Player} player
   */
  constructor(scene, enemyClass, spawnConfig, eventBusComponent, player) {
    this.#scene = scene;
    this.#player = player;

    // create group
    this.#group = this.#scene.add.group({
      name: `${this.constructor.name}-${Phaser.Math.RND.uuid()}`,
      classType: enemyClass,
      runChildUpdate: true,
      createCallback: (/** @type {import('../../types/typedef.js').Enemy} */ enemy) => {
        enemy.init(eventBusComponent, this.#player);
      },
    });

    this.#spawnInterval = spawnConfig.interval;
    this.#spawnAt = spawnConfig.spawnAt;
    this.#formations = spawnConfig.formations;
    this.#disableSpawning = false;

    // handle automatic call to update
    this.#scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.#scene.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.worldStep, this);
    this.#scene.events.once(
      Phaser.Scenes.Events.DESTROY,
      () => {
        this.#scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.#scene.physics.world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.worldStep, this);
      },
      this
    );
    eventBusComponent.on(CUSTOM_EVENTS.GAME_OVER, () => {
      this.#disableSpawning = true;
    });
  }

  /** @type {Phaser.GameObjects.Group} */
  get phaserGroup() {
    return this.#group;
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    if (this.#disableSpawning) {
      return;
    }

    this.#spawnAt -= dt;
    if (this.#spawnAt > 0) {
      return;
    }

    this.#spawnFormation(Phaser.Math.RND.pick(this.#formations));
    this.#spawnAt = this.#spawnInterval;
  }

  /**
   * Spawns a group of enemies above the screen: a single ship, a horizontal 'line',
   * or a 'v' whose middle ship leads and the others follow with a delay (enemies cannot
   * wait above the screen, their movement keeps them at y >= 0). Ships stay inside the margins.
   * @param {{type: string, count: number}} formation
   * @returns {void}
   */
  #spawnFormation(formation) {
    const margin = CONFIG.SPAWN_MARGIN_X;
    const width = this.#scene.scale.width;
    const half = (formation.count - 1) / 2;
    const span = half * CONFIG.FORMATION_SPACING_X;
    const centerX = Phaser.Math.RND.between(margin + span, width - margin - span);

    for (let i = 0; i < formation.count; i += 1) {
      const offset = i - half;
      const x = centerX + offset * CONFIG.FORMATION_SPACING_X;
      const delay = formation.type === 'v' ? Math.abs(offset) * CONFIG.FORMATION_STAGGER_DELAY : 0;
      if (delay === 0) {
        this.#spawnOne(x);
      } else {
        this.#scene.time.delayedCall(delay, () => this.#spawnOne(x));
      }
    }
  }

  /**
   * @param {number} x
   * @returns {void}
   */
  #spawnOne(x) {
    if (this.#disableSpawning) {
      return;
    }
    const enemy = this.#group.get(x, CONFIG.SPAWN_OFFSET_Y);
    enemy.reset();
  }

  /**
   * @returns {void}
   */
  worldStep(delta) {
    /** @type {import('../../types/typedef.js').Enemy[]} */
    (this.#group.getChildren()).forEach((enemy) => {
      if (!enemy.active) {
        return;
      }

      if (enemy.y > this.#scene.scale.height + CONFIG.DESPAWN_MARGIN_Y) {
        enemy.setActive(false);
        enemy.setVisible(false);
      }
    });
  }
}
