import Phaser from '../../lib/phaser.js';
import { getTextStyle } from './ui-style.js';

/**
 * HUD timer: game time since the start of the run as m:ss. Time is summed from the scene
 * update, so it stops while the scene is paused (the same clock the boss spawner uses).
 */
export class GameTimer extends Phaser.GameObjects.Text {
  /** @type {Phaser.Scene} kept apart from `this.scene`, which is cleared when the text is destroyed on shutdown */
  #scene;
  /** @type {number} ms of game time */
  #elapsed = 0;
  /** @type {number} last shown whole second */
  #shownSeconds = 0;

  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    super(scene, 0, 0, GameTimer.#format(0), getTextStyle(scene, 'body'));

    this.#scene = scene;
    this.scene.add.existing(this);
    this.setOrigin(0.5);

    this.#scene.events.on(Phaser.Scenes.Events.UPDATE, this.#tick, this);
    this.#scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#removeListeners, this);
    this.#scene.events.once(Phaser.Scenes.Events.DESTROY, this.#removeListeners, this);
  }

  /**
   * @param {number} seconds
   * @returns {string}
   */
  static #format(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString(10).padStart(2, '0')}`;
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  #tick(ts, dt) {
    this.#elapsed += dt;
    const seconds = Math.floor(this.#elapsed / 1000);
    if (seconds === this.#shownSeconds) {
      return;
    }
    this.#shownSeconds = seconds;
    this.setText(GameTimer.#format(seconds));
  }

  /**
   * @returns {void}
   */
  #removeListeners() {
    this.#scene.events.off(Phaser.Scenes.Events.UPDATE, this.#tick, this);
  }
}
