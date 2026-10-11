import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';
import { CUSTOM_EVENTS } from '../../components/events/event-bus-component.js';
import { SpacePropSpawnerComponent } from '../../components/spawners/space-prop-spawner.js';
import { ParallaxLayer } from './parallax-layer.js';
import { generateSpaceTextures } from './space-textures.js';

/**
 * The whole space backdrop: star layers with parallax, drifting planets/nebulae
 * and a few fast streaks. Drives itself from the scene UPDATE event, follows
 * scale resizes and removes its listeners when the scene shuts down.
 * Speed boost (player thrust) is received through the event bus.
 */
export class SpaceBackground {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {ParallaxLayer[]} */
  #layers;
  /** @type {SpacePropSpawnerComponent} */
  #props;
  /** @type {Phaser.GameObjects.Image[]} */
  #streaks = [];
  /** @type {number} */
  #speedMultiplier = 1;
  /** @type {number} */
  #targetMultiplier = 1;

  /**
   * @param {Phaser.Scene} scene
   * @param {import('../../components/events/event-bus-component.js').EventBusComponent} eventBusComponent
   */
  constructor(scene, eventBusComponent) {
    this.#scene = scene;
    generateSpaceTextures(scene);
    scene.cameras.main.setBackgroundColor(CONFIG.BACKGROUND_COLOR);

    this.#layers = CONFIG.BACKGROUND_LAYERS.map((layer) => new ParallaxLayer(scene, layer));
    this.#props = new SpacePropSpawnerComponent(scene);
    this.#createStreaks();

    if (CONFIG.BACKGROUND_BOOST_ENABLED) {
      eventBusComponent.on(CUSTOM_EVENTS.PLAYER_THRUST, this.#onThrust, this);
    }
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.scale.on('resize', this.resize, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      scene.scale.off('resize', this.resize, this);
      eventBusComponent.off(CUSTOM_EVENTS.PLAYER_THRUST, this.#onThrust, this);
    });
  }

  /**
   * @param {number} ts
   * @param {number} delta frame time in ms
   * @returns {void}
   */
  update(ts, delta) {
    const blend = Math.min(1, (CONFIG.BACKGROUND_BOOST_SMOOTHING * delta) / 1000);
    this.#speedMultiplier += (this.#targetMultiplier - this.#speedMultiplier) * blend;

    this.#layers.forEach((layer) => layer.scroll(delta, this.#speedMultiplier));
    this.#props.update(delta, this.#speedMultiplier);
    this.#updateStreaks(delta);
  }

  /**
   * @returns {void}
   */
  resize() {
    const { width, height } = this.#scene.scale;
    this.#layers.forEach((layer) => layer.resize(width, height));
  }

  /**
   * @param {boolean} isThrusting
   * @returns {void}
   */
  #onThrust(isThrusting) {
    this.#targetMultiplier = isThrusting ? CONFIG.BACKGROUND_BOOST_MULTIPLIER : 1;
  }

  /**
   * @returns {void}
   */
  #createStreaks() {
    for (let i = 0; i < CONFIG.BACKGROUND_STREAK_COUNT; i++) {
      const streak = this.#scene.add
        .image(0, 0, 'streak')
        .setOrigin(0.5, 1)
        .setAlpha(CONFIG.BACKGROUND_STREAK_ALPHA)
        .setDepth(CONFIG.BACKGROUND_STREAK_DEPTH);
      this.#resetStreak(streak, true);
      this.#streaks.push(streak);
    }
  }

  /**
   * @param {number} delta frame time in ms
   * @returns {void}
   */
  #updateStreaks(delta) {
    this.#streaks.forEach((streak) => {
      streak.y += (streak.getData('speed') * this.#speedMultiplier * delta) / 1000;
      if (streak.y - streak.displayHeight > this.#scene.scale.height) {
        this.#resetStreak(streak, false);
      }
    });
  }

  /**
   * @param {Phaser.GameObjects.Image} streak
   * @param {boolean} anywhere true on first placement (random y), false to respawn above the screen
   * @returns {void}
   */
  #resetStreak(streak, anywhere) {
    const { width, height } = this.#scene.scale;
    const rnd = Phaser.Math.RND;
    streak.setData('speed', rnd.realInRange(CONFIG.BACKGROUND_STREAK_SPEED_MIN, CONFIG.BACKGROUND_STREAK_SPEED_MAX));
    streak.setPosition(rnd.between(0, width), anywhere ? rnd.between(0, height) : -rnd.between(0, height));
  }
}
