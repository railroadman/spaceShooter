import Phaser from '../lib/phaser.js';

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

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add
      .text(centerX, centerY, 'Paused', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });
  }
}
