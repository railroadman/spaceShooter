import Phaser from '../lib/phaser.js';

/**
 * A scene that displays a "Game Over" message and allows the player to restart.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0.75)');

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add
      .text(centerX, centerY - 40, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ff0000',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(centerX, centerY + 20, 'Press Enter to Restart', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    this.input.keyboard.on('keydown-ENTER', () => {
      this.sys.game.sound.stopAll();
      this.scene.start('GameScene');
    });
  }
}
