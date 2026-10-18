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
      if (this.#spawn()) {
        const jitter = Phaser.Math.RND.realInRange(0.7, 1.3);
        this.#spawnIn = CONFIG.BACKGROUND_PROP_SPAWN_INTERVAL * jitter;
      } else {
        this.#spawnIn = CONFIG.BACKGROUND_PROP_RETRY_DELAY;
      }
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
   * Takes a free prop from the pool; skips if all are in use or a planet has no free place.
   * @returns {boolean} true when a prop was spawned
   */
  #spawn() {
    const prop = this.#pool.find((item) => !item.active);
    if (!prop) {
      return false;
    }

    const rnd = Phaser.Math.RND;
    const choices = CONFIG.BACKGROUND_PROPS.filter((item) => item.key !== this.#lastKey);
    let roll = rnd.frac() * choices.reduce((sum, item) => sum + item.weight, 0);
    let kind = choices[choices.length - 1];
    for (let i = 0; i < choices.length; i += 1) {
      roll -= choices[i].weight;
      if (roll < 0) {
        kind = choices[i];
        break;
      }
    }

    const width = this.#scene.scale.width;
    let speed = rnd.realInRange(CONFIG.BACKGROUND_PROP_SPEED_MIN, CONFIG.BACKGROUND_PROP_SPEED_MAX);
    prop.setTexture(kind.key).setScale(rnd.realInRange(kind.scaleMin, kind.scaleMax)).setAngle(rnd.between(0, 359));
    let x = rnd.between(Math.round(width * -0.1), Math.round(width * 1.1));
    if (this.#isPlanet(prop)) {
      const place = this.#findPlanetPlace(prop, speed);
      if (!place) {
        return false;
      }
      ({ x, speed } = place);
    }

    this.#lastKey = kind.key;
    prop
      .setData('speed', speed)
      .setActive(true)
      .setVisible(true)
      .setAlpha(0)
      .setPosition(x, -prop.displayHeight / 2);
    return true;
  }

  /**
   * @param {Phaser.GameObjects.Image} prop
   * @returns {boolean}
   */
  #isPlanet(prop) {
    return prop.texture.key.startsWith('planet_');
  }

  /**
   * Finds a x (and a speed) where the new planet cannot touch another planet: either far enough sideways, or
   * entirely above one that is slower or as fast, so it never catches up.
   * @param {Phaser.GameObjects.Image} prop the new planet, texture and scale already set
   * @param {number} speed wished speed
   * @returns {{x: number, speed: number} | null}
   */
  #findPlanetPlace(prop, speed) {
    const rnd = Phaser.Math.RND;
    const width = this.#scene.scale.width;
    const gap = CONFIG.BACKGROUND_PLANET_GAP;
    const radius = prop.displayHeight / 2;
    const others = this.#pool.filter((item) => item.active && this.#isPlanet(item));
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const x = rnd.between(Math.round(width * -0.1), Math.round(width * 1.1));
      let limit = speed;
      const fits = others.every((other) => {
        const near = radius + other.displayHeight / 2 + gap;
        if (Math.abs(other.x - x) >= near) {
          return true;
        }
        // overlapping columns: the other one must already be clear below the spawn point
        if (other.y - other.displayHeight / 2 < radius + gap) {
          return false;
        }
        limit = Math.min(limit, other.getData('speed'));
        return true;
      });
      if (fits) {
        return { x, speed: limit };
      }
    }
    return null;
  }
}
