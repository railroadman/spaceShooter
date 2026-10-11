import { ColliderComponent } from '../components/collider/collider-component.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../components/events/event-bus-component.js';
import { HealthComponent } from '../components/health/health-component.js';
import { KeyboardInputComponent } from '../components/input/keyboard-input-component.js';
import { PlayerHorizontalMovementComponent } from '../components/movement/player-horizontal-movement-component.js';
import { PlayerVerticalMovementComponent } from '../components/movement/player-vertical-movement-component.js';
import { WeaponComponent } from '../components/weapon/weapon-component.js';
import * as CONFIG from '../config.js';
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
    this.#weaponComponent = new WeaponComponent(
      this,
      this.#keyboardInputComponent,
      {
        speed: CONFIG.PLAYER_BULLET_SPEED,
        interval: CONFIG.PLAYER_BULLET_INTERVAL,
        lifespan: CONFIG.PLAYER_BULLET_LIFESPAN,
        maxCount: CONFIG.PLAYER_BULLET_MAX_COUNT,
        yOffset: CONFIG.PLAYER_BULLET_Y_OFFSET,
        flipY: false,
      },
      this.#eventBusComponent
    );
    this.#healthComponent = new HealthComponent(CONFIG.PLAYER_HEALTH);
    this.#colliderComponent = new ColliderComponent(this.#healthComponent, this.#eventBusComponent);

    this.#hide();

    // register custom events
    this.#eventBusComponent.on(CUSTOM_EVENTS.PLAYER_SPAWN, this.#spawn, this);
    this.#eventBusComponent.on(CUSTOM_EVENTS.EXTRA_LIFE, this.#showExtraLife, this);

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
      this.#shipSprite.play({
        key: 'explosion',
      });
      this.#eventBusComponent.emit(CUSTOM_EVENTS.PLAYER_DESTROYED);
      return;
    }

    this.#shipSprite.setFrame((CONFIG.PLAYER_HEALTH - this.#healthComponent.life).toString(10));
    this.#updateInvulnerability(dt);
    this.#keyboardInputComponent.update();
    this.#updateThrust();
    this.#horizontalMovementComponent.update();
    this.#verticalMovementComponent.update();
    this.#weaponComponent.update(dt);
  }

  /**
   * Floats the extra life text up from the ship.
   * @returns {void}
   */
  #showExtraLife() {
    const text = this.scene.add
      .text(this.x, this.y - CONFIG.UI_POPUP_EDGE_MARGIN, CONFIG.UI_EXTRA_LIFE_TEXT, getTextStyle(this.scene, 'popup'))
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
    this.#invulnerableTime = CONFIG.PLAYER_INVULNERABLE_DURATION;
    this.#colliderComponent.isInvulnerable = true;
    this.setPosition(this.scene.scale.width / 2, this.scene.scale.height - CONFIG.PLAYER_SPAWN_OFFSET_Y);
    
  }
}
