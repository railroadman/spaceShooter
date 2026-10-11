import { CUSTOM_EVENTS, EventBusComponent } from '../../components/events/event-bus-component.js';
import * as CONFIG from '../../config.js';

/**
 * Simple UI component for presenting the players lives in the UI of our game.
 */
export class Lives extends Phaser.GameObjects.Container {
  /** @type {number} */
  #lives;
  /** @type {EventBusComponent} */
  #eventBusComponent;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   */
  constructor(scene, eventBusComponent) {
    super(scene, 0, 0, []);
    this.#eventBusComponent = eventBusComponent;
    this.#lives = CONFIG.PLAYER_LIVES;
    this.scene.add.existing(this);

    // create life icons
    for (let i = 0; i < this.#lives; i += 1) {
      const ship = scene.add
        .image(i * CONFIG.UI_LIVES_ICON_SPACING, 0, 'ship')
        .setScale(CONFIG.UI_LIVES_ICON_SCALE)
        .setOrigin(0, 1);
      this.add(ship);
    }

    this.#eventBusComponent.on(CUSTOM_EVENTS.PLAYER_DESTROYED, () => {
      this.#lives -= 1;
      this.getAt(this.#lives).destroy();
      this.scene.cameras.main.shake(CONFIG.PLAYER_DEATH_SHAKE_DURATION, CONFIG.PLAYER_DEATH_SHAKE_INTENSITY);

      if (this.#lives > 0) {
        scene.time.delayedCall(CONFIG.PLAYER_RESPAWN_DELAY, () => {
          this.#eventBusComponent.emit(CUSTOM_EVENTS.PLAYER_SPAWN);
        });
        return;
      }

      this.#eventBusComponent.emit(CUSTOM_EVENTS.GAME_OVER);

      // Pause the game scene and launch the game over screen
      this.scene.scene.pause('GameScene');
      this.scene.scene.launch('GameOverScene');
    });

    this.#eventBusComponent.on(CUSTOM_EVENTS.EXTRA_LIFE, () => {
      const ship = scene.add
        .image(this.#lives * CONFIG.UI_LIVES_ICON_SPACING, 0, 'ship')
        .setScale(0)
        .setOrigin(0, 1);
      this.add(ship);
      this.#lives += 1;
      scene.tweens.add({
        targets: ship,
        scale: CONFIG.UI_LIVES_ICON_SCALE,
        duration: CONFIG.UI_LIFE_ICON_POP_DURATION,
        ease: 'Back.easeOut',
      });
    });

    this.#eventBusComponent.emit(CUSTOM_EVENTS.PLAYER_SPAWN);
  }
}
