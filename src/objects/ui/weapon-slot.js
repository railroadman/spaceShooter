import Phaser from '../../lib/phaser.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../../components/events/event-bus-component.js';
import * as CONFIG from '../../config.js';

/**
 * HUD slot of one weapon slot (`main` or `secondary`): the box icon of the weapon and one pip per level
 * (filled up to the current level). Origin is the bottom-left corner, it follows `WEAPON_CHANGED` of its slot.
 * An empty slot (no weapon yet) is hidden.
 */
export class WeaponSlot extends Phaser.GameObjects.Container {
  /** @type {Phaser.GameObjects.Image} */
  #icon;
  /** @type {Phaser.GameObjects.Graphics} */
  #pips;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   * @param {{type: string, level: number} | null} weapon the weapon the player starts with, null = empty slot
   * @param {'main' | 'secondary'} slotName
   */
  constructor(scene, eventBusComponent, weapon, slotName) {
    super(scene, 0, 0, []);
    this.scene.add.existing(this);

    const slot = CONFIG.UI_WEAPON_SLOT;
    this.#icon = scene.add.image(0, 0, 'weapons', 'box_plasma').setScale(slot.iconScale).setOrigin(0, 1);
    this.#pips = scene.add.graphics();
    this.add([this.#icon, this.#pips]);

    this.setVisible(false);
    if (weapon) {
      this.#update(weapon.type, weapon.level);
    }
    eventBusComponent.on(CUSTOM_EVENTS.WEAPON_CHANGED, (/** @type {{slot: string, type: string | null, level: number}} */ change) => {
      if (change.slot !== slotName) {
        return;
      }
      if (change.type === null) {
        this.setVisible(false);
        return;
      }
      this.#update(change.type, change.level);
    });
  }

  /**
   * @param {string} type
   * @param {number} level
   * @returns {void}
   */
  #update(type, level) {
    const slot = CONFIG.UI_WEAPON_SLOT;
    const color = (CONFIG.WEAPONS.types[type] || CONFIG.WEAPONS.secondaryTypes[type]).color;
    this.setVisible(true);
    this.#icon.setFrame(`box_${type}`);

    // pips are stacked bottom-up to the right of the icon
    this.#pips.clear();
    for (let i = 0; i < CONFIG.WEAPONS.maxLevel; i += 1) {
      const x = this.#icon.displayWidth + slot.pipOffsetX;
      const y = -this.#icon.displayHeight / 2 - slot.pipSpacing * (i - (CONFIG.WEAPONS.maxLevel - 1) / 2);
      this.#pips.fillStyle(color, i < level ? 1 : slot.dimAlpha).fillCircle(x, y, slot.pipRadius);
    }
  }
}
