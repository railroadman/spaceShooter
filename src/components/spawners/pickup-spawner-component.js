import Phaser from '../../lib/phaser.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../events/event-bus-component.js';
import * as CONFIG from '../../config.js';

/**
 * Drops pickup boxes from destroyed enemies (`ENEMY_DESTROYED`) and handles their life:
 * they fall, spin and pulse and blink before they disappear. The ship has to fly into a pickup to take it.
 * When the ship touches one, `PICKUP_COLLECTED` is emitted with `{kind, type}`; the ship applies it.
 * Drop chances and the share of every kind are read from `CONFIG.DROP`, the look from `CONFIG.PICKUPS`.
 */
export class PickupSpawnerComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {import('../../objects/player.js').Player} */
  #player;
  /** @type {Phaser.Physics.Arcade.Group} */
  #group;
  /** @type {boolean} no new pickups once the game is over */
  #isGameOver = false;
  /** @type {number} ms until a regular enemy may drop again */
  #cooldownLeft = 0;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   * @param {import('../../objects/player.js').Player} player
   */
  constructor(scene, eventBusComponent, player) {
    this.#scene = scene;
    this.#eventBusComponent = eventBusComponent;
    this.#player = player;

    this.#group = this.#scene.physics.add.group({
      enable: false,
      classType: Phaser.Physics.Arcade.Sprite,
      key: 'weapons',
      frame: 'box_health',
      quantity: CONFIG.PICKUPS.poolSize,
      active: false,
      visible: false,
      setDepth: { value: CONFIG.PICKUPS.depth },
    });
    this.#scene.physics.add.overlap(this.#player, this.#group, (playerGameObject, pickup) =>
      this.#collect(/** @type {Phaser.Physics.Arcade.Sprite} */ (pickup))
    );

    this.#eventBusComponent.on(CUSTOM_EVENTS.ENEMY_DESTROYED, this.#onEnemyDestroyed, this);
    this.#eventBusComponent.once(CUSTOM_EVENTS.GAME_OVER, () => {
      this.#isGameOver = true;
    });
    this.#scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.#scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#removeListeners, this);
    this.#scene.events.once(Phaser.Scenes.Events.DESTROY, this.#removeListeners, this);
  }

  /** @type {Phaser.Physics.Arcade.Group} */
  get phaserGroup() {
    return this.#group;
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    const config = CONFIG.PICKUPS;
    this.#cooldownLeft = Math.max(0, this.#cooldownLeft - dt);
    this.#group.getChildren().forEach((child) => {
      const pickup = /** @type {Phaser.Physics.Arcade.Sprite} */ (child);
      if (!pickup.active) {
        return;
      }

      const age = pickup.getData('age') + dt;
      pickup.setData('age', age);
      if (age >= config.lifetime || pickup.y > this.#scene.scale.height + CONFIG.DESPAWN_MARGIN_Y) {
        pickup.disableBody(true, true);
        return;
      }

      pickup.angle += (config.spinSpeed * dt) / 1000;
      pickup.setScale(config.scale * (1 + config.pulse.amount * Math.sin((age / config.pulse.period) * Math.PI * 2)));
      const isBlinkHidden = age > config.lifetime - config.blinkTime && Math.floor(age / config.blinkInterval) % 2 === 1;
      pickup.setAlpha(isBlinkHidden ? 0.3 : 1);

      pickup.setVelocity(0, config.fallSpeed);
    });
  }

  /**
   * @param {{x: number, y: number}} enemy the destroyed enemy, its class name decides the chance
   * @returns {void}
   */
  #onEnemyDestroyed(enemy) {
    if (this.#isGameOver) {
      return;
    }
    const chance = CONFIG.DROP.debug.forceAll ? 1 : CONFIG.DROP.chance[enemy.constructor.name] || 0;
    const isGuaranteed = chance >= 1;
    if ((!isGuaranteed && this.#cooldownLeft > 0) || Phaser.Math.RND.frac() >= chance) {
      return;
    }
    const drop = this.#rollDrop();
    if (drop) {
      this.#spawn(enemy.x, enemy.y, drop);
      this.#cooldownLeft = CONFIG.DROP.cooldown;
    }
  }

  /**
   * Picks what drops: the kind by `DROP.weights`, then the weapon type for a weapon drop.
   * @returns {{kind: 'health' | 'shield' | 'weapon', type?: string} | null}
   */
  #rollDrop() {
    const { weights, mainWeapons, secondaryWeapons } = CONFIG.DROP;
    const kinds = Object.keys(weights);
    let roll = Phaser.Math.RND.frac() * kinds.reduce((sum, kind) => sum + weights[kind], 0);
    let kind = kinds[kinds.length - 1];
    for (let i = 0; i < kinds.length; i += 1) {
      roll -= weights[kinds[i]];
      if (roll < 0) {
        kind = kinds[i];
        break;
      }
    }

    if (kind === 'health' || kind === 'shield') {
      return { kind };
    }
    const types = kind === 'secondary' ? secondaryWeapons : mainWeapons;
    return types.length > 0 ? { kind: 'weapon', type: Phaser.Math.RND.pick(types) } : null;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {{kind: string, type?: string}} drop
   * @returns {void}
   */
  #spawn(x, y, drop) {
    /** @type {Phaser.Physics.Arcade.Sprite | null} */
    const pickup = this.#group.getFirstDead();
    if (!pickup) {
      return;
    }
    const size = CONFIG.PICKUPS.bodySize;
    pickup.enableBody(true, x, y, true, true);
    pickup.setTexture('weapons', `box_${drop.kind === 'weapon' ? drop.type : drop.kind}`);
    pickup.setScale(CONFIG.PICKUPS.scale).setAlpha(1).setAngle(0);
    pickup.body.setSize(size, size, true);
    pickup.setVelocity(0, CONFIG.PICKUPS.fallSpeed);
    pickup.setData({ age: 0, kind: drop.kind, type: drop.type });
  }

  /**
   * @param {Phaser.Physics.Arcade.Sprite} pickup
   * @returns {void}
   */
  #collect(pickup) {
    if (!pickup.active || !this.#player.active) {
      return;
    }
    pickup.disableBody(true, true);
    this.#eventBusComponent.emit(CUSTOM_EVENTS.PICKUP_COLLECTED, {
      kind: pickup.getData('kind'),
      type: pickup.getData('type'),
    });
  }

  /**
   * @returns {void}
   */
  #removeListeners() {
    this.#scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.#eventBusComponent.off(CUSTOM_EVENTS.ENEMY_DESTROYED, this.#onEnemyDestroyed, this);
  }
}
