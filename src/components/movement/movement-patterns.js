import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';

/**
 * Result of a pattern step. One object is reused per enemy, so patterns never allocate while playing.
 * @typedef MovementOutput
 * @type {object}
 * @property {number} axisX horizontal direction/strength, -1 (left) .. 1 (right)
 * @property {number} speedScale multiplier of the base downward speed, 1 = normal
 */

/**
 * Base class of enemy trajectory strategies. A pattern only decides *where* to go
 * (axis + speed scale); the movement components turn that into physics velocity.
 * @abstract
 */
export class MovementPattern {
  /**
   * Called when the enemy is (re)spawned.
   * @returns {void}
   */
  reset() {}

  /**
   * @abstract
   * @param {number} dt frame time in ms
   * @param {Phaser.GameObjects.Container} enemy the enemy that is moved
   * @param {Phaser.GameObjects.Container} target usually the player
   * @param {MovementOutput} out filled by the pattern
   * @returns {void}
   */
  update(dt, enemy, target, out) {}
}

/**
 * Smooth sine-wave sweep left and right while flying down.
 */
export class WaveMovementPattern extends MovementPattern {
  /** @type {number} */
  #period;
  /** @type {number} */
  #elapsed = 0;

  /**
   * @param {number} period time of one full wave in ms
   */
  constructor(period) {
    super();
    this.#period = period;
  }

  reset() {
    this.#elapsed = Phaser.Math.RND.realInRange(0, this.#period);
  }

  update(dt, enemy, target, out) {
    this.#elapsed += dt;
    out.axisX = Math.sin((Math.PI * 2 * this.#elapsed) / this.#period);
    out.speedScale = 1;
  }
}

/**
 * Holds one horizontal direction, then flips it. Direction changes are eased,
 * and the enemy turns back before it reaches the screen edge.
 */
export class ZigzagMovementPattern extends MovementPattern {
  /** @type {number} */
  #interval;
  /** @type {number} */
  #smoothing;
  /** @type {number} */
  #direction = 1;
  /** @type {number} */
  #axis = 0;
  /** @type {number} */
  #timer = 0;

  /**
   * @param {number} interval average time between direction flips in ms
   * @param {number} smoothing how fast the axis follows the direction (1/s)
   */
  constructor(interval, smoothing) {
    super();
    this.#interval = interval;
    this.#smoothing = smoothing;
  }

  reset() {
    this.#direction = Phaser.Math.RND.sign();
    this.#axis = 0;
    this.#timer = this.#nextInterval();
  }

  update(dt, enemy, target, out) {
    this.#timer -= dt;
    if (this.#timer <= 0) {
      this.#direction = -this.#direction;
      this.#timer = this.#nextInterval();
    }

    const margin = CONFIG.SPAWN_MARGIN_X;
    if (enemy.x < margin) {
      this.#direction = 1;
    } else if (enemy.x > enemy.scene.scale.width - margin) {
      this.#direction = -1;
    }

    this.#axis += (this.#direction - this.#axis) * Math.min(1, (this.#smoothing * dt) / 1000);
    out.axisX = this.#axis;
    out.speedScale = 1;
  }

  /**
   * @returns {number}
   */
  #nextInterval() {
    return this.#interval * Phaser.Math.RND.realInRange(
      CONFIG.ENEMY_ZIGZAG_INTERVAL_MIN_SCALE,
      CONFIG.ENEMY_ZIGZAG_INTERVAL_MAX_SCALE
    );
  }
}

/**
 * Follows the target horizontally. Speed is proportional to the distance, so the enemy
 * eases in and does not jitter around the target. Stops when the target is gone.
 */
export class ChaseMovementPattern extends MovementPattern {
  /** @type {number} */
  #range;
  /** @type {number} */
  #smoothing;
  /** @type {number} */
  #axis = 0;

  /**
   * @param {number} range distance in px at which the chase reaches full speed
   * @param {number} smoothing how fast the axis follows the wanted value (1/s)
   */
  constructor(range, smoothing) {
    super();
    this.#range = range;
    this.#smoothing = smoothing;
  }

  reset() {
    this.#axis = 0;
  }

  update(dt, enemy, target, out) {
    const wanted = target && target.active ? Phaser.Math.Clamp((target.x - enemy.x) / this.#range, -1, 1) : 0;
    this.#axis += (wanted - this.#axis) * Math.min(1, (this.#smoothing * dt) / 1000);
    out.axisX = this.#axis;
    out.speedScale = 1;
  }
}

/**
 * Decorator: wraps another pattern and adds short bursts of speed.
 * Every dash is telegraphed by a brief slow-down (wind-up), so an experienced
 * player can read it and dodge.
 */
export class DashMovementPattern extends MovementPattern {
  /** @type {MovementPattern} */
  #base;
  /** @type {typeof CONFIG.ENEMY_FIGHTER_DASH} */
  #options;
  /** @type {'idle' | 'windup' | 'dash'} */
  #state = 'idle';
  /** @type {number} */
  #timer = 0;

  /**
   * @param {MovementPattern} base pattern that drives normal movement
   * @param {typeof CONFIG.ENEMY_FIGHTER_DASH} options see CONFIG.ENEMY_FIGHTER_DASH
   */
  constructor(base, options) {
    super();
    this.#base = base;
    this.#options = options;
  }

  reset() {
    this.#base.reset();
    this.#state = 'idle';
    this.#timer = this.#nextCooldown();
  }

  update(dt, enemy, target, out) {
    this.#base.update(dt, enemy, target, out);
    if (!target || !target.active) {
      return;
    }

    this.#timer -= dt;
    switch (this.#state) {
      case 'idle':
        if (this.#timer <= 0) {
          this.#state = 'windup';
          this.#timer = this.#options.windup;
        }
        break;
      case 'windup':
        out.axisX *= this.#options.windupAxisFactor;
        out.speedScale = this.#options.windupSpeedScale;
        if (this.#timer <= 0) {
          this.#state = 'dash';
          this.#timer = this.#options.duration;
        }
        break;
      case 'dash':
        out.axisX *= this.#options.axisBoost;
        out.speedScale = this.#options.speedBoost;
        if (this.#timer <= 0) {
          this.#state = 'idle';
          this.#timer = this.#nextCooldown();
        }
        break;
    }
  }

  /**
   * @returns {number}
   */
  #nextCooldown() {
    return Phaser.Math.RND.between(this.#options.cooldownMin, this.#options.cooldownMax);
  }
}
