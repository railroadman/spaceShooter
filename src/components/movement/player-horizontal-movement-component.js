import { isSpriteWithDynamicBody } from '../../types/typedef.js';
import { InputComponent } from '../input/input-component.js';

/**
1 * A player-specific movement component that uses velocity for immediate
 * movement.
 */
export class PlayerHorizontalMovementComponent {
  /** @type {Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Container} */
  #gameObject;
  /** @type {InputComponent} */
  #inputComponent;
  /** @type {number} */
  #velocity;

  /**
   * @param {Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Container} gameObject
   * @param {InputComponent} inputComponent
   * @param {{velocity: number, maxVelocity: number}} options
   */
  constructor(gameObject, inputComponent, { velocity, maxVelocity }) {
    this.#gameObject = gameObject;
    this.#inputComponent = inputComponent;
    this.#velocity = velocity;

    if (isSpriteWithDynamicBody(this.#gameObject.body)) {
      this.#gameObject.body.setDamping(false);
      this.#gameObject.body.setMaxVelocity(maxVelocity, maxVelocity); // Set for both x and y
    }
  }

  update() {
    if (!isSpriteWithDynamicBody(this.#gameObject.body)) {
      return;
    }

    if (this.#inputComponent.leftIsDown) {
      this.#gameObject.body.setVelocityX(-this.#velocity);
    } else if (this.#inputComponent.rightIsDown) {
      this.#gameObject.body.setVelocityX(this.#velocity);
    } else {
      this.#gameObject.body.setVelocityX(0);
    }
  }
}
