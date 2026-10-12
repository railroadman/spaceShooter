/**
 * A simple component for keeping track of the health of a game object.
 * @type {import('../../types/typedef.js').HealthComponent}
 */
export class HealthComponent {
  /** @type {number} */
  #startingLife;
  /** @type {number} */
  #currentLife;
  /** @type {boolean} */
  #isDead;

  /**
   * @param {number} life
   */
  constructor(life) {
    this.#startingLife = life;
    this.#currentLife = life;
    this.#isDead = false;
  }

  /** @type {number} */
  get life() {
    return this.#currentLife;
  }

  /** @type {boolean} */
  get isDead() {
    return this.#isDead;
  }

  /**
   * Sets the life `reset()` restores, e.g. an enemy that gets tougher over time.
   * @param {number} life
   * @returns {void}
   */
  setStartingLife(life) {
    this.#startingLife = life;
  }

  /**
   * @returns {void}
   */
  reset() {
    this.#currentLife = this.#startingLife;
    this.#isDead = false;
  }

  /**
   * @param {number} [damage] life taken away, default 1
   * @returns {void}
   */
  hit(damage = 1) {
    if (this.#isDead) {
      return;
    }

    this.#currentLife -= damage;
    if (this.#currentLife <= 0) {
      this.#isDead = true;
    }
  }

  /**
   * Restores life, never above the starting life. Does nothing for a dead object.
   * @param {number} [amount] life given back, default 1
   * @returns {void}
   */
  heal(amount = 1) {
    if (this.#isDead) {
      return;
    }

    this.#currentLife = Math.min(this.#startingLife, this.#currentLife + amount);
  }

  /**
   * @returns {void}
   */
  die() {
    this.#currentLife = 0;
    this.#isDead = true;
  }
}
