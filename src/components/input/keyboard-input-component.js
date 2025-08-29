import Phaser from '../../lib/phaser.js';
import { InputComponent } from './input-component.js';

/**
 * A custom `InputComponent` that relies on the Phaser 3 Keyboard
 * Plugin to detect input in the web browser.
 */
export class KeyboardInputComponent extends InputComponent {
  
  #cursorKeys;
  /** @type {boolean} */
  #inputLocked;
  

  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    super();
  
    this.#cursorKeys = scene.input.keyboard.createCursorKeys();
    this.#inputLocked = false;
    scene.input.keyboard.on('keydown', (event) => this.#onKeyDown(event));
    scene.input.keyboard.on('keyup', (event) => this.#onKeyUp(event));
  }

  #onKeyDown(event) {
    switch (event.code) {
      case 'ArrowUp':
        this._up = true;
        break;
      case 'ArrowDown':
        this._down = true;
        break;
      case 'ArrowLeft':
        this._left = true;
        this._right = false;
        break;
      case 'ArrowRight':
        this._right = true;
        this._left = false;
        break;
      case 'Space':
        this._shoot = true;
        break;
    }
  }

  #onKeyUp(event) {
    switch (event.code) {
      case 'ArrowUp':
        this._up = false;
        break;
      case 'ArrowDown':
        this._down = false;
        break;
      case 'ArrowLeft':
        this._left = false;
        break;
      case 'ArrowRight':
        this._right = false;
        break;
      case 'Space':
        this._shoot = false;
        break;
    }
  }

  /**
   * @param {boolean} val
   */

  /**
   * Updates the input values based on the Phaser 3 keyboard implementation.
   * @returns {void}
   */
  update() {
    
    
  }
}
