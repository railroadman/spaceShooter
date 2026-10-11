import Phaser from '../../lib/phaser.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';
import { BossEnemy } from '../../objects/enemies/boss-enemy.js';
import * as CONFIG from '../../config.js';

/**
 * Decides when the boss shows up: after a random moment of game time between
 * `BOSS.spawn.timeMin` and `BOSS.spawn.timeMax` it announces the boss (`BOSS_WARNING`, the
 * enemy spawners stop), and when the warning is over it creates the boss (`BOSS_SPAWN`).
 * Time is summed from the scene update, so pausing the scene pauses the timer.
 */
export class BossSpawnerComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {import('../../objects/player.js').Player} */
  #player;
  /** @type {'waiting' | 'warning' | 'active' | 'done'} */
  #state = 'waiting';
  /** @type {number} ms left until the warning (waiting) or until the boss arrives (warning) */
  #timer;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   * @param {import('../../objects/player.js').Player} player
   */
  constructor(scene, eventBusComponent, player) {
    this.#scene = scene;
    this.#eventBusComponent = eventBusComponent;
    this.#player = player;

    const spawn = CONFIG.BOSS.spawn;
    this.#timer =
      CONFIG.BOSS.debug.spawnAt !== null
        ? CONFIG.BOSS.debug.spawnAt
        : Phaser.Math.RND.between(spawn.timeMin, spawn.timeMax);

    this.#scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.#scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#removeListeners, this);
    this.#scene.events.once(Phaser.Scenes.Events.DESTROY, this.#removeListeners, this);
    this.#eventBusComponent.on(CUSTOM_EVENTS.GAME_OVER, () => {
      this.#state = 'done';
    });
    this.#eventBusComponent.on(CUSTOM_EVENTS.BOSS_DEFEATED, () => {
      this.#state = 'done';
    });
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    if (this.#state === 'waiting') {
      this.#timer -= dt;
      if (this.#timer <= 0) {
        this.#state = 'warning';
        this.#timer = CONFIG.BOSS.spawn.warningDuration;
        this.#eventBusComponent.emit(CUSTOM_EVENTS.BOSS_WARNING);
      }
    } else if (this.#state === 'warning') {
      this.#timer -= dt;
      if (this.#timer <= 0) {
        this.#state = 'active';
        this.#spawnBoss();
      }
    }
  }

  /**
   * @returns {void}
   */
  #spawnBoss() {
    const boss = new BossEnemy(this.#scene, this.#scene.scale.width / 2, CONFIG.BOSS.sprite.spawnY);
    boss.init(this.#eventBusComponent, this.#player);
    this.#eventBusComponent.emit(CUSTOM_EVENTS.BOSS_SPAWN, boss);
  }

  /**
   * @returns {void}
   */
  #removeListeners() {
    this.#scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
  }
}
