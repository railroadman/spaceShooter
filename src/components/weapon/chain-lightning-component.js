import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';

/**
 * @typedef ChainTarget
 * @type {Phaser.GameObjects.Container & {
 *   colliderComponent: import('../../types/typedef.js').ColliderComponent,
 *   healthComponent: import('../../types/typedef.js').HealthComponent
 * }}
 */

/**
 * Makes lightning bolts jump: when a player bullet with a `chain` setting hits an enemy (`BULLET_HIT`),
 * the bolt goes on to the nearest enemy within `chain.radius`, then to the nearest one from there, until
 * `chain.targets` enemies (the first one included) were hit. Every enemy is hit once per chain, enemies that
 * are dying or outside of the screen are skipped. The damage goes through the target's collider, so health
 * and kill logic stay the same as for a normal bullet. The jumps are shown as short fading jagged arcs.
 */
export class ChainLightningComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {() => Phaser.GameObjects.GameObject[]} */
  #getEnemies;
  /** @type {Phaser.GameObjects.Graphics} */
  #graphics;
  /** @type {{from: {x: number, y: number}, to: {x: number, y: number}, life: number}[]} */
  #arcs = [];

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   * @param {() => Phaser.GameObjects.GameObject[]} getEnemies every enemy that can be hit, alive or not
   */
  constructor(scene, eventBusComponent, getEnemies) {
    this.#scene = scene;
    this.#eventBusComponent = eventBusComponent;
    this.#getEnemies = getEnemies;
    this.#graphics = scene.add.graphics().setDepth(CONFIG.CHAIN_LIGHTNING.depth).setBlendMode(Phaser.BlendModes.ADD);

    this.#eventBusComponent.on(CUSTOM_EVENTS.BULLET_HIT, this.#onBulletHit, this);
    this.#scene.events.on(Phaser.Scenes.Events.UPDATE, this.#update, this);
    this.#scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#removeListeners, this);
    this.#scene.events.once(Phaser.Scenes.Events.DESTROY, this.#removeListeners, this);
  }

  /**
   * @param {{x: number, y: number, enemy?: ChainTarget, chain?: {targets: number, radius?: number, damage?: number}}} hit
   * @returns {void}
   */
  #onBulletHit(hit) {
    if (!hit.chain || !hit.enemy) {
      return;
    }

    const radius = hit.chain.radius || CONFIG.CHAIN_LIGHTNING.radius;
    /** @type {Set<unknown>} */
    const visited = new Set([hit.enemy]);
    /** @type {{x: number, y: number}} */
    let current = hit.enemy;

    for (let jump = 1; jump < hit.chain.targets; jump += 1) {
      const next = this.#findNearest(current, visited, radius);
      if (!next) {
        return;
      }
      visited.add(next);
      next.colliderComponent.collideWithEnemyProjectile(hit.chain.damage || 1);
      this.#arcs.push({ from: { x: current.x, y: current.y }, to: { x: next.x, y: next.y }, life: CONFIG.CHAIN_LIGHTNING.arcDuration });
      this.#eventBusComponent.emit(CUSTOM_EVENTS.BULLET_HIT, { x: next.x, y: next.y, effect: 'lightning' });
      current = next;
    }
  }

  /**
   * @param {{x: number, y: number}} from
   * @param {Set<unknown>} visited
   * @param {number} radius
   * @returns {ChainTarget | null} the closest enemy that can still be hit, or null
   */
  #findNearest(from, visited, radius) {
    const { width, height } = this.#scene.scale;
    /** @type {ChainTarget | null} */
    let nearest = null;
    let nearestDistance = radius;

    this.#getEnemies().forEach((candidate) => {
      const enemy = /** @type {ChainTarget} */ (candidate);
      if (visited.has(enemy) || !enemy.active || enemy.healthComponent.isDead) {
        return;
      }
      if (enemy.x < 0 || enemy.x > width || enemy.y < 0 || enemy.y > height) {
        return;
      }
      const distance = Phaser.Math.Distance.Between(from.x, from.y, enemy.x, enemy.y);
      if (distance <= nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  /**
   * Redraws the arcs that are still alive; the jags change every frame, so the lightning flickers.
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  #update(ts, dt) {
    this.#graphics.clear();
    if (this.#arcs.length === 0) {
      return;
    }

    const { glow, core, arcDuration } = CONFIG.CHAIN_LIGHTNING;
    this.#arcs = this.#arcs.filter((arc) => {
      arc.life -= dt;
      if (arc.life <= 0) {
        return false;
      }
      const fade = arc.life / arcDuration;
      const points = this.#createJaggedLine(arc.from, arc.to);
      this.#graphics.lineStyle(glow.width, glow.color, glow.alpha * fade).strokePoints(points);
      this.#graphics.lineStyle(core.width, core.color, core.alpha * fade).strokePoints(points);
      return true;
    });
  }

  /**
   * @param {{x: number, y: number}} from
   * @param {{x: number, y: number}} to
   * @returns {Phaser.Math.Vector2[]} points of a line from `from` to `to` whose inner points stray sideways
   */
  #createJaggedLine(from, to) {
    const { jags, jagSize } = CONFIG.CHAIN_LIGHTNING;
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y) + Math.PI / 2;
    const points = [new Phaser.Math.Vector2(from.x, from.y)];
    for (let i = 1; i < jags; i += 1) {
      const t = i / jags;
      const stray = Phaser.Math.RND.realInRange(-jagSize, jagSize);
      points.push(
        new Phaser.Math.Vector2(
          Phaser.Math.Linear(from.x, to.x, t) + Math.cos(angle) * stray,
          Phaser.Math.Linear(from.y, to.y, t) + Math.sin(angle) * stray
        )
      );
    }
    points.push(new Phaser.Math.Vector2(to.x, to.y));
    return points;
  }

  /**
   * @returns {void}
   */
  #removeListeners() {
    this.#scene.events.off(Phaser.Scenes.Events.UPDATE, this.#update, this);
    this.#eventBusComponent.off(CUSTOM_EVENTS.BULLET_HIT, this.#onBulletHit, this);
  }
}
