import { CUSTOM_EVENTS, EventBusComponent } from '../components/events/event-bus-component.js';
import * as CONFIG from '../config.js';

/**
 * Draws the energy shield around the ship: a glowing circle that fades with every absorbed
 * hit and a ripple ring that spreads from the circle when a hit is absorbed.
 * Follows `SHIELD_CHANGED` (`{charges, absorbed}`) and lives inside the given parent container.
 */
export class ShieldEffect {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {Phaser.GameObjects.Graphics} */
  #bubble;
  /** @type {Phaser.GameObjects.Graphics} */
  #ripple;

  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Container} parent the ship, the shield is centered on it
   * @param {EventBusComponent} eventBusComponent
   */
  constructor(scene, parent, eventBusComponent) {
    this.#scene = scene;
    const { radius, color } = CONFIG.SHIELD;

    this.#bubble = scene.add.graphics().setVisible(false);
    this.#bubble.fillStyle(color, 0.15).fillCircle(0, 0, radius);
    this.#bubble.lineStyle(2, color, 0.9).strokeCircle(0, 0, radius);
    this.#bubble.setBlendMode(Phaser.BlendModes.ADD);

    this.#ripple = scene.add.graphics().setVisible(false);
    this.#ripple.lineStyle(3, color, 1).strokeCircle(0, 0, radius);
    this.#ripple.setBlendMode(Phaser.BlendModes.ADD);

    parent.add([this.#bubble, this.#ripple]);
    eventBusComponent.on(CUSTOM_EVENTS.SHIELD_CHANGED, this.#onShieldChanged, this);
  }

  /**
   * @param {{charges: number, absorbed: boolean}} change
   * @returns {void}
   */
  #onShieldChanged({ charges, absorbed }) {
    this.#bubble.setVisible(charges > 0);
    this.#bubble.setAlpha(0.4 + (0.6 * charges) / CONFIG.SHIELD.charges);

    if (!absorbed) {
      return;
    }
    this.#scene.tweens.killTweensOf(this.#ripple);
    this.#ripple.setVisible(true).setScale(1).setAlpha(1);
    this.#scene.tweens.add({
      targets: this.#ripple,
      scale: 1.6,
      alpha: 0,
      duration: CONFIG.SHIELD.rippleDuration,
      ease: 'Quad.easeOut',
      onComplete: () => this.#ripple.setVisible(false),
    });
  }
}
