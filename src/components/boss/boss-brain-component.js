import Phaser from '../../lib/phaser.js';
import { InputComponent } from '../input/input-component.js';
import {
  ChaseMovementPattern,
  DashMovementPattern,
  WaveMovementPattern,
} from '../movement/movement-patterns.js';
import * as CONFIG from '../../config.js';

/**
 * Input of one boss weapon. The brain presses it for a single update, the weapon fires
 * if its interval allows, then the boss releases it again.
 */
export class BossTriggerInput extends InputComponent {
  /**
   * @returns {void}
   */
  press() {
    this._shoot = true;
  }

  /**
   * @returns {void}
   */
  release() {
    this._shoot = false;
  }
}

/**
 * The "brain" of the boss: flies it in, picks the phase from the remaining health,
 * moves it with the pattern of that phase and fires its weapons on the phase schedule.
 * Everything it does is described by `CONFIG.BOSS`.
 */
export class BossBrainComponent {
  /** @type {import('../../objects/enemies/boss-enemy.js').BossEnemy} */
  #boss;
  /** @type {Phaser.GameObjects.Container} */
  #player;
  /** @type {Object<string, BossTriggerInput>} */
  #triggers;
  /** @type {(index: number, phase: object, isFirst: boolean) => void} */
  #onPhaseChange;
  /** @type {'entry' | 'fight'} */
  #state = 'entry';
  /** @type {number} */
  #phaseIndex = -1;
  /** @type {import('../movement/movement-patterns.js').MovementPattern | null} */
  #pattern = null;
  /** @type {number[]} ms left until the next shot of every attack of the phase */
  #timers = [];
  /** @type {number} ms of invulnerability left after a phase change */
  #transition = 0;
  /** @type {import('../movement/movement-patterns.js').MovementOutput} */
  #output = { axisX: 0, speedScale: 1 };

  /**
   * @param {import('../../objects/enemies/boss-enemy.js').BossEnemy} boss
   * @param {Phaser.GameObjects.Container} player
   * @param {Object<string, BossTriggerInput>} triggers weapon id -> trigger input
   * @param {(index: number, phase: object, isFirst: boolean) => void} onPhaseChange
   */
  constructor(boss, player, triggers, onPhaseChange) {
    this.#boss = boss;
    this.#player = player;
    this.#triggers = triggers;
    this.#onPhaseChange = onPhaseChange;
  }

  /** @type {boolean} true while the boss flies in or switches the phase */
  get isInvulnerable() {
    return this.#state === 'entry' || this.#transition > 0;
  }

  /**
   * @param {number} dt frame time in ms
   * @returns {void}
   */
  update(dt) {
    if (this.#state === 'entry') {
      this.#flyIn();
      return;
    }

    this.#checkPhase();
    this.#move(dt);

    if (this.#transition > 0) {
      this.#transition -= dt;
      return;
    }
    this.#updateAttacks(dt);
  }

  /**
   * Eases the boss down to its hold position, then starts the first phase.
   * @returns {void}
   */
  #flyIn() {
    const entry = CONFIG.BOSS.entry;
    const distance = entry.holdY - this.#boss.y;
    if (distance <= 1) {
      this.#boss.body.setVelocity(0, 0);
      this.#boss.y = entry.holdY;
      this.#state = 'fight';
      this.#startPhase(0, true);
      return;
    }
    this.#boss.body.setVelocity(0, Math.max(entry.minSpeed, distance * entry.gain));
  }

  /**
   * Phases only go forward: a phase ends when the health fraction drops to its `hpTo`.
   * @returns {void}
   */
  #checkPhase() {
    const phases = CONFIG.BOSS.phases;
    const fraction = this.#boss.healthFraction;
    let index = this.#phaseIndex;
    while (index < phases.length - 1 && fraction <= phases[index].hpTo) {
      index += 1;
    }
    if (index !== this.#phaseIndex) {
      this.#startPhase(index, false);
    }
  }

  /**
   * @param {number} index
   * @param {boolean} isFirst
   * @returns {void}
   */
  #startPhase(index, isFirst) {
    const phase = CONFIG.BOSS.phases[index];
    this.#phaseIndex = index;
    this.#pattern = BossBrainComponent.#createPattern(phase.move);
    this.#pattern.reset();
    this.#timers = phase.attacks.map((attack) => attack.firstDelay);
    this.#transition = isFirst ? 0 : CONFIG.BOSS.transition.duration;
    this.#onPhaseChange(index, phase, isFirst);
  }

  /**
   * @param {{type: string}} move
   * @returns {import('../movement/movement-patterns.js').MovementPattern}
   */
  static #createPattern(move) {
    switch (move.type) {
      case 'chase':
        return new ChaseMovementPattern(move.range, move.smoothing);
      case 'dash':
        return new DashMovementPattern(new ChaseMovementPattern(move.range, move.smoothing), move.dash);
      default:
        return new WaveMovementPattern(move.period);
    }
  }

  /**
   * Horizontal speed comes from the pattern axis; vertically the boss is pulled back to its
   * hold position, a dash speed scale below/above 1 pushes it up (wind-up) or down (dive).
   * @param {number} dt
   * @returns {void}
   */
  #move(dt) {
    const move = CONFIG.BOSS.phases[this.#phaseIndex].move;
    const boss = this.#boss;
    this.#pattern.update(dt, boss, this.#player, this.#output);

    const margin = CONFIG.BOSS.sprite.moveMargin;
    const minX = margin;
    const maxX = boss.scene.scale.width - margin;
    let velocityX = this.#output.axisX * move.speed;
    if ((boss.x <= minX && velocityX < 0) || (boss.x >= maxX && velocityX > 0)) {
      velocityX = 0;
    }
    boss.x = Phaser.Math.Clamp(boss.x, minX, maxX);

    const velocityY =
      (CONFIG.BOSS.entry.holdY - boss.y) * move.returnGain + (this.#output.speedScale - 1) * (move.diveSpeed || 0);
    boss.body.setVelocity(velocityX, Phaser.Math.Clamp(velocityY, -CONFIG.BOSS.maxVerticalSpeed, CONFIG.BOSS.maxVerticalSpeed));
  }

  /**
   * @param {number} dt
   * @returns {void}
   */
  #updateAttacks(dt) {
    const attacks = CONFIG.BOSS.phases[this.#phaseIndex].attacks;
    for (let i = 0; i < attacks.length; i += 1) {
      this.#timers[i] -= dt;
      if (this.#timers[i] > 0) {
        continue;
      }
      this.#triggers[attacks[i].weapon].press();
      this.#timers[i] = attacks[i].interval;
    }
  }
}
