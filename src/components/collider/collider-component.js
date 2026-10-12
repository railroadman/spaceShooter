import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';
import { HealthComponent } from '../health/health-component.js';

/**
 * A simple component for handling when collisions between two different
 * game objects in our game.
 * @type {import('../../types/typedef.js').ColliderComponent}
 */
export class ColliderComponent {
  /** @type {HealthComponent} */
  #healthComponent;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {boolean} */
  #isInvulnerable = false;
  /** @type {number} hits the shield can still absorb */
  #shield = 0;
  /** @type {number} ms of the pause after an absorbed hit, set by `addShield` */
  #shieldGrace = 0;
  /** @type {number} ms left of the pause during which hits are ignored */
  #shieldCooldown = 0;

  /** @type {boolean} */
  get isInvulnerable() {
    return this.#isInvulnerable;
  }

  set isInvulnerable(value) {
    this.#isInvulnerable = value;
  }

  /** @type {number} hits the shield can still absorb */
  get shield() {
    return this.#shield;
  }

  /**
   * @param {HealthComponent} healthComponent
   * @param {EventBusComponent} eventBusComponent
   */
  constructor(healthComponent, eventBusComponent) {
    this.#healthComponent = healthComponent;
    this.#eventBusComponent = eventBusComponent;
  }

  /**
   * Gives a shield that absorbs the next `charges` hits (a new shield replaces the old one).
   * @param {number} charges
   * @param {number} hitGrace ms after an absorbed hit during which further hits are ignored
   * @returns {void}
   */
  addShield(charges, hitGrace) {
    this.#shield = charges;
    this.#shieldGrace = hitGrace;
    this.#shieldCooldown = 0;
    this.#eventBusComponent.emit(CUSTOM_EVENTS.SHIELD_CHANGED, { charges, absorbed: false });
  }

  /**
   * Removes the shield without absorbing anything.
   * @returns {void}
   */
  clearShield() {
    if (this.#shield === 0) {
      return;
    }
    this.#shield = 0;
    this.#shieldCooldown = 0;
    this.#eventBusComponent.emit(CUSTOM_EVENTS.SHIELD_CHANGED, { charges: 0, absorbed: false });
  }

  /**
   * @param {number} dt
   * @returns {void}
   */
  update(dt) {
    this.#shieldCooldown = Math.max(0, this.#shieldCooldown - dt);
  }

  /**
   * @returns {void}
   */
  collideWithEnemyShip() {
    if (this.#isInvulnerable || this.#healthComponent.isDead || this.#absorbWithShield()) {
      return;
    }
    this.#healthComponent.die();
  }

  /**
   * @param {number} [damage] life taken away, default 1
   * @returns {void}
   */
  collideWithEnemyProjectile(damage = 1) {
    if (this.#isInvulnerable || this.#healthComponent.isDead || this.#absorbWithShield()) {
      return;
    }
    this.#healthComponent.hit(damage);
    this.#eventBusComponent.emit(CUSTOM_EVENTS.SHIP_HIT);
  }

  /**
   * Lets the shield take a hit. Hits right after an absorbed one are swallowed without using a charge.
   * @returns {boolean} true when the shield took the hit, so the ship must not be damaged
   */
  #absorbWithShield() {
    if (this.#shield === 0) {
      return false;
    }
    if (this.#shieldCooldown > 0) {
      return true;
    }
    this.#shield -= 1;
    this.#shieldCooldown = this.#shieldGrace;
    this.#eventBusComponent.emit(CUSTOM_EVENTS.SHIELD_CHANGED, { charges: this.#shield, absorbed: true });
    return true;
  }
}
