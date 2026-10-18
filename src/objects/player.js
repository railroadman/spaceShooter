import { ColliderComponent } from '../components/collider/collider-component.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../components/events/event-bus-component.js';
import { HealthComponent } from '../components/health/health-component.js';
import { KeyboardInputComponent } from '../components/input/keyboard-input-component.js';
import { PlayerHorizontalMovementComponent } from '../components/movement/player-horizontal-movement-component.js';
import { PlayerVerticalMovementComponent } from '../components/movement/player-vertical-movement-component.js';
import { PlayerLoadoutComponent } from '../components/weapon/player-loadout-component.js';
import { WeaponComponent } from '../components/weapon/weapon-component.js';
import * as CONFIG from '../config.js';
import { ShieldEffect } from './shield-effect.js';
import { getTextStyle } from './ui/ui-style.js';

/**
 * Used to represent the players ship in our game. This class is responsible
 * for constructing all of the required components for our Player ship.
 */
export class Player extends Phaser.GameObjects.Container {
  /** @type {KeyboardInputComponent} */
  #keyboardInputComponent;
  /** @type {HealthComponent} */
  #healthComponent;
  /** @type {WeaponComponent} */
  #weaponComponent;
  /** @type {WeaponComponent} */
  #secondaryWeaponComponent;
  /** @type {PlayerLoadoutComponent} */
  #loadoutComponent;
  /** @type {PlayerHorizontalMovementComponent} */
  #horizontalMovementComponent;
  /** @type {PlayerVerticalMovementComponent} */
  #verticalMovementComponent;
  /** @type {ColliderComponent} */
  #colliderComponent;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {boolean} */
  #isThrusting = false;
  /** @type {number} ms of invulnerability left */
  #invulnerableTime = 0;
  /** @type {number} life on the last frame, a drop starts the hit flash */
  #lastLife = CONFIG.PLAYER_HEALTH;
  /** @type {number} ms of hit flash left */
  #hitFlashTime = 0;
  /** @type {Phaser.GameObjects.Sprite} */
  #shipSprite;
  /** @type {Phaser.GameObjects.Sprite} */
  #shipEngineSprite;
  /** @type {Phaser.GameObjects.Sprite} */
  #shipEngineThrusterSprite;

  /**
   * @param {Phaser.Scene} scene
   * @param {EventBusComponent} eventBusComponent
   */
  constructor(scene, eventBusComponent) {
    super(scene, scene.scale.width / 2, scene.scale.height - CONFIG.PLAYER_SPAWN_OFFSET_Y, []);
    this.#eventBusComponent = eventBusComponent;

    // add game object to scene and enabled physics body
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    this.body.setSize(CONFIG.PLAYER_BODY_SIZE, CONFIG.PLAYER_BODY_SIZE);
    this.body.setOffset(-CONFIG.PLAYER_BODY_SIZE / 2, -CONFIG.PLAYER_BODY_SIZE / 2);
    this.body.setCollideWorldBounds(true);
    this.setDepth(CONFIG.PLAYER_DEPTH);

    this.#shipSprite = scene.add.sprite(0, 0, 'ship');
    this.#shipEngineSprite = scene.add.sprite(0, 0, 'ship_engine');
    this.#shipEngineThrusterSprite = scene.add.sprite(0, 0, 'ship_engine_thruster');
    this.#shipEngineThrusterSprite.play('ship_engine_thruster').setBlendMode(Phaser.BlendModes.ADD);
    this.add([this.#shipEngineThrusterSprite, this.#shipEngineSprite, this.#shipSprite]);

    this.#keyboardInputComponent = new KeyboardInputComponent(this.scene);
    this.#horizontalMovementComponent = new PlayerHorizontalMovementComponent(
      this,
      this.#keyboardInputComponent,
      {
        velocity: CONFIG.PLAYER_MOVEMENT_HORIZONTAL_VELOCITY,
        maxVelocity: CONFIG.COMPONENT_MOVEMENT_HORIZONTAL_MAX_VELOCITY,
      }
    );
    this.#verticalMovementComponent = new PlayerVerticalMovementComponent(
      this,
      this.#keyboardInputComponent,
      {
        velocity: CONFIG.PLAYER_MOVEMENT_VERTICAL_VELOCITY,
        maxVelocity: CONFIG.COMPONENT_MOVEMENT_VERTICAL_MAX_VELOCITY,
      }
    );
    const startWeapon = PlayerLoadoutComponent.startWeapon();
    this.#weaponComponent = new WeaponComponent(
      this,
      this.#keyboardInputComponent,
      PlayerLoadoutComponent.createBulletConfig(startWeapon.type, startWeapon.level),
      this.#eventBusComponent
    );
    this.#secondaryWeaponComponent = new WeaponComponent(
      this,
      this.#keyboardInputComponent,
      PlayerLoadoutComponent.createBulletConfig(PlayerLoadoutComponent.secondaryType(), 1),
      this.#eventBusComponent
    );
    this.#loadoutComponent = new PlayerLoadoutComponent(
      this.scene,
      this.#weaponComponent,
      this.#eventBusComponent,
      this.#secondaryWeaponComponent
    );
    this.#healthComponent = new HealthComponent(CONFIG.PLAYER_HEALTH);
    this.#colliderComponent = new ColliderComponent(this.#healthComponent, this.#eventBusComponent);
    new ShieldEffect(this.scene, this, this.#eventBusComponent);

    this.#hide();

    // register custom events
    this.#eventBusComponent.on(CUSTOM_EVENTS.PLAYER_SPAWN, this.#spawn, this);
    this.#eventBusComponent.on(CUSTOM_EVENTS.EXTRA_LIFE, this.#showExtraLife, this);
    this.#eventBusComponent.on(CUSTOM_EVENTS.PICKUP_COLLECTED, this.#onPickupCollected, this);

    // handle automatic call to update
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.once(
      Phaser.GameObjects.Events.DESTROY,
      () => {
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      },
      this
    );
  }

  /** @type {ColliderComponent} */
  get colliderComponent() {
    return this.#colliderComponent;
  }

  /** @type {HealthComponent} */
  get healthComponent() {
    return this.#healthComponent;
  }

  /** @type {Phaser.GameObjects.Group} */
  get weaponGameObjectGroup() {
    return this.#weaponComponent.bulletGroup;
  }

  /** @type {Phaser.GameObjects.Group} */
  get secondaryWeaponGameObjectGroup() {
    return this.#secondaryWeaponComponent.bulletGroup;
  }

  /** @type {PlayerLoadoutComponent} */
  get loadoutComponent() {
    return this.#loadoutComponent;
  }

  /** @type {WeaponComponent} */
  get weaponComponent() {
    return this.#weaponComponent;
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    if (!this.active) {
      return;
    }

    if (this.#healthComponent.isDead) {
      this.#hide();
      this.setVisible(true);
      this.#shipSprite.clearTint();
      this.#shipSprite.play({
        key: 'explosion',
      });
      this.#eventBusComponent.emit(CUSTOM_EVENTS.PLAYER_DESTROYED);
      return;
    }

    // 4 damage frames, one per quarter of the health lost
    const lost = 1 - this.#healthComponent.life / CONFIG.PLAYER_HEALTH;
    this.#shipSprite.setFrame(Math.min(3, Math.floor(lost * 4)).toString(10));
    this.#updateHitFlash(dt);
    this.#colliderComponent.update(dt);
    this.#updateInvulnerability(dt);
    this.#keyboardInputComponent.update();
    this.#updateThrust();
    this.#horizontalMovementComponent.update();
    this.#verticalMovementComponent.update();
    this.#weaponComponent.update(dt);
    if (this.#loadoutComponent.hasSecondary) {
      this.#secondaryWeaponComponent.update(dt);
    }
  }

  /**
   * Applies a collected pickup to the ship and tells the player about it with a popup.
   * @param {{kind: 'health' | 'shield' | 'weapon', type?: string}} pickup
   * @returns {void}
   */
  #onPickupCollected(pickup) {
    if (!this.active) {
      return;
    }
    const texts = CONFIG.PICKUPS.texts;
    if (pickup.kind === 'health') {
      this.#healthComponent.heal(CONFIG.PLAYER_HEALTH * CONFIG.HEALTH_PICKUP_HEAL_PERCENT);
      this.#showPopup(`+${Math.round(CONFIG.HEALTH_PICKUP_HEAL_PERCENT * 100)}%`);
    } else if (pickup.kind === 'shield') {
      this.#colliderComponent.addShield(CONFIG.SHIELD.charges, CONFIG.SHIELD.hitGrace);
      this.#showPopup(texts.shield);
    } else if (pickup.type) {
      this.#loadoutComponent.collect(pickup.type);
      this.#showPopup(`${pickup.type.toUpperCase()} ${texts.levelPrefix}${this.#loadoutComponent.levelOf(pickup.type)}`);
    }
  }

  /**
   * Floats the extra life text up from the ship.
   * @returns {void}
   */
  #showExtraLife() {
    this.#showPopup(CONFIG.UI_EXTRA_LIFE_TEXT);
  }

  /**
   * Floats a short text up from the ship.
   * @param {string} message
   * @returns {void}
   */
  #showPopup(message) {
    const text = this.scene.add
      .text(this.x, this.y - CONFIG.UI_POPUP_EDGE_MARGIN, message, getTextStyle(this.scene, 'popup'))
      .setOrigin(0.5)
      .setDepth(CONFIG.UI_POPUP_DEPTH);
    this.scene.tweens.add({
      targets: text,
      y: text.y - CONFIG.UI_POPUP_RISE,
      alpha: 0,
      duration: CONFIG.UI_POPUP_DURATION,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Fills the ship red for a moment when it loses health, so a hit is easy to notice.
   * @param {number} dt
   * @returns {void}
   */
  #updateHitFlash(dt) {
    const life = this.#healthComponent.life;
    if (life < this.#lastLife) {
      this.#hitFlashTime = CONFIG.PLAYER_HIT_FLASH.duration;
      this.#shipSprite.setTintFill(CONFIG.PLAYER_HIT_FLASH.color);
    }
    this.#lastLife = life;
    if (this.#hitFlashTime <= 0) {
      return;
    }
    this.#hitFlashTime -= dt;
    if (this.#hitFlashTime <= 0) {
      this.#shipSprite.clearTint();
    }
  }

  /**
   * Counts down post-spawn invulnerability and blinks the ship while it lasts.
   * @param {number} dt
   * @returns {void}
   */
  #updateInvulnerability(dt) {
    if (this.#invulnerableTime <= 0) {
      return;
    }
    this.#invulnerableTime -= dt;
    if (this.#invulnerableTime <= 0) {
      this.#colliderComponent.isInvulnerable = false;
      this.setAlpha(1);
      return;
    }
    const phase = Math.floor(this.#invulnerableTime / CONFIG.PLAYER_BLINK_INTERVAL) % 2;
    this.setAlpha(phase === 0 ? CONFIG.PLAYER_BLINK_ALPHA : 1);
  }

  /**
   * Tells listeners (e.g. the space background) when forward thrust starts or stops.
   * @returns {void}
   */
  #updateThrust() {
    const isThrusting = this.#keyboardInputComponent.upIsDown;
    if (isThrusting === this.#isThrusting) {
      return;
    }
    this.#isThrusting = isThrusting;
    this.#eventBusComponent.emit(CUSTOM_EVENTS.PLAYER_THRUST, isThrusting);
  }

  /**
   * @returns {void}
   */
  #hide() {
    this.setActive(false);
    this.setVisible(false);
    this.#shipEngineSprite.setVisible(false);
    this.#shipEngineThrusterSprite.setVisible(false);
    
  }

  /**
   * @returns {void}
   */
  #spawn() {
    this.setActive(true);
    this.setVisible(true);
    this.#shipEngineSprite.setVisible(true);
    this.#shipEngineThrusterSprite.setVisible(true);
    this.#shipSprite.setTexture('ship', 0);
    this.#healthComponent.reset();
    this.#lastLife = this.#healthComponent.life;
    this.#hitFlashTime = 0;
    this.#shipSprite.clearTint();
    this.#colliderComponent.clearShield();
    this.#invulnerableTime = CONFIG.PLAYER_INVULNERABLE_DURATION;
    this.#colliderComponent.isInvulnerable = true;
    this.setPosition(this.scene.scale.width / 2, this.scene.scale.height - CONFIG.PLAYER_SPAWN_OFFSET_Y);
    
  }
}
