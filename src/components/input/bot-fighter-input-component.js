import { InputComponent } from './input-component.js';
import { ChaseMovementPattern, DashMovementPattern } from '../movement/movement-patterns.js';
import * as CONFIG from '../../config.js';

/**
 * A custom `InputComponent` for the `Fighter` enemy.
 * The fighter flies down while firing, eases toward the horizontal position of the
 * player and from time to time performs a dash (slow-down wind-up first, then a burst of speed).
 */
export class BotFighterInputComponent extends InputComponent {
  /** @type {import('../../objects/player.js').Player} */
  #player;
  /** @type {DashMovementPattern} */
  #pattern;
  /** @type {import('../movement/movement-patterns.js').MovementOutput} */
  #output = { axisX: 0, speedScale: 1 };

  /**
   * @param {import('../../objects/player.js').Player} player
   */
  constructor(player) {
    super();
    this.#player = player;
    this.#pattern = new DashMovementPattern(
      new ChaseMovementPattern(CONFIG.ENEMY_FIGHTER_CHASE_RANGE, CONFIG.ENEMY_FIGHTER_CHASE_SMOOTHING),
      CONFIG.ENEMY_FIGHTER_DASH
    );
    this.reset();
  }

  reset() {
    super.reset();
    this._down = true;
    this._shoot = true;
    this.#pattern.reset();
  }

  /**
   * @param {number} dt Delta time in ms
   * @param {import('../../objects/enemies/fighter-enemy.js').FighterEnemy} enemy
   * @returns {void}
   */
  update(dt, enemy) {
    this.#pattern.update(dt, enemy, this.#player, this.#output);
    this._horizontalAxis = this.#output.axisX;
    this._verticalSpeedScale = this.#output.speedScale;
  }
}
