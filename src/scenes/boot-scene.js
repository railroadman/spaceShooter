import Phaser from '../lib/phaser.js';
import * as CONFIG from '../config.js';

/**
 * Responsible for loading any assets that are required in the `PreloadScene`
 * state of our game.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * @returns {void}
   */
  preload() {
    this.load.json('animations_json', 'assets/data/animations.json');
  }

  /**
   * @returns {void}
   */
  create() {
    this.#waitForUiFont().then(() => this.scene.start('PreloadScene'));
  }

  /**
   * Text is rasterized once on creation, so the HUD font must be ready before any text exists.
   * Falls back to the system font when loading fails or takes longer than the timeout.
   * @returns {Promise<void>}
   */
  #waitForUiFont() {
    const timeout = new Promise((resolve) => setTimeout(resolve, CONFIG.UI_FONT_LOAD_TIMEOUT));
    // pass the characters the HUD uses, so the matching font subset is downloaded too
    const load = document.fonts
      .load('bold 24px Orbitron', '0123456789+ ABCDEFGHIJKLMNOPQRSTUVWXYZ')
      .then(() => document.fonts.ready)
      .catch(() => {});
    return Promise.race([load, timeout]).then(() => {});
  }
}
