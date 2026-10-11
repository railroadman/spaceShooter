import Phaser from '../../lib/phaser.js';

/**
 * One endlessly scrolling background layer built on a tiling sprite.
 * The image moves down (the ship flies "up"), wrapping seamlessly.
 */
export class ParallaxLayer extends Phaser.GameObjects.TileSprite {
  /** @type {number} */
  #speed;

  /**
   * @param {Phaser.Scene} scene
   * @param {{key: string, speed: number, alpha: number, depth: number}} layerConfig
   */
  constructor(scene, layerConfig) {
    super(scene, 0, 0, scene.scale.width, scene.scale.height, layerConfig.key);
    this.#speed = layerConfig.speed;
    this.setOrigin(0, 0).setAlpha(layerConfig.alpha).setDepth(layerConfig.depth);
    scene.add.existing(this);
  }

  /**
   * @param {number} delta frame time in ms
   * @param {number} speedMultiplier 1 = normal speed
   * @returns {void}
   */
  scroll(delta, speedMultiplier) {
    this.tilePositionY -= (this.#speed * speedMultiplier * delta) / 1000;
  }

  /**
   * @param {number} width
   * @param {number} height
   * @returns {void}
   */
  resize(width, height) {
    this.setSize(width, height);
  }
}
