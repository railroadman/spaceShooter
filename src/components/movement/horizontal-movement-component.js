import Phaser from '../../lib/phaser.js';
import { isSpriteWithDynamicBody } from '../../types/typedef.js';
import { InputComponent } from '../input/input-component.js';
import * as CONFIG from '../../config.js';

/**
 * Component that allows for horizontal movement in a Phaser 3 game.
 * This component relies on the built in Phaser 3 Arcade Physics system
 * to move the Phaser 3 game objects around the scene. When input is detected
 * (via the InputComponent), this component will update the physics body
 * velocity.
 */
export class HorizontalMovementComponent {
  /** @type {Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Container} */
  #gameObject;
  /** @type {InputComponent} */
  #inputComponent;
  /** @type {number} */
  #velocity;

  /**
   * @param {Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Container} gameObject
   * @param {InputComponent} inputComponent
   * @param {number} velocity
   * @param {{ drag?: number, damping?: boolean }} [options]
   */
  constructor(gameObject, inputComponent, velocity, options = {}) {
    const {
      drag = CONFIG.COMPONENT_MOVEMENT_HORIZONTAL_DRAG,
      damping = true,
    } = options;
    this.#gameObject = gameObject;
    this.#inputComponent = inputComponent;
    this.#velocity = velocity;

    if (!isSpriteWithDynamicBody(this.#gameObject.body)) {
      return;
    }
    this.#gameObject.body.setDamping(damping);
    this.#gameObject.body.setDrag(drag);
    this.#gameObject.body.setMaxVelocity(CONFIG.COMPONENT_MOVEMENT_HORIZONTAL_MAX_VELOCITY);
  }

  reset() {
    if (!isSpriteWithDynamicBody(this.#gameObject.body)) {
      return;
    }
    this.#gameObject.body.velocity.x = 0;
    this.#gameObject.body.setAngularAcceleration(0);
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