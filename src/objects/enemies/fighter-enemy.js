import { ColliderComponent } from '../../components/collider/collider-component.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../../components/events/event-bus-component.js';
import { HealthComponent } from '../../components/health/health-component.js';
import { BotFighterInputComponent } from '../../components/input/bot-fighter-input-component.js';
import { HorizontalMovementComponent } from '../../components/movement/horizontal-movement-component.js';
import { VerticalMovementComponent } from '../../components/movement/vertical-movement-component.js';
import { WeaponComponent } from '../../components/weapon/weapon-component.js';
import { DifficultyComponent } from '../../components/difficulty/difficulty-component.js';
import * as CONFIG from '../../config.js';

/**
 * Used to represent the Fighter enemy ship in our game. This class is responsible
 * for constructing all of the required components for the Fighter enemy ship.
 * @type {import('../../types/typedef.js').Enemy}
 */
export class FighterEnemy extends Phaser.GameObjects.Container {
  /** @type {boolean} */
  #isInitialized;
  /** @type {BotFighterInputComponent} */
  #inputComponent;
  /** @type {VerticalMovementComponent} */
  #verticalMovementComponent;
  /** @type {HorizontalMovementComponent} */
  #horizontalMovementComponent;
  /** @type {HealthComponent} */
  #healthComponent;
  /** @type {ColliderComponent} */
  #colliderComponent;
  /** @type {Phaser.GameObjects.Sprite} */
  #shipSprite;
  /** @type {Phaser.GameObjects.Sprite} */
  #shipEngineSprite;
  /** @type {WeaponComponent} */
  #weaponComponent;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {DifficultyComponent} */
  #difficulty;
  /** @type {import('../../objects/player.js').Player} */
  #player;

  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    super(scene, x, y, []);

    this.#isInitialized = false;
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    this.body.setSize(CONFIG.ENEMY_BODY_SIZE, CONFIG.ENEMY_BODY_SIZE);
    this.body.setOffset(-CONFIG.ENEMY_BODY_SIZE / 2, -CONFIG.ENEMY_BODY_SIZE / 2);

    this.#shipSprite = scene.add.sprite(0, 0, 'fighter', 0);
    this.#shipEngineSprite = scene.add.sprite(0, 0, 'fighter_engine').setFlipY(true).setBlendMode(Phaser.BlendModes.ADD);
    this.#shipEngineSprite.play('fighter_engine');
    this.add([this.#shipEngineSprite, this.#shipSprite]);

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

  /** @type {string} */
  get shipAssetKey() {
    return 'fighter';
  }

  /** @type {string} */
  get shipDestroyedAnimationKey() {
    return 'fighter_destroy';
  }

  /**
   * @param {EventBusComponent} eventBusComponent
   * @param {import('../../objects/player.js').Player} player
   * @param {DifficultyComponent} difficulty
   */
  init(eventBusComponent, player, difficulty) {
    this.#eventBusComponent = eventBusComponent;
    this.#difficulty = difficulty;
    this.#player = player;
    this.#inputComponent = new BotFighterInputComponent(player);
    this.#verticalMovementComponent = new VerticalMovementComponent(
      this,
      this.#inputComponent,
      CONFIG.ENEMY_FIGHTER_MOVEMENT_VERTICAL_VELOCITY
    );
    this.#horizontalMovementComponent = new HorizontalMovementComponent(
      this,
      this.#inputComponent,
      CONFIG.ENEMY_FIGHTER_MOVEMENT_HORIZONTAL_VELOCITY
    );
    this.#weaponComponent = new WeaponComponent(
      this,
      this.#inputComponent,
      this.#createBulletConfig(),
      this.#eventBusComponent
    );
    this.#healthComponent = new HealthComponent(CONFIG.ENEMY_FIGHTER_HEALTH);
    this.#colliderComponent = new ColliderComponent(this.#healthComponent, this.#eventBusComponent);
    this.#eventBusComponent.emit(CUSTOM_EVENTS.ENEMY_INIT, this);
    this.#isInitialized = true;
  }

  /**
   * Bullet settings of the current difficulty stage.
   * @returns {import('../../components/weapon/weapon-component.js').BulletConfig}
   */
  #createBulletConfig() {
    return this.#difficulty.enemyWeapon(
      'fighter',
      {
        speed: CONFIG.ENEMY_FIGHTER_BULLET_SPEED,
        interval: CONFIG.ENEMY_FIGHTER_BULLET_INTERVAL,
        lifespan: CONFIG.ENEMY_FIGHTER_BULLET_LIFESPAN,
        maxCount: CONFIG.ENEMY_FIGHTER_BULLET_MAX_COUNT,
        yOffset: CONFIG.ENEMY_BULLET_Y_OFFSET,
        flipY: true,
        angles: CONFIG.ENEMY_FIGHTER_SPREAD_ANGLES,
      },
      this.#player
    );
  }

  /**
   * @returns {void}
   */
  reset() {
    this.setActive(true);
    this.setVisible(true);
    this.#healthComponent.setStartingLife(this.#difficulty.enemyHealth(CONFIG.ENEMY_FIGHTER_HEALTH));
    this.#healthComponent.reset();
    this.#weaponComponent.setConfig(this.#createBulletConfig());
    this.#inputComponent.reset();
    this.#verticalMovementComponent.reset();
    this.#horizontalMovementComponent.reset();
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    if (!this.#isInitialized) {
      return;
    }

    if (!this.active) {
      return;
    }

    if (this.#healthComponent.isDead) {
      this.setActive(false);
      this.setVisible(false);
      this.#eventBusComponent.emit(CUSTOM_EVENTS.ENEMY_DESTROYED, this);
    }

    this.#inputComponent.update(dt, this);
    this.#verticalMovementComponent.update();
    this.#horizontalMovementComponent.update();
    this.#weaponComponent.update(dt);
  }
}