import Phaser from '../../lib/phaser.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../../components/events/event-bus-component.js';
import * as CONFIG from '../../config.js';
import { getSafeArea } from '../../utils/viewport.js';
import { getTextStyle } from './ui-style.js';

/**
 * Boss HUD: the blinking WARNING text before the fight and the health bar above the boss.
 * The bar shows the current health, a white "ghost" that trails behind after a hit,
 * and takes its color from the current boss phase.
 */
export class BossHealthBar {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {Phaser.GameObjects.Graphics} */
  #graphics;
  /** @type {Phaser.GameObjects.Text} */
  #warning;
  /** @type {import('../enemies/boss-enemy.js').BossEnemy | null} */
  #boss = null;
  /** @type {boolean} */
  #shown = false;
  /** @type {number} 0..1 fade of the whole bar */
  #alpha = 0;
  /** @type {number} 0..1 current health */
  #fraction = 1;
  /** @type {number} 0..1 trailing "ghost" of the health */
  #ghost = 1;
  /** @type {number} */
  #ghostTimer = 0;
  /** @type {number} */
  #flashTime = 0;
  /** @type {number} */
  #color = 0xffffff;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   */
  constructor(scene, eventBusComponent) {
    this.#scene = scene;
    this.#graphics = scene.add.graphics().setDepth(CONFIG.BOSS.bar.depth).setVisible(false);
    this.#warning = scene.add
      .text(0, 0, CONFIG.BOSS.warning.text, getTextStyle(scene, 'danger'))
      .setOrigin(0.5)
      .setDepth(CONFIG.UI_POPUP_DEPTH)
      .setVisible(false);

    eventBusComponent.on(CUSTOM_EVENTS.BOSS_WARNING, this.#showWarning, this);
    eventBusComponent.on(CUSTOM_EVENTS.BOSS_SPAWN, this.#onBossSpawn, this);
    eventBusComponent.on(CUSTOM_EVENTS.BOSS_PHASE_CHANGED, this.#onPhaseChanged, this);
    eventBusComponent.on(CUSTOM_EVENTS.BOSS_HEALTH_CHANGED, this.#onHealthChanged, this);
    eventBusComponent.on(CUSTOM_EVENTS.BOSS_DEFEATED, this.#onBossDefeated, this);

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#removeListeners, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.#removeListeners, this);
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    const bar = CONFIG.BOSS.bar;
    const step = dt / bar.fadeDuration;
    this.#alpha = Phaser.Math.Clamp(this.#alpha + (this.#shown ? step : -step), 0, 1);
    if (this.#alpha <= 0 || !this.#boss) {
      this.#graphics.setVisible(false);
      return;
    }

    this.#updateGhost(dt);
    this.#draw();
  }

  /**
   * @param {number} dt
   * @returns {void}
   */
  #updateGhost(dt) {
    this.#flashTime = Math.max(0, this.#flashTime - dt);
    this.#ghostTimer -= dt;
    if (this.#ghostTimer <= 0 && this.#ghost > this.#fraction) {
      this.#ghost = Math.max(this.#fraction, this.#ghost - (CONFIG.BOSS.bar.ghostSpeed * dt) / 1000);
    }
  }

  /**
   * @returns {void}
   */
  #draw() {
    const bar = CONFIG.BOSS.bar;
    const boss = /** @type {import('../enemies/boss-enemy.js').BossEnemy} */ (this.#boss);
    const safe = getSafeArea(this.#scene.scale);
    const x = Phaser.Math.Clamp(boss.x - bar.width / 2, safe.left, safe.right - bar.width);
    const y = Math.max(bar.minY, boss.y - bar.anchorOffset);

    this.#graphics.setVisible(true).setAlpha(this.#alpha).clear();
    this.#graphics
      .fillStyle(bar.backColor, 0.85)
      .fillRect(x - bar.border, y - bar.border, bar.width + bar.border * 2, bar.height + bar.border * 2);
    this.#graphics.fillStyle(bar.ghostColor, 0.7).fillRect(x, y, bar.width * this.#ghost, bar.height);
    this.#graphics
      .fillStyle(this.#flashTime > 0 ? bar.flashColor : this.#color, 1)
      .fillRect(x, y, bar.width * this.#fraction, bar.height);
  }

  /**
   * @returns {void}
   */
  #showWarning() {
    const warning = CONFIG.BOSS.warning;
    this.#warning
      .setPosition(this.#scene.scale.width / 2, this.#scene.scale.height * warning.yFraction)
      .setAlpha(1)
      .setVisible(true);
    this.#scene.tweens.add({
      targets: this.#warning,
      alpha: 0.15,
      duration: warning.blinkPeriod,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * @param {import('../enemies/boss-enemy.js').BossEnemy} boss
   * @returns {void}
   */
  #onBossSpawn(boss) {
    this.#scene.tweens.killTweensOf(this.#warning);
    this.#warning.setVisible(false);
    this.#boss = boss;
    this.#fraction = 1;
    this.#ghost = 1;
  }

  /**
   * The first phase starts when the boss reaches its position, that is when the bar appears.
   * @param {number} index
   * @param {{barColor: number}} phase
   * @returns {void}
   */
  #onPhaseChanged(index, phase) {
    this.#color = phase.barColor;
    this.#shown = true;
  }

  /**
   * @param {number} fraction
   * @returns {void}
   */
  #onHealthChanged(fraction) {
    this.#fraction = fraction;
    this.#ghostTimer = CONFIG.BOSS.bar.ghostDelay;
    this.#flashTime = CONFIG.BOSS.bar.flashDuration;
  }

  /**
   * @returns {void}
   */
  #onBossDefeated() {
    this.#fraction = 0;
    this.#shown = false;
  }

  /**
   * @returns {void}
   */
  #removeListeners() {
    this.#scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
  }
}
