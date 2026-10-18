import Phaser from '../lib/phaser.js';
import * as CONFIG from '../config.js';

/**
 * Responsible for loading all additional assets that are required in the `GameScene`
 * state of our game. This class will also construct all of the animations that are
 * used in the game.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  /**
   * @returns {void}
   */
  preload() {
    // the pack lists every asset: a stale browser-cached copy hides new assets (python http.server sends no cache headers)
    this.load.pack('asset_pack', `assets/data/assets.json?v=${Date.now()}`);
  }

  /**
   * @returns {void}
   */
  create() {
    // loaded sprites are pixel art: keep them crisp; procedural background textures stay smooth
    Object.values(this.textures.list).forEach((texture) => texture.setFilter(Phaser.Textures.FilterMode.NEAREST));
    // the boss is a large illustration scaled down, not pixel art: smooth filtering
    this.textures.get(CONFIG.BOSS.sprite.key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    // weapon and pickup art is a downscaled illustration with soft glow: smooth filtering too
    this.textures.get('weapons').setFilter(Phaser.Textures.FilterMode.LINEAR);
    // planet photos are scaled down illustrations: smooth filtering
    CONFIG.BACKGROUND_PLANET_KEYS.forEach((key) => this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR));
    this.#createAnimations();
    this.scene.start('GameScene');
  }

  /**
   * @returns {void}
   */
  #createAnimations() {
    /** @type {import("../types/typedef").AssetJson} */
    const data = this.cache.json.get('animations_json');
    data.forEach((animation) => {
      const frames = animation.frames
        ? this.anims.generateFrameNumbers(animation.assetKey, { frames: animation.frames })
        : this.anims.generateFrameNumbers(animation.assetKey);
      this.anims.create({
        key: animation.key,
        frames: frames,
        frameRate: animation.frameRate,
        repeat: animation.repeat,
      });
    });
  }
}
