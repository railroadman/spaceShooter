import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';

/**
 * HUD health bar of the player ship, drawn on the lives row right after the last life icon.
 * A hit drops the bar at once and leaves a white "ghost" that trails behind; a heal fills it smoothly
 * with a flash. The fill color follows the health share. Health is read from the ship every frame.
 */
export class PlayerHealthBar {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {import('../player.js').Player} */
  #player;
  /** @type {Phaser.GameObjects.Container} */
  #lives;
  /** @type {Phaser.GameObjects.Graphics} */
  #graphics;
  /** @type {number} 0..1 health of the ship on the last frame */
  #target = 1;
  /** @type {number} 0..1 health shown by the fill */
  #fraction = 1;
  /** @type {number} 0..1 trailing "ghost" of the health */
  #ghost = 1;
  /** @type {number} */
  #ghostTimer = 0;
  /** @type {number} */
  #flashTime = 0;
  /** @type {number} */
  #flashColor = 0xffffff;

  /**
   * @param {Phaser.Scene} scene
   * @param {import('../player.js').Player} player
   * @param {Phaser.GameObjects.Container} lives life icons the bar is placed after
   */
  constructor(scene, player, lives) {
    this.#scene = scene;
    this.#player = player;
    this.#lives = lives;
    this.#graphics = scene.add.graphics().setDepth(CONFIG.UI_PLAYER_HEALTH_BAR.depth);

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
    const bar = CONFIG.UI_PLAYER_HEALTH_BAR;
    const target = Phaser.Math.Clamp(this.#player.healthComponent.life / CONFIG.PLAYER_HEALTH, 0, 1);

    if (target < this.#fraction) {
      this.#fraction = target;
      this.#ghostTimer = bar.ghostDelay;
      this.#flash(bar.hitFlashColor, bar.hitFlashDuration);
    } else if (target > this.#fraction) {
      if (target > this.#target) {
        this.#flash(bar.healFlashColor, bar.healFlashDuration);
      }
      this.#fraction = Math.min(target, this.#fraction + (bar.healSpeed * dt) / 1000);
    }
    this.#target = target;

    this.#flashTime = Math.max(0, this.#flashTime - dt);
    this.#ghostTimer -= dt;
    if (this.#ghost < this.#fraction) {
      this.#ghost = this.#fraction;
    } else if (this.#ghostTimer <= 0) {
      this.#ghost = Math.max(this.#fraction, this.#ghost - (bar.ghostSpeed * dt) / 1000);
    }

    this.#draw();
  }

  /**
   * @param {number} color
   * @param {number} duration
   * @returns {void}
   */
  #flash(color, duration) {
    this.#flashColor = color;
    this.#flashTime = duration;
  }

  /**
   * @returns {void}
   */
  #draw() {
    const bar = CONFIG.UI_PLAYER_HEALTH_BAR;
    this.#graphics.clear();
    const icon = /** @type {Phaser.GameObjects.Image | undefined} */ (this.#lives.getAt(this.#lives.length - 1));
    if (!icon) {
      return;
    }

    const x = this.#lives.x + icon.x + icon.displayWidth + bar.gapX;
    const y = this.#lives.y - CONFIG.UI_LIVES_ICON_SCALE * icon.height * 0.5 - bar.height / 2;
    let color = bar.colors.high;
    if (this.#fraction < bar.lowBelow) {
      color = bar.colors.low;
    } else if (this.#fraction < bar.midBelow) {
      color = bar.colors.mid;
    }

    this.#graphics
      .fillStyle(bar.backColor, 0.85)
      .fillRect(x - bar.border, y - bar.border, bar.width + bar.border * 2, bar.height + bar.border * 2);
    this.#graphics.fillStyle(bar.ghostColor, 0.7).fillRect(x, y, bar.width * this.#ghost, bar.height);
    this.#graphics
      .fillStyle(this.#flashTime > 0 ? this.#flashColor : color, 1)
      .fillRect(x, y, bar.width * this.#fraction, bar.height);
  }

  /**
   * @returns {void}
   */
  #removeListeners() {
    this.#scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
  }
}
