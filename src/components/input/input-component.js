/**
 * A base component for handling player or AI input.
 * For handling player input in a Phaser 3 game, this class
 * should be extended to support the built in input methods from Phaser,
 * such as keyboard, gamepad, touch, etc. For an example, please see
 * the `KeyboardInputComponent` class.
 *
 * For AI, this class can be extended to support custom logic for the AI
 * to update the inputs to support the movement that is needed. For an
 * example, please see the `BotFighterInputComponent` class.
 */
export class InputComponent {
  /** @protected @type {boolean} */
  _up;
  /** @protected @type {boolean} */
  _down;
  /** @protected @type {boolean} */
  _left;
  /** @protected @type {boolean} */
  _right;
  /** @protected @type {boolean} */
  _shoot;
  /** @protected @type {number | null} analog horizontal direction -1..1; null = use left/right flags */
  _horizontalAxis = null;
  /** @protected @type {number} multiplier of the base vertical speed */
  _verticalSpeedScale = 1;

  constructor() {
    
  }

  /** @type {boolean} */
  get leftIsDown() {
    return this._left;
  }

  /** @type {boolean} */
  get rightIsDown() {
    return this._right;
  }

  /** @type {boolean} */
  get downIsDown() {
    return this._down;
  }

  /** @type {boolean} */
  get upIsDown() {
    return this._up;
  }

  /**
   * Horizontal direction as a number from -1 (left) to 1 (right). Analog when the input
   * sets it (AI patterns), otherwise derived from the left/right flags.
   * @type {number}
   */
  get horizontalAxis() {
    if (this._horizontalAxis !== null) {
      return this._horizontalAxis;
    }
    if (this._left) {
      return -1;
    }
    return this._right ? 1 : 0;
  }

  /** @type {number} */
  get verticalSpeedScale() {
    return this._verticalSpeedScale;
  }

  /** @type {boolean} */
  get shootIsDown() {
    return this._shoot;
  }

  /**
   * Resets all of the inputs back to their default values `false`.
   * @returns {void}
   */
  reset() {
    this._up = false;
    this._down = false;
    this._right = false;
    this._left = false;
    this._shoot = false;
    this._horizontalAxis = null;
    this._verticalSpeedScale = 1;
  }
}
