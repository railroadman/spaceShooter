import Phaser from '../lib/phaser.js';
import { getTextStyle } from '../objects/ui/ui-style.js';
import * as CONFIG from '../config.js';

/**
 * A scene that is shown over the game when the level is finished (the boss is defeated)
 * and allows the player to start again.
 */
export class LevelEndScene extends Phaser.Scene {
  constructor() {
    super('LevelEndScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0.75)');

    this.titleText = this.add
      .text(0, 0, CONFIG.LEVEL_END_TITLE, getTextStyle(this, 'title'))
      .setOrigin(0.5, 0.5);

    this.hintText = this.add
      .text(0, 0, 'PRESS ENTER TO RESTART', getTextStyle(this, 'body'))
      .setOrigin(0.5, 0.5);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      this.sys.game.sound.stopAll();
      this.scene.start('GameScene');
    });
  }

  /**
   * Centers the texts on the current camera size.
   * @returns {void}
   */
  layout() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    this.titleText.setPosition(centerX, centerY - 40);
    this.hintText.setPosition(centerX, centerY + 20);
  }
}
