import { CUSTOM_EVENTS, EventBusComponent } from '../../components/events/event-bus-component.js';
import * as CONFIG from '../../config.js';
import { getTextStyle } from './ui-style.js';

const ENEMY_SCORES = {
  ScoutEnemy: CONFIG.ENEMY_SCOUT_SCORE,
  FighterEnemy: CONFIG.ENEMY_FIGHTER_SCORE,
};

/**
 * UI component for presenting the players score. Shows a zero-padded value,
 * pops when points are added and spawns a floating "+N" where the enemy died.
 * Floating texts come from a fixed pool, so no objects are created while playing.
 */
export class Score extends Phaser.GameObjects.Text {
  /** @type {number} */
  #score;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {Phaser.GameObjects.Text[]} */
  #popups;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   */
  constructor(scene, eventBusComponent) {
    super(scene, 0, 0, Score.#format(0), getTextStyle(scene, 'score'));

    this.scene.add.existing(this);
    this.#eventBusComponent = eventBusComponent;
    this.#score = 0;
    this.setOrigin(1, 0.5);

    this.#popups = Array.from({ length: CONFIG.UI_POPUP_POOL_SIZE }, () =>
      scene.add
        .text(0, 0, '', getTextStyle(scene, 'popup'))
        .setOrigin(0.5)
        .setDepth(CONFIG.UI_POPUP_DEPTH)
        .setActive(false)
        .setVisible(false)
    );

    this.#eventBusComponent.on(CUSTOM_EVENTS.ENEMY_DESTROYED, this.#onEnemyDestroyed, this);
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  static #format(value) {
    return value.toString(10).padStart(CONFIG.UI_SCORE_DIGITS, '0');
  }

  /**
   * @param {Phaser.GameObjects.Sprite} enemy destroyed enemy
   * @returns {void}
   */
  #onEnemyDestroyed(enemy) {
    const points = ENEMY_SCORES[enemy.constructor.name];
    const extraLives =
      Math.floor((this.#score + points) / CONFIG.PLAYER_EXTRA_LIFE_SCORE) -
      Math.floor(this.#score / CONFIG.PLAYER_EXTRA_LIFE_SCORE);
    this.#score += points;
    for (let i = 0; i < extraLives; i += 1) {
      this.#eventBusComponent.emit(CUSTOM_EVENTS.EXTRA_LIFE);
    }
    this.setText(Score.#format(this.#score));
    this.#pop();
    this.#showPopup(enemy.x, enemy.y, points);
  }

  /**
   * Short scale bump of the score text.
   * @returns {void}
   */
  #pop() {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1);
    this.scene.tweens.add({
      targets: this,
      scale: CONFIG.UI_SCORE_POP_SCALE,
      duration: CONFIG.UI_SCORE_POP_DURATION,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * Floats "+N" up from the given point and fades it out; skipped if the pool is busy.
   * @param {number} x
   * @param {number} y
   * @param {number} points
   * @returns {void}
   */
  #showPopup(x, y, points) {
    const popup = this.#popups.find((item) => !item.active);
    if (!popup) {
      return;
    }

    const margin = CONFIG.UI_POPUP_EDGE_MARGIN;
    const clampedX = Phaser.Math.Clamp(x, margin, this.scene.scale.width - margin);
    popup.setText(`+${points}`).setPosition(clampedX, y).setAlpha(1).setActive(true).setVisible(true);
    this.scene.tweens.add({
      targets: popup,
      y: y - CONFIG.UI_POPUP_RISE,
      alpha: 0,
      duration: CONFIG.UI_POPUP_DURATION,
      ease: 'Quad.easeOut',
      onComplete: () => popup.setActive(false).setVisible(false),
    });
  }
}
