import Phaser from '../../lib/phaser.js';
import { ColliderComponent } from '../../components/collider/collider-component.js';
import { CUSTOM_EVENTS, EventBusComponent } from '../../components/events/event-bus-component.js';
import { HealthComponent } from '../../components/health/health-component.js';
import { BossBrainComponent, BossTriggerInput } from '../../components/boss/boss-brain-component.js';
import { WeaponComponent } from '../../components/weapon/weapon-component.js';
import * as CONFIG from '../../config.js';

/**
 * The first boss. A big ship with several weapons whose behavior (phases, movement, attacks)
 * is read from `CONFIG.BOSS`. Created once by the `BossSpawnerComponent`.
 */
export class BossEnemy extends Phaser.GameObjects.Container {
  /** @type {boolean} */
  #isInitialized = false;
  /** @type {boolean} */
  #isDying = false;
  /** @type {Phaser.GameObjects.Sprite} */
  #shipSprite;
  /** @type {EventBusComponent} */
  #eventBusComponent;
  /** @type {HealthComponent} */
  #healthComponent;
  /** @type {ColliderComponent} */
  #colliderComponent;
  /** @type {BossBrainComponent} */
  #brainComponent;
  /** @type {{trigger: BossTriggerInput, weapon: WeaponComponent}[]} */
  #weapons = [];
  /** @type {number} */
  #lastLife = 0;
  /** @type {number} ms of the white flash that is left */
  #flashTime = 0;
  /** @type {number | null} tint of the current phase */
  #phaseTint = null;

  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    super(scene, x, y, []);

    const config = CONFIG.BOSS.sprite;
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    this.body.setSize(config.bodyWidth, config.bodyHeight);
    this.body.setOffset(-config.bodyWidth / 2, -config.bodyHeight / 2 + config.bodyOffsetY);
    this.setDepth(config.depth);

    this.#shipSprite = scene.add.sprite(0, 0, config.key).setScale(config.scale).setFlipY(config.flipY);
    this.add(this.#shipSprite);

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

  /** @type {WeaponComponent[]} */
  get weaponComponents() {
    return this.#weapons.map((item) => item.weapon);
  }

  /** @type {number} remaining health, 1 = full, 0 = dead */
  get healthFraction() {
    return this.#healthComponent.life / CONFIG.BOSS.health;
  }

  /** @type {string} */
  get shipAssetKey() {
    return 'scout_destroy';
  }

  /** @type {string} */
  get shipDestroyedAnimationKey() {
    return 'explosion';
  }

  /**
   * @param {EventBusComponent} eventBusComponent
   * @param {import('../player.js').Player} player
   * @returns {void}
   */
  init(eventBusComponent, player) {
    this.#eventBusComponent = eventBusComponent;
    this.#healthComponent = new HealthComponent(CONFIG.BOSS.health);
    this.#colliderComponent = new ColliderComponent(this.#healthComponent, eventBusComponent);
    this.#lastLife = CONFIG.BOSS.health;

    /** @type {Object<string, BossTriggerInput>} */
    const triggers = {};
    Object.entries(CONFIG.BOSS.weapons).forEach(([id, config]) => {
      const trigger = new BossTriggerInput();
      const weapon = new WeaponComponent(
        this,
        trigger,
        {
          speed: config.speed,
          interval: 0,
          lifespan: config.lifespan,
          maxCount: config.maxCount,
          yOffset: 0,
          flipY: true,
          angles: config.angles,
          burst: config.burst,
          muzzles: config.muzzles,
          aimTarget: config.aim ? player : undefined,
          maxAimAngle: config.maxAimAngle,
        },
        eventBusComponent
      );
      triggers[id] = trigger;
      this.#weapons.push({ trigger, weapon });
    });

    this.#brainComponent = new BossBrainComponent(this, player, triggers, (index, phase, isFirst) =>
      this.#onPhaseChange(index, phase, isFirst)
    );
    this.#isInitialized = true;
  }

  /**
   * @param {DOMHighResTimeStamp} ts
   * @param {number} dt
   * @returns {void}
   */
  update(ts, dt) {
    if (!this.#isInitialized || !this.active || this.#isDying) {
      return;
    }

    if (this.#healthComponent.isDead) {
      this.#die();
      return;
    }

    this.#brainComponent.update(dt);
    this.#colliderComponent.isInvulnerable = this.#brainComponent.isInvulnerable;
    this.#weapons.forEach((item) => {
      item.weapon.update(dt);
      item.trigger.release();
    });
    this.#trackHealth();
    this.#updateFlash(dt);
  }

  /**
   * @param {number} index
   * @param {{tint: number | null, barColor: number, clearBullets: boolean}} phase
   * @param {boolean} isFirst
   * @returns {void}
   */
  #onPhaseChange(index, phase, isFirst) {
    this.#phaseTint = phase.tint;
    if (!isFirst) {
      this.#flashTime = CONFIG.BOSS.transition.flashDuration;
      if (phase.clearBullets) {
        this.#clearBullets();
      }
    }
    this.#applyTint();
    this.#eventBusComponent.emit(CUSTOM_EVENTS.BOSS_PHASE_CHANGED, index, phase);
  }

  /**
   * Tells the UI when the boss lost health and flashes the ship for a moment.
   * @returns {void}
   */
  #trackHealth() {
    const life = this.#healthComponent.life;
    if (life === this.#lastLife) {
      return;
    }
    this.#lastLife = life;
    this.#flashTime = Math.max(this.#flashTime, CONFIG.BOSS.hitFlashDuration);
    this.#applyTint();
    this.#eventBusComponent.emit(CUSTOM_EVENTS.BOSS_HEALTH_CHANGED, this.healthFraction);
  }

  /**
   * @param {number} dt
   * @returns {void}
   */
  #updateFlash(dt) {
    if (this.#flashTime <= 0) {
      return;
    }
    this.#flashTime -= dt;
    if (this.#flashTime <= 0) {
      this.#applyTint();
    }
  }

  /**
   * @returns {void}
   */
  #applyTint() {
    if (this.#flashTime > 0) {
      this.#shipSprite.setTintFill(CONFIG.BOSS.flashColor);
      return;
    }
    this.#shipSprite.clearTint();
    if (this.#phaseTint !== null) {
      this.#shipSprite.setTint(this.#phaseTint);
    }
  }

  /**
   * @returns {void}
   */
  #clearBullets() {
    this.#weapons.forEach((item) => {
      item.weapon.bulletGroup.getChildren().forEach((bullet) => {
        if (bullet.active) {
          item.weapon.destroyBullet(/** @type {Phaser.Types.Physics.Arcade.SpriteWithDynamicBody} */ (bullet));
        }
      });
    });
  }

  /**
   * Stops the boss and plays a series of explosions over its hull, then reports its destruction.
   * @returns {void}
   */
  #die() {
    const death = CONFIG.BOSS.death;
    this.#isDying = true;
    this.#colliderComponent.isInvulnerable = true;
    this.body.setVelocity(0, 0);
    this.#clearBullets();
    this.#flashTime = 0;
    this.#applyTint();

    this.scene.time.addEvent({
      delay: death.explosionInterval,
      repeat: Math.max(0, Math.floor(death.duration / death.explosionInterval) - 1),
      callback: () => this.#explode(),
    });
    this.scene.time.delayedCall(death.duration, () => this.#finishDeath());
  }

  /**
   * @returns {void}
   */
  #explode() {
    const death = CONFIG.BOSS.death;
    const explosion = this.scene.add
      .sprite(
        this.x + Phaser.Math.RND.realInRange(-death.spreadX, death.spreadX),
        this.y + Phaser.Math.RND.realInRange(-death.spreadY, death.spreadY),
        'scout_destroy'
      )
      .setScale(Phaser.Math.RND.realInRange(death.scaleMin, death.scaleMax))
      .setDepth(CONFIG.BOSS.sprite.depth + 1);
    explosion.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => explosion.destroy());
    explosion.play('explosion');
    this.#eventBusComponent.emit(CUSTOM_EVENTS.BOSS_EXPLOSION);
  }

  /**
   * @returns {void}
   */
  #finishDeath() {
    this.scene.cameras.main.shake(CONFIG.BOSS.death.shakeDuration, CONFIG.BOSS.death.shakeIntensity);
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.#eventBusComponent.emit(CUSTOM_EVENTS.ENEMY_DESTROYED, this);
    this.#eventBusComponent.emit(CUSTOM_EVENTS.BOSS_DEFEATED);
  }
}
