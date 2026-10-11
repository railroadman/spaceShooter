import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';

/**
 * Spawns big slow background props (planets, nebulae) from a fixed pool.
 * Props drift down and fade in/out near the screen edges, so nothing pops.
 * Objects are created once; no allocation happens during play.
 */
export class SpacePropSpawnerComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {Phaser.GameObjects.Image[]} */
  #pool = [];
  /** @type {number} */
  #spawnIn = CONFIG.BACKGROUND_PROP_FIRST_SPAWN;
  /** @type {string} */
  #lastKey = '';

  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.#scene = scene;
    for (let i = 0; i < CONFIG.BACKGROUND_PROP_MAX_COUNT; i++) {
      const prop = scene.add
        .image(0, 0, CONFIG.BACKGROUND_PROPS[0].key)
        .setDepth(CONFIG.BACKGROUND_PROP_DEPTH)
        .setActive(false)
        .setVisible(false);
      this.#pool.push(prop);
    }
  }

  /**
   * @param {number} delta frame time in ms
   * @param {number} speedMultiplier 1 = normal speed
   * @returns {void}
   */
  update(delta, speedMultiplier) {
    this.#spawnIn -= delta;
    if (this.#spawnIn <= 0) {
      this.#spawn();
      const jitter = Phaser.Math.RND.realInRange(0.7, 1.3);
      this.#spawnIn = CONFIG.BACKGROUND_PROP_SPAWN_INTERVAL * jitter;
    }

    const height = this.#scene.scale.height;
    const fade = CONFIG.BACKGROUND_PROP_FADE_DISTANCE;
    this.#pool.forEach((prop) => {
      if (!prop.active) {
        return;
      }

      prop.y += (prop.getData('speed') * speedMultiplier * delta) / 1000;
      const half = prop.displayHeight / 2;
      if (prop.y - half > height) {
        prop.setActive(false).setVisible(false);
        return;
      }

      const fadeIn = Phaser.Math.Clamp((prop.y + half) / fade, 0, 1);
      const fadeOut = Phaser.Math.Clamp((height - (prop.y - half)) / fade, 0, 1);
      prop.setAlpha(CONFIG.BACKGROUND_PROP_ALPHA * Math.min(fadeIn, fadeOut));
    });
  }

  /**
   * Takes a free prop from the pool; skips if all are in use.
   * @returns {void}
   */
  #spawn() {
    const prop = this.#pool.find((item) => !item.active);
    if (!prop) {
      return;
    }

    const rnd = Phaser.Math.RND;
    const choices = CONFIG.BACKGROUND_PROPS.filter((item) => item.key !== this.#lastKey);
    const kind = rnd.pick(choices);
    this.#lastKey = kind.key;

    const width = this.#scene.scale.width;
    prop
      .setTexture(kind.key)
      .setScale(rnd.realInRange(kind.scaleMin, kind.scaleMax))
      .setAngle(rnd.between(0, 359))
      .setData('speed', rnd.realInRange(CONFIG.BACKGROUND_PROP_SPEED_MIN, CONFIG.BACKGROUND_PROP_SPEED_MAX))
      .setActive(true)
      .setVisible(true)
      .setAlpha(0);
    prop.setPosition(rnd.between(Math.round(width * -0.1), Math.round(width * 1.1)), -prop.displayHeight / 2);
  }
}
