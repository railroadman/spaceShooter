import { InputComponent } from './input-component.js';
import * as CONFIG from '../../config.js';

/**
 * A custom `InputComponent` for the `Fighter` enemy.
 * The enemy will move down the screen while firing its weapon.
 * It will also patrol left and right, switching direction based on a timer.
 */
export class BotFighterInputComponent extends InputComponent {
  /** @type {number} */
  #patrolTimer;

  constructor() {
    super();
    this.reset();
  }

  reset() {
    super.reset();
    this._down = true;
    this._shoot = true;
    this._right = true; // Start by moving right
    this.#patrolTimer = CONFIG.ENEMY_FIGHTER_PATROL_DURATION;
  }

  /**
   * @param {number} dt Delta time in ms
   */
  update(dt) {
    this.#patrolTimer -= dt;
    if (this.#patrolTimer <= 0) {
      // Switch direction
      this._left = !this._left;
      this._right = !this._right;
      // Reset timer
      this.#patrolTimer = CONFIG.ENEMY_FIGHTER_PATROL_DURATION;
    }
  }
}
