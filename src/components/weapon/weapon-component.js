import Phaser from '../../lib/phaser.js';
import { InputComponent } from '../input/input-component.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';
import * as CONFIG from '../../config.js';

/**
 * @typedef BulletConfig
 * @type {object}
 * @property {number} speed
 * @property {number} interval
 * @property {number} lifespan
 * @property {number} maxCount
 * @property {number} yOffset
 * @property {boolean} flipY
 * @property {number[]} [angles] spread: one bullet per angle (degrees from straight), default [0]
 * @property {{count: number, delay: number}} [burst] fire `count` volleys, `delay` ms apart
 * @property {Phaser.GameObjects.Container} [aimTarget] aim volleys at this object
 * @property {number} [maxAimAngle] limits aiming to this many degrees from straight (default 35)
 * @property {{x: number, y: number, scale?: number, damage?: number}[]} [muzzles] bullet origins as offsets from the ship, one volley per muzzle (default: ship center, `yOffset`); a muzzle may override the bullet `scale` and `damage`
 * @property {number} [poolSize] bullets created up front, default `maxCount`; the pool never grows, so it must fit the biggest config used with `setConfig`
 * @property {string} [textureKey] texture of the bullet, default the `bullet` spritesheet (animated with the `bullet` animation)
 * @property {string | number} [frame] frame of `textureKey`, for atlas textures
 * @property {string} [animKey] animation played by the bullet, default `bullet` for the default texture and none for others
 * @property {number} [scale] bullet scale, default `BULLET_DEFAULT_SCALE`
 * @property {{width: number, height: number}} [bodySize] bullet hitbox in px, default `BULLET_BODY_WIDTH` x `BULLET_BODY_HEIGHT`
 * @property {number} [damage] health a hit takes from the target, default 1
 * @property {boolean} [pierce] the bullet goes through targets instead of being destroyed, default false
 * @property {string} [hitEffect] weapon key of the impact effect (`<key>_hit_1..4` frames of the `weapons` atlas), default none
 * @property {{targets: number, radius?: number, damage?: number}} [chain] on a hit the bullet jumps on to the nearest enemies, `targets` enemies in total (see `ChainLightningComponent`)
 * @property {{delay: number, turnRate: number, range: number, acceleration: number, maxSpeed: number}} [homing] the bullet turns toward the nearest enemy (see `HomingComponent`)
 * @property {{radius: number, damage: number, effect?: string, effectScale?: number}} [explosion] on a hit the bullet damages the enemies around the hit (see `ExplosionComponent`)
 * @property {boolean} [silent] firing does not emit `SHIP_SHOOT` (no shot sound), default false
 */

const STRAIGHT = [0];
const DEFAULT_BODY_SIZE = { width: CONFIG.BULLET_BODY_WIDTH, height: CONFIG.BULLET_BODY_HEIGHT };

/**
 * The `WeaponComponent` is used for enabling a game object to fire bullets
 * in our game. When input is detected from the provided `InputComponent`, this
 * component will check if we are able to fire a new bullet and do so based on the
 * fire interval and the max number of bullets that can be on screen at a time for
 * the attached game object.
 *
 * The bullet game objects are managed via a Phaser 3 Group, that way we can create
 * a simple object pool.
 */
export class WeaponComponent {
  /** @type {Phaser.GameObjects.Container} */
  #gameObject;
  /** @type {InputComponent} */
  #inputComponent;
  /** @type {Phaser.GameObjects.Group} */
  #bulletGroup;
  /** @type {number} */
  #fireBulletInterval;
  /** @type {BulletConfig} */
  #bulletConfig;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {number} volleys of the current burst that are still to be fired */
  #burstLeft = 0;
  /** @type {number} */
  #burstTimer = 0;

  /**
   * @param {Phaser.GameObjects.Container} gameObject
   * @param {InputComponent} inputComponent
   * @param {BulletConfig} bulletConfig
   * @param {EventBusComponent} eventBusComponent
   */
  constructor(gameObject, inputComponent, bulletConfig, eventBusComponent) {
    this.#gameObject = gameObject;
    this.#inputComponent = inputComponent;
    this.#bulletConfig = bulletConfig;
    this.#eventBusComponent = eventBusComponent;
    this.#fireBulletInterval = 0;

    this.#bulletGroup = this.#gameObject.scene.physics.add.group({
      name: `bullets-${Phaser.Math.RND.uuid()}`,
      enable: false,
    });
    this.#bulletGroup.createMultiple({
      key: 'bullet',
      quantity: this.#bulletConfig.poolSize || this.#bulletConfig.maxCount,
      active: false,
      visible: false,
    });

    this.#gameObject.scene.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.worldStep, this);
    this.#gameObject.once(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        this.#gameObject.scene.physics.world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.worldStep, this);
      },
      this
    );
  }

  /** @type {Phaser.GameObjects.Group} */
  get bulletGroup() {
    return this.#bulletGroup;
  }

  /**
   * Swaps the bullet settings, e.g. when the player picks up another weapon. The bullet pool stays the same.
   * @param {BulletConfig} bulletConfig
   * @returns {void}
   */
  setConfig(bulletConfig) {
    this.#bulletConfig = bulletConfig;
    this.#burstLeft = 0;
  }

  /**
   * @param {number} dt
   * @returns {void}
   */
  update(dt) {
    if (this.#gameObject.y < 0) {
      return;
    }

    this.#updateBurst(dt);

    this.#fireBulletInterval -= dt;
    if (this.#fireBulletInterval > 0) {
      return;
    }

    if (this.#inputComponent.shootIsDown) {
      if (!this.#fireVolley()) {
        return;
      }

      this.#fireBulletInterval = this.#bulletConfig.interval;
      this.#burstLeft = this.#bulletConfig.burst ? this.#bulletConfig.burst.count - 1 : 0;
      this.#burstTimer = this.#bulletConfig.burst ? this.#bulletConfig.burst.delay : 0;
      if (!this.#bulletConfig.silent) {
        this.#eventBusComponent.emit(CUSTOM_EVENTS.SHIP_SHOOT);
      }
    }
  }

  /**
   * Fires the follow-up volleys of a burst.
   * @param {number} dt
   * @returns {void}
   */
  #updateBurst(dt) {
    if (this.#burstLeft <= 0) {
      return;
    }

    this.#burstTimer -= dt;
    if (this.#burstTimer > 0) {
      return;
    }

    this.#fireVolley();
    this.#burstLeft -= 1;
    this.#burstTimer = this.#bulletConfig.burst.delay;
  }

  /**
   * Fires one bullet per configured angle (a single straight bullet by default).
   * @returns {boolean} true when at least one bullet was fired
   */
  #fireVolley() {
    const angles = this.#bulletConfig.angles || STRAIGHT;
    const muzzles = this.#bulletConfig.muzzles;
    const muzzleCount = muzzles ? muzzles.length : 1;
    let fired = false;

    for (let m = 0; m < muzzleCount; m += 1) {
      const offsetX = muzzles ? muzzles[m].x : 0;
      const offsetY = muzzles ? muzzles[m].y : this.#bulletConfig.yOffset;
      const muzzle = muzzles ? muzzles[m] : undefined;
      const aimAngle = this.#getAimAngle(offsetX, offsetY);
      for (let i = 0; i < angles.length; i += 1) {
        const bullet = this.#bulletGroup.getFirstDead();
        if (bullet === undefined || bullet === null) {
          return fired;
        }
        this.#shoot(bullet, angles[i] + aimAngle, offsetX, offsetY, muzzle);
        fired = true;
      }
    }
    return fired;
  }

  /**
   * Angle in degrees from "straight" to the aim target as seen from the muzzle, or 0 when there is no
   * usable target. Targets behind the muzzle are ignored and the angle is limited, so shots stay dodgeable.
   * @param {number} offsetX muzzle x offset from the shooter
   * @param {number} offsetY muzzle y offset from the shooter
   * @returns {number}
   */
  #getAimAngle(offsetX, offsetY) {
    const target = this.#bulletConfig.aimTarget;
    if (!target || !target.active) {
      return 0;
    }

    const forward = -Math.sign(this.#bulletConfig.speed);
    const dx = target.x - (this.#gameObject.x + offsetX);
    const dy = (target.y - (this.#gameObject.y + offsetY)) * forward;
    if (dy <= 0) {
      return 0;
    }

    const max = this.#bulletConfig.maxAimAngle || 35;
    return Phaser.Math.Clamp(Phaser.Math.RadToDeg(Math.atan2(dx, dy)), -max, max);
  }

  /**
   * @param {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody} bullet
   * @param {number} angleDeg degrees from straight ahead, 0 = straight
   * @param {number} offsetX
   * @param {number} offsetY
   * @param {{scale?: number, damage?: number}} [muzzle] per-muzzle overrides of the bullet settings
   * @returns {void}
   */
  #shoot(bullet, angleDeg, offsetX, offsetY, muzzle) {
    const radians = Phaser.Math.DegToRad(angleDeg);
    const config = this.#bulletConfig;
    const speed = config.speed;
    const bodySize = config.bodySize || DEFAULT_BODY_SIZE;

    bullet.enableBody(true, this.#gameObject.x + offsetX, this.#gameObject.y + offsetY, true, true);
    bullet.body.setVelocity(Math.sin(radians) * Math.abs(speed), -speed * Math.cos(radians));
    bullet.setState(config.lifespan);
    bullet.anims.stop();
    bullet.setTexture(config.textureKey || 'bullet', config.frame);
    const animKey = config.animKey || (config.textureKey ? undefined : 'bullet');
    if (animKey) {
      bullet.play(animKey);
    }
    bullet.setScale((muzzle && muzzle.scale) || config.scale || CONFIG.BULLET_DEFAULT_SCALE);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    bullet.body.setSize(bodySize.width, bodySize.height);
    bullet.setFlipY(config.flipY);
    bullet.setRotation(config.flipY ? -radians : radians);
    bullet.setData({
      damage: (muzzle && muzzle.damage) || config.damage || 1,
      pierce: !!config.pierce,
      hitEffect: config.hitEffect,
      chain: config.chain,
      homing: config.homing,
      explosion: config.explosion,
      age: 0,
      target: null,
      // targets a piercing bullet has hit already, so it damages each of them once
      hits: config.pierce ? new Set() : undefined,
    });
  }

  /**
   * @param {number} delta
   * @returns {void}
   */
  worldStep(delta) {
    /** @type {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]} */
    (this.#bulletGroup.getChildren()).forEach((bullet) => {
      if (!bullet.active) {
        return;
      }

      /** @type {number} */
      (bullet.state) -= delta;
      if (/** @type {number} */ (bullet.state) <= 0) {
        bullet.disableBody(true, true);
      }
    });
  }

  /**
   * @param {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody} bullet
   */
  destroyBullet(bullet) {
    bullet.disableBody(true, true);
  }
}
