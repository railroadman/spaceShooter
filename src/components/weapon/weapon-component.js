import Phaser from '../../lib/phaser.js';
import { InputComponent } from '../input/input-component.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';

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
 * @property {{x: number, y: number}[]} [muzzles] bullet origins as offsets from the ship, one volley per muzzle (default: ship center, `yOffset`)
 */

const STRAIGHT = [0];

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
      quantity: this.#bulletConfig.maxCount,
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
      this.#eventBusComponent.emit(CUSTOM_EVENTS.SHIP_SHOOT);
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
    const aimAngle = this.#getAimAngle();
    let fired = false;

    for (let m = 0; m < muzzleCount; m += 1) {
      const offsetX = muzzles ? muzzles[m].x : 0;
      const offsetY = muzzles ? muzzles[m].y : this.#bulletConfig.yOffset;
      for (let i = 0; i < angles.length; i += 1) {
        const bullet = this.#bulletGroup.getFirstDead();
        if (bullet === undefined || bullet === null) {
          return fired;
        }
        this.#shoot(bullet, angles[i] + aimAngle, offsetX, offsetY);
        fired = true;
      }
    }
    return fired;
  }

  /**
   * Angle in degrees from "straight" to the aim target, or 0 when there is no usable target.
   * Targets behind the shooter are ignored and the angle is limited, so shots stay dodgeable.
   * @returns {number}
   */
  #getAimAngle() {
    const target = this.#bulletConfig.aimTarget;
    if (!target || !target.active) {
      return 0;
    }

    const forward = -Math.sign(this.#bulletConfig.speed);
    const dx = target.x - this.#gameObject.x;
    const dy = (target.y - this.#gameObject.y) * forward;
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
   * @returns {void}
   */
  #shoot(bullet, angleDeg, offsetX, offsetY) {
    const radians = Phaser.Math.DegToRad(angleDeg);
    const speed = this.#bulletConfig.speed;

    bullet.enableBody(true, this.#gameObject.x + offsetX, this.#gameObject.y + offsetY, true, true);
    bullet.body.setVelocity(Math.sin(radians) * Math.abs(speed), -speed * Math.cos(radians));
    bullet.setState(this.#bulletConfig.lifespan);
    bullet.play('bullet');
    bullet.setScale(0.8);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    bullet.body.setSize(14, 18);
    bullet.setFlipY(this.#bulletConfig.flipY);
    bullet.setRotation(this.#bulletConfig.flipY ? -radians : radians);
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
