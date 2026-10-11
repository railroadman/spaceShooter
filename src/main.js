import Phaser from './lib/phaser.js';
import { BootScene } from './scenes/boot-scene.js';
import { GameScene } from './scenes/game-scene.js';
import { GameOverScene } from './scenes/game-over-scene.js';
import { LevelEndScene } from './scenes/level-end-scene.js';
import { PauseScene } from './scenes/pause-scene.js';
import { PreloadScene } from './scenes/preload-scene.js';
import * as CONFIG from './config.js';
import { computeGameHeight } from './utils/viewport.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  roundPixels: true,
  pixelArt: false,
  antialias: true,
  scale: {
    parent: 'game-container',
    width: CONFIG.GAME_WIDTH,
    height: computeGameHeight(window.innerWidth, window.innerHeight),
    autoCenter: Phaser.Scale.CENTER_BOTH,
    mode: Phaser.Scale.FIT,
  },
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false,
    },
  },
});

// keep world width fixed; only the height follows the window shape
window.addEventListener('resize', () => {
  game.scale.setGameSize(CONFIG.GAME_WIDTH, computeGameHeight(window.innerWidth, window.innerHeight));
});

game.scene.add('BootScene', BootScene);
game.scene.add('PreloadScene', PreloadScene);
game.scene.add('GameScene', GameScene);
game.scene.add('PauseScene', PauseScene);
game.scene.add('GameOverScene', GameOverScene);
game.scene.add('LevelEndScene', LevelEndScene);
game.scene.start('BootScene');
