import Phaser from '../../lib/phaser.js';

/**
 * Steers the bullets of one bullet group that have a `homing` setting (rockets). A bullet flies straight for
 * `homing.delay` ms, then turns toward the nearest enemy ahead of it (within `homing.range` px) by at most
 * `homing.turnRate` deg/s, while its speed climbs by `homing.acceleration` px/s^2 up to `homing.maxSpeed`.
 * When the target dies or leaves the screen the bullet picks the next one; with no target it flies on
 * straight. The sprite is turned to face the way it flies. Time comes from the scene update, so pausing stops it.
 */
export class HomingComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {Phaser.GameObjects.Group} */
  #bulletGroup;
  /** @type {() => Phaser.GameObjects.GameObject[]} */
  #getEnemies;

  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Group} bulletGroup the bullets to steer
   * @param {() => Phaser.GameObjects.GameObject[]} getEnemies every enemy that can be hit, alive or not
   */
  constructor(scene, bulletGroup, getEnemies) {
    this.#scene = scene;
    this.#bulletGroup = bulletGroup;
    this.#getEnemies = getEnemies;

    this.#scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.#scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#removeListeners, this);
    this.#scene.events.once(Phaser.Scenes.Events.DESTROY, this.#removeListeners, this);
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    this.#bulletGroup.getChildren().forEach((child) => {
      const bullet = /** @type {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody} */ (child);
      /** @type {{delay: number, turnRate: number, range: number, acceleration: number, maxSpeed: number} | undefined} */
      const homing = bullet.getData('homing');
      if (!bullet.active || !homing) {
        return;
      }

      const age = bullet.getData('age') + dt;
      bullet.setData('age', age);
      if (age < homing.delay) {
        return;
      }

      let target = bullet.getData('target');
      if (!this.#canBeHit(target)) {
        target = this.#findTarget(bullet, homing.range);
        bullet.setData('target', target);
      }

      const seconds = dt / 1000;
      let angle = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
      const speed = Math.min(homing.maxSpeed, bullet.body.velocity.length() + homing.acceleration * seconds);
      if (target) {
        const wanted = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
        const maxTurn = Phaser.Math.DegToRad(homing.turnRate) * seconds;
        angle += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(wanted - angle), -maxTurn, maxTurn);
      }
      bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      // the sprite points up at rotation 0
      bullet.setRotation(angle + Math.PI / 2);
    });
  }

  /**
   * @param {any} enemy
   * @returns {boolean} true for an enemy that is alive and on the screen
   */
  #canBeHit(enemy) {
    if (!enemy || !enemy.active || enemy.healthComponent.isDead) {
      return false;
    }
    const { width, height } = this.#scene.scale;
    return enemy.x >= 0 && enemy.x <= width && enemy.y >= 0 && enemy.y <= height;
  }

  /**
   * @param {Phaser.GameObjects.Sprite} bullet
   * @param {number} range
   * @returns {Phaser.GameObjects.GameObject | null} the closest enemy that can be hit and is not behind the bullet, or null
   */
  #findTarget(bullet, range) {
    /** @type {any} */
    let nearest = null;
    let nearestDistance = range;
    this.#getEnemies().forEach((candidate) => {
      const enemy = /** @type {any} */ (candidate);
      if (!this.#canBeHit(enemy) || enemy.y > bullet.y) {
        return;
      }
      const distance = Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.x, enemy.y);
      if (distance <= nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  /**
   * @returns {void}
   */
  #removeListeners() {
    this.#scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
  }
}
