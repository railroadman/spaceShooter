import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';

/**
 * Plays the impact animation of a player bullet where it hit. Listens to `BULLET_HIT`
 * (`{x, y, effect, scale}`, `scale` is optional, `effect` is the weapon key of the `weapons` atlas frames `<effect>_hit_1..4`)
 * and reuses a small pool of sprites, so a hit without an `effect` costs nothing.
 */
export class HitEffectComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {Phaser.GameObjects.Group} */
  #group;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   */
  constructor(scene, eventBusComponent) {
    this.#scene = scene;
    this.#group = this.#scene.add.group({
      name: `${this.constructor.name}-${Phaser.Math.RND.uuid()}`,
      maxSize: CONFIG.HIT_EFFECT_POOL_SIZE,
    });

    eventBusComponent.on(CUSTOM_EVENTS.BULLET_HIT, this.#play, this);
  }

  /**
   * @param {string} effect weapon key
   * @returns {string} animation key, created on first use
   */
  #getAnimation(effect) {
    const key = `${effect}_hit`;
    if (!this.#scene.anims.exists(key)) {
      this.#scene.anims.create({
        key,
        frames: this.#scene.anims.generateFrameNames('weapons', {
          prefix: `${effect}_hit_`,
          start: 1,
          end: CONFIG.HIT_EFFECT_FRAME_COUNT,
        }),
        frameRate: CONFIG.HIT_EFFECT_FRAME_RATE,
      });
    }
    return key;
  }

  /**
   * @param {{x: number, y: number, effect?: string, scale?: number}} hit
   * @returns {void}
   */
  #play(hit) {
    if (!hit.effect) {
      return;
    }

    /** @type {Phaser.GameObjects.Sprite | null} */
    const sprite = this.#group.get(hit.x, hit.y, 'weapons', `${hit.effect}_hit_1`);
    if (!sprite) {
      return;
    }

    sprite
      .setActive(true)
      .setVisible(true)
      .setPosition(hit.x, hit.y)
      .setScale(hit.scale || CONFIG.HIT_EFFECT_SCALE)
      .setDepth(CONFIG.HIT_EFFECT_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.setActive(false).setVisible(false);
    });
    sprite.play(this.#getAnimation(hit.effect));
  }
}
