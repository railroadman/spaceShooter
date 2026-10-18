import { ColliderComponent } from '../../components/collider/collider-component.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../../components/events/event-bus-component.js';
import { HealthComponent } from '../../components/health/health-component.js';
import { BotScoutInputComponent } from '../../components/input/bot-scout-input-component.js';
import { HorizontalMovementComponent } from '../../components/movement/horizontal-movement-component.js';
import { VerticalMovementComponent } from '../../components/movement/vertical-movement-component.js';
import { WeaponComponent } from '../../components/weapon/weapon-component.js';
import { DifficultyComponent } from '../../components/difficulty/difficulty-component.js';
import * as CONFIG from '../../config.js';

export class ScoutEnemy extends Phaser.GameObjects.Container {
  #isInitialized;
  #inputComponent;
  #horizontalMovementComponent;
  #verticalMovementComponent;
  #healthComponent;
  #colliderComponent;
  #eventBusComponent;
  #difficulty;
  #player;
  #shipSprite;
  #shipEngineSprite;
  #weaponComponent;

  constructor(scene, x, y) {
    super(scene, x, y, []);

    this.#isInitialized = false;
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    this.body.setSize(CONFIG.ENEMY_BODY_SIZE, CONFIG.ENEMY_BODY_SIZE);
    this.body.setOffset(-CONFIG.ENEMY_BODY_SIZE / 2, -CONFIG.ENEMY_BODY_SIZE / 2);

    this.#shipSprite = scene.add.sprite(0, 0, 'scout', 0);
    this.#shipEngineSprite = scene.add.sprite(0, 0, 'scout_engine').setFlipY(true).setBlendMode(Phaser.BlendModes.ADD);
    this.#shipEngineSprite.play('scout_engine');
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

  /** @type {string} */
  get shipAssetKey() {
    return 'scout';
  }

  /** @type {string} */
  get shipDestroyedAnimationKey() {
    return 'scout_destroy';
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
    this.#inputComponent = new BotScoutInputComponent(player);
    this.#horizontalMovementComponent = new HorizontalMovementComponent(
      this,
      this.#inputComponent,
      CONFIG.ENEMY_SCOUT_MOVEMENT_HORIZONTAL_VELOCITY
    );
    this.#verticalMovementComponent = new VerticalMovementComponent(
      this,
      this.#inputComponent,
      CONFIG.ENEMY_SCOUT_MOVEMENT_VERTICAL_VELOCITY
    );
    this.#weaponComponent = new WeaponComponent(
      this,
      this.#inputComponent,
      this.#createBulletConfig(),
      this.#eventBusComponent
    );
    this.#healthComponent = new HealthComponent(CONFIG.ENEMY_SCOUT_HEALTH);
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
      'scout',
      {
        speed: CONFIG.ENEMY_SCOUT_BULLET_SPEED,
        interval: CONFIG.ENEMY_SCOUT_BULLET_INTERVAL,
        lifespan: CONFIG.ENEMY_SCOUT_BULLET_LIFESPAN,
        maxCount: CONFIG.ENEMY_SCOUT_BULLET_MAX_COUNT,
        damage: CONFIG.ENEMY_BULLET_DAMAGE,
        hitEffect: CONFIG.ENEMY_BULLET_HIT_EFFECT,
        yOffset: CONFIG.ENEMY_BULLET_Y_OFFSET,
        flipY: true,
        aimTarget: this.#player,
        maxAimAngle: CONFIG.ENEMY_SCOUT_AIM_MAX_ANGLE,
        burst: { count: CONFIG.ENEMY_SCOUT_BURST_COUNT, delay: CONFIG.ENEMY_SCOUT_BURST_DELAY },
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
    this.#healthComponent.setStartingLife(this.#difficulty.enemyHealth(CONFIG.ENEMY_SCOUT_HEALTH));
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
    this.#horizontalMovementComponent.update();
    this.#verticalMovementComponent.update();
    this.#weaponComponent.update(dt);
    
    const halfWidth = this.body.width / 2;
    this.x = Phaser.Math.Clamp(this.x, halfWidth, this.scene.scale.width - halfWidth);
  }
}
