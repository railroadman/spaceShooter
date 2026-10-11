import { InputComponent } from './input-component.js';
import { WaveMovementPattern, ZigzagMovementPattern } from '../movement/movement-patterns.js';
import * as CONFIG from '../../config.js';

/**
 * A custom `InputComponent` that is used for the `Scout` enemy
 * type. This class is the "brain" of the scout: it flies down, fires its weapon,
 * and on every spawn picks a movement pattern (sine wave or zigzag, see
 * `CONFIG.ENEMY_SCOUT_PATTERNS`). Scouts ignore the position of the player when moving.
 */
export class BotScoutInputComponent extends InputComponent {
  /** @type {import('../../objects/player.js').Player} */
  #player;
  /** @type {Record<string, import('../movement/movement-patterns.js').MovementPattern>} */
  #patterns;
  /** @type {import('../movement/movement-patterns.js').MovementPattern} */
  #pattern;
  /** @type {import('../movement/movement-patterns.js').MovementOutput} */
  #output = { axisX: 0, speedScale: 1 };

  /**
   * @param {import('../../objects/player.js').Player} player
   */
  constructor(player) {
    super();
    this.#player = player;
    this.#patterns = {
      wave: new WaveMovementPattern(CONFIG.ENEMY_SCOUT_WAVE_PERIOD),
      zigzag: new ZigzagMovementPattern(CONFIG.ENEMY_SCOUT_ZIGZAG_INTERVAL, CONFIG.ENEMY_SCOUT_ZIGZAG_SMOOTHING),
    };
    this.reset();
  }

  reset() {
    super.reset();
    this._down = true;
    this._shoot = true;
    this.#pattern = this.#patterns[Phaser.Math.RND.pick(CONFIG.ENEMY_SCOUT_PATTERNS)];
    this.#pattern.reset();
  }

  /**
   * @param {number} dt Delta time in ms
   * @param {import('../../objects/enemies/scout-enemy.js').ScoutEnemy} enemy
   * @returns {void}
   */
  update(dt, enemy) {
    this.#pattern.update(dt, enemy, this.#player, this.#output);
    this._horizontalAxis = this.#output.axisX;
    this._verticalSpeedScale = this.#output.speedScale;
  }
}
