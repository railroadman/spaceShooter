import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';
import { WeaponComponent } from './weapon-component.js';

/**
 * Keeps track of which weapon the player has in the main slot and at which level, and
 * applies it to the player's `WeaponComponent`. The secondary slot (rockets) works the
 * same way but stays empty until a secondary weapon is picked up. The level of every weapon
 * type is remembered for the whole run, so picking a type up again continues where it was left.
 * When the ship is destroyed every weapon is lost: the main slot goes back to the start weapon, the secondary slot
 * is emptied and the remembered levels are reset.
 * Settings come from `CONFIG.WEAPONS`; every change is announced with `WEAPON_CHANGED`
 * (`{slot: 'main' | 'secondary', type, level}`).
 */
export class PlayerLoadoutComponent {
  /** @type {WeaponComponent} */
  #weaponComponent;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {string} */
  #type;
  /** @type {WeaponComponent} */
  #secondaryWeaponComponent;
  /** @type {boolean} true once a secondary weapon was picked up (or forced by the debug setting) */
  #hasSecondary = false;
  /** @type {Object<string, number>} level reached by every weapon type */
  #levels = {};

  /**
   * @param {Phaser.Scene} scene
   * @param {WeaponComponent} weaponComponent created with the config of `PlayerLoadoutComponent.startWeapon()`
   * @param {EventBusComponent} eventBusComponent
   * @param {WeaponComponent} secondaryWeaponComponent created with the config of `PlayerLoadoutComponent.secondaryType()`
   */
  constructor(scene, weaponComponent, eventBusComponent, secondaryWeaponComponent) {
    this.#weaponComponent = weaponComponent;
    this.#secondaryWeaponComponent = secondaryWeaponComponent;
    this.#eventBusComponent = eventBusComponent;

    Object.keys(CONFIG.WEAPONS.types).forEach((type) => {
      this.#levels[type] = 1;
    });
    Object.keys(CONFIG.WEAPONS.secondaryTypes).forEach((type) => {
      this.#levels[type] = 1;
    });
    const start = PlayerLoadoutComponent.startWeapon();
    this.#type = start.type;
    this.#levels[start.type] = start.level;
    this.#apply();

    this.#eventBusComponent.on(CUSTOM_EVENTS.PLAYER_DESTROYED, this.#onPlayerDestroyed, this);

    const debug = CONFIG.WEAPONS.debug;
    if (debug.secondary) {
      this.#levels[PlayerLoadoutComponent.secondaryType()] = Phaser.Math.Clamp(debug.secondary, 1, CONFIG.WEAPONS.maxLevel);
      this.#hasSecondary = true;
      this.#applySecondary();
    }
    if (debug.cycleKey || debug.secondaryCycleKey) {
      scene.input.keyboard.on('keydown', (/** @type {KeyboardEvent} */ event) => {
        if (event.code === debug.cycleKey) {
          this.#cycle();
        } else if (event.code === debug.secondaryCycleKey) {
          this.#cycleSecondary();
        }
      });
    }
  }

  /** @type {boolean} */
  get hasSecondary() {
    return this.#hasSecondary;
  }

  /** @type {{type: string, level: number} | null} the secondary weapon, null while the slot is empty */
  get secondary() {
    const type = PlayerLoadoutComponent.secondaryType();
    return this.#hasSecondary ? { type, level: this.#levels[type] } : null;
  }

  /**
   * @param {string} type
   * @returns {number} level reached by a weapon type (main or secondary)
   */
  levelOf(type) {
    return this.#levels[type];
  }

  /** @type {string} */
  get type() {
    return this.#type;
  }

  /** @type {number} */
  get level() {
    return this.#levels[this.#type];
  }

  /**
   * The weapon the player starts with (`WEAPONS.debug` can force another one for testing).
   * @returns {{type: string, level: number}}
   */
  static startWeapon() {
    const { start, debug, maxLevel } = CONFIG.WEAPONS;
    if (debug.type && CONFIG.WEAPONS.types[debug.type]) {
      return { type: debug.type, level: Phaser.Math.Clamp(debug.level, 1, maxLevel) };
    }
    return { type: start.type, level: start.level };
  }

  /**
   * The weapon type of the secondary slot (the first entry of `WEAPONS.secondaryTypes`).
   * @returns {string}
   */
  static secondaryType() {
    return Object.keys(CONFIG.WEAPONS.secondaryTypes)[0];
  }

  /**
   * Bullet settings of a weapon type at a level, ready for `WeaponComponent`.
   * `poolSize` fits the biggest weapon of the same slot, because the bullet pool is created once and never grows.
   * @param {string} type main or secondary weapon type
   * @param {number} level
   * @returns {import('./weapon-component.js').BulletConfig}
   */
  static createBulletConfig(type, level) {
    const types = CONFIG.WEAPONS.types[type] ? CONFIG.WEAPONS.types : CONFIG.WEAPONS.secondaryTypes;
    const weapon = types[type];
    const config = {
      yOffset: CONFIG.PLAYER_BULLET_Y_OFFSET,
      flipY: false,
      ...weapon.base,
      ...weapon.levels[level - 1],
    };
    return { ...config, maxCount: PlayerLoadoutComponent.#bulletsAlive(config), poolSize: PlayerLoadoutComponent.#poolSize(types) };
  }

  /**
   * Picks a weapon of `type` up: the same type as in the slot gains a level (up to the max),
   * another type replaces it and comes back at the level it had before. A secondary weapon
   * fills the secondary slot the same way.
   * @param {string} type
   * @returns {void}
   */
  collect(type) {
    if (CONFIG.WEAPONS.secondaryTypes[type]) {
      this.#collectSecondary(type);
      return;
    }
    if (!CONFIG.WEAPONS.types[type]) {
      return;
    }
    if (type === this.#type) {
      this.#levels[type] = Math.min(this.#levels[type] + 1, CONFIG.WEAPONS.maxLevel);
    }
    this.#type = type;
    this.#apply();
  }

  /**
   * Takes every weapon away: back to the start weapon, no secondary weapon, all remembered levels reset.
   * @returns {void}
   */
  #onPlayerDestroyed() {
    Object.keys(this.#levels).forEach((type) => {
      this.#levels[type] = 1;
    });
    const start = PlayerLoadoutComponent.startWeapon();
    this.#type = start.type;
    this.#levels[start.type] = start.level;
    this.#apply();

    if (this.#hasSecondary) {
      this.#hasSecondary = false;
      this.#eventBusComponent.emit(CUSTOM_EVENTS.WEAPON_CHANGED, { slot: 'secondary', type: null, level: 0 });
    }
  }

  /**
   * @param {string} type
   * @returns {void}
   */
  #collectSecondary(type) {
    if (this.#hasSecondary) {
      this.#levels[type] = Math.min(this.#levels[type] + 1, CONFIG.WEAPONS.maxLevel);
    }
    this.#hasSecondary = true;
    this.#applySecondary();
  }

  /**
   * Debug helper: steps through the rocket levels.
   * @returns {void}
   */
  #cycleSecondary() {
    const type = PlayerLoadoutComponent.secondaryType();
    this.#levels[type] = this.#hasSecondary && this.#levels[type] < CONFIG.WEAPONS.maxLevel ? this.#levels[type] + 1 : 1;
    this.#hasSecondary = true;
    this.#applySecondary();
  }

  /**
   * Debug helper: steps through every level of every weapon type.
   * @returns {void}
   */
  #cycle() {
    const types = Object.keys(CONFIG.WEAPONS.types);
    if (this.level < CONFIG.WEAPONS.maxLevel) {
      this.#levels[this.#type] += 1;
    } else {
      this.#levels[this.#type] = 1;
      this.#type = types[(types.indexOf(this.#type) + 1) % types.length];
    }
    this.#apply();
  }

  /**
   * @returns {void}
   */
  #apply() {
    this.#weaponComponent.setConfig(PlayerLoadoutComponent.createBulletConfig(this.#type, this.level));
    this.#eventBusComponent.emit(CUSTOM_EVENTS.WEAPON_CHANGED, { slot: 'main', type: this.#type, level: this.level });
  }

  /**
   * @returns {void}
   */
  #applySecondary() {
    const type = PlayerLoadoutComponent.secondaryType();
    this.#secondaryWeaponComponent.setConfig(PlayerLoadoutComponent.createBulletConfig(type, this.#levels[type]));
    this.#eventBusComponent.emit(CUSTOM_EVENTS.WEAPON_CHANGED, { slot: 'secondary', type, level: this.#levels[type] });
  }

  /**
   * How many bullets of one weapon can be in the air at once.
   * @param {import('./weapon-component.js').BulletConfig} config
   * @returns {number}
   */
  static #bulletsAlive(config) {
    const perVolley = (config.muzzles ? config.muzzles.length : 1) * (config.angles ? config.angles.length : 1);
    const volleys = Math.ceil((config.lifespan * 1000) / config.interval) + 1;
    return perVolley * volleys;
  }

  /**
   * @param {Object<string, {base: object, levels: object[]}>} types the weapon types that share one bullet pool
   * @returns {number} bullets needed by the biggest weapon level
   */
  static #poolSize(types) {
    let size = 0;
    Object.values(types).forEach((weapon) => {
      weapon.levels.forEach((level) => {
        size = Math.max(size, PlayerLoadoutComponent.#bulletsAlive({ yOffset: 0, ...weapon.base, ...level }));
      });
    });
    return size;
  }
}
