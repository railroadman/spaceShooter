import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';

/**
 * Tracks the game time and tells which `CONFIG.DIFFICULTY` stage applies: enemies get more health, shoot
 * stronger weapons and more often, and spawn faster as the run goes on. Time only counts while the scene updates,
 * so a paused game does not advance it.
 */
export class DifficultyComponent {
  /** @type {number} ms of game time */
  #elapsed = CONFIG.DIFFICULTY.debug.startAt;

  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    const remove = () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, remove);
    scene.events.once(Phaser.Scenes.Events.DESTROY, remove);
  }

  /** @type {typeof CONFIG.DIFFICULTY.stages[number]} the stage that applies now */
  get stage() {
    const stages = CONFIG.DIFFICULTY.stages;
    let current = stages[0];
    stages.forEach((stage) => {
      if (stage.from <= this.#elapsed) {
        current = stage;
      }
    });
    return current;
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    this.#elapsed += dt;
  }

  /**
   * @param {number} baseHealth health of the enemy at the start of the game
   * @returns {number}
   */
  enemyHealth(baseHealth) {
    return baseHealth + this.stage.healthBonus;
  }

  /**
   * Bullet settings of an enemy for the current stage: the base settings with the stage preset on top
   * and the shot interval scaled.
   * @param {'scout' | 'fighter'} enemy
   * @param {import('../weapon/weapon-component.js').BulletConfig} base
   * @param {Phaser.GameObjects.Container} player target of aimed presets
   * @returns {import('../weapon/weapon-component.js').BulletConfig}
   */
  enemyWeapon(enemy, base, player) {
    const stage = this.stage;
    const { bullet, aim, ...preset } = CONFIG.ENEMY_WEAPONS[stage[enemy]];
    return {
      ...base,
      ...bullet,
      ...preset,
      ...(aim ? { aimTarget: player } : {}),
      interval: base.interval * stage.fireScale,
    };
  }
}
