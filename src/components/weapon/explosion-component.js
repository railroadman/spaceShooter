import Phaser from '../../lib/phaser.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';

/**
 * Makes rockets explode: when a player bullet with an `explosion` setting hits an enemy (`BULLET_HIT`),
 * every other enemy within `explosion.radius` px of the hit takes `explosion.damage` once. The damage goes
 * through the enemy's collider, so health and kill logic stay the same as for a normal bullet. The blast is
 * shown with the `explosion.effect` impact animation, scaled by `explosion.effectScale`.
 */
export class ExplosionComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {() => Phaser.GameObjects.GameObject[]} */
  #getEnemies;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   * @param {() => Phaser.GameObjects.GameObject[]} getEnemies every enemy that can be hit, alive or not
   */
  constructor(scene, eventBusComponent, getEnemies) {
    this.#scene = scene;
    this.#eventBusComponent = eventBusComponent;
    this.#getEnemies = getEnemies;

    this.#eventBusComponent.on(CUSTOM_EVENTS.BULLET_HIT, this.#onBulletHit, this);
    this.#scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#removeListeners, this);
    this.#scene.events.once(Phaser.Scenes.Events.DESTROY, this.#removeListeners, this);
  }

  /**
   * @param {{x: number, y: number, enemy?: unknown, explosion?: {radius: number, damage: number, effect?: string, effectScale?: number}}} hit
   * @returns {void}
   */
  #onBulletHit(hit) {
    const explosion = hit.explosion;
    if (!explosion) {
      return;
    }

    this.#getEnemies().forEach((candidate) => {
      const enemy = /** @type {any} */ (candidate);
      if (enemy === hit.enemy || !enemy.active || enemy.healthComponent.isDead) {
        return;
      }
      if (Phaser.Math.Distance.Between(hit.x, hit.y, enemy.x, enemy.y) <= explosion.radius) {
        enemy.colliderComponent.collideWithEnemyProjectile(explosion.damage);
      }
    });

    if (explosion.effect) {
      this.#eventBusComponent.emit(CUSTOM_EVENTS.BULLET_HIT, {
        x: hit.x,
        y: hit.y,
        effect: explosion.effect,
        scale: explosion.effectScale,
      });
    }
  }

  /**
   * @returns {void}
   */
  #removeListeners() {
    this.#eventBusComponent.off(CUSTOM_EVENTS.BULLET_HIT, this.#onBulletHit, this);
  }
}
