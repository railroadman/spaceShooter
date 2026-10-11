import Phaser from '../lib/phaser.js';
import { getTextStyle } from '../objects/ui/ui-style.js';

/**
 * A simple scene that displays a pause message.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create() {
    // Make this scene transparent
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0.5)');

    this.pausedText = this.add
      .text(0, 0, 'PAUSED', getTextStyle(this, 'title'))
      .setOrigin(0.5, 0.5);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
    });

    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });
  }

  /**
   * Centers the text on the current camera size.
   * @returns {void}
   */
  layout() {
    this.pausedText.setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);
  }
}
