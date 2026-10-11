import Phaser from '../lib/phaser.js';
import { getTextStyle } from '../objects/ui/ui-style.js';

/**
 * A scene that displays a "Game Over" message and allows the player to restart.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0.75)');

    this.titleText = this.add
      .text(0, 0, 'GAME OVER', getTextStyle(this, 'danger'))
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
