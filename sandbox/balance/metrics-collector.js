// Collects the numbers of one run. Fed by run.js: game events, player hit wrappers and a once-per-second sample.
import * as CONFIG from '../../src/config.js';

const SCORES = {
  ScoutEnemy: CONFIG.ENEMY_SCOUT_SCORE,
  FighterEnemy: CONFIG.ENEMY_FIGHTER_SCORE,
  BossEnemy: CONFIG.BOSS.score,
};

/**
 * @param {number} ms game time
 * @returns {number} index of the difficulty stage
 */
export function stageAt(ms) {
  let index = 0;
  CONFIG.DIFFICULTY.stages.forEach((stage, i) => {
    if (ms + CONFIG.DIFFICULTY.debug.startAt >= stage.from) {
      index = i;
    }
  });
  return index;
}

function add(object, key, amount = 1) {
  object[key] = (object[key] ?? 0) + amount;
}

export class MetricsCollector {
  /** @param {boolean} keepTimeline */
  constructor(keepTimeline) {
    this.keepTimeline = keepTimeline;
    this.time = 0;
    this.kills = {};
    this.score = 0;
    this.shots = 0;
    this.hits = 0;
    this.deaths = [];
    this.damage = { projectileHits: 0, projectileLife: 0, rams: 0, shieldAbsorbed: 0, bySource: {} };
    this.pickups = { spawned: 0, collected: {} };
    this.weapon = [];
    this.extraLives = 0;
    this.boss = { warningAt: null, spawnAt: null, defeatedAt: null, phases: [], healthWhenPlayerDied: [] };
    this.timeline = [];
    this.maxEnemies = 0;
    this.lastBossHealth = 1;
    this.nextSampleAt = 1000;
  }

  /**
   * @param {string} event
   * @param {unknown[]} args
   * @returns {void}
   */
  onEvent(event, args) {
    const t = Math.round(this.time);
    switch (event) {
      case 'ENEMY_DESTROYED': {
        const name = args[0]?.constructor?.name ?? 'unknown';
        add(this.kills, name);
        this.score += SCORES[name] ?? 0;
        break;
      }
      case 'SHIP_SHOOT':
        this.shots += 1;
        break;
      case 'BULLET_HIT':
        if (args[0]?.enemy) {
          this.hits += 1;
        }
        break;
      case 'PLAYER_DESTROYED':
        this.deaths.push({ t, stage: stageAt(this.time) });
        if (this.boss.spawnAt !== null && this.boss.defeatedAt === null) {
          this.boss.healthWhenPlayerDied.push(Number(this.lastBossHealth.toFixed(3)));
        }
        break;
      case 'EXTRA_LIFE':
        this.extraLives += 1;
        break;
      case 'WEAPON_CHANGED':
        this.weapon.push({ t, slot: args[0].slot, type: args[0].type, level: args[0].level });
        break;
      case 'PICKUP_COLLECTED':
        add(this.pickups.collected, args[0].kind === 'weapon' ? `weapon:${args[0].type}` : args[0].kind);
        break;
      case 'BOSS_WARNING':
        this.boss.warningAt = t;
        break;
      case 'BOSS_SPAWN':
        this.boss.spawnAt = t;
        break;
      case 'BOSS_PHASE_CHANGED':
        this.boss.phases.push({ t, index: args[0] });
        break;
      case 'BOSS_HEALTH_CHANGED':
        this.lastBossHealth = args[0];
        break;
      case 'BOSS_DEFEATED':
        this.boss.defeatedAt = t;
        break;
      default:
    }
  }

  /**
   * @param {'projectile'|'ram'} kind
   * @param {string} source enemy class and bullet frame
   * @param {number} lifeLost
   * @param {boolean} absorbed the shield took the hit
   * @returns {void}
   */
  onPlayerHit(kind, source, lifeLost, absorbed) {
    if (absorbed) {
      this.damage.shieldAbsorbed += 1;
      return;
    }
    if (kind === 'ram') {
      this.damage.rams += 1;
      return;
    }
    if (lifeLost <= 0) {
      return;
    }
    this.damage.projectileHits += 1;
    this.damage.projectileLife += lifeLost;
    const entry = (this.damage.bySource[source] ??= { hits: 0, life: 0 });
    entry.hits += 1;
    entry.life += lifeLost;
  }

  /** @returns {void} */
  onPickupSpawned() {
    this.pickups.spawned += 1;
  }

  /**
   * @param {number} dt
   * @param {() => {hp: number, lives: number, enemies: number, enemyBullets: number, shield: number, weapon: string, level: number}} getSnapshot called once per game second
   * @returns {void}
   */
  step(dt, getSnapshot) {
    this.time += dt;
    if (this.time < this.nextSampleAt) {
      return;
    }
    this.nextSampleAt += 1000;
    const snapshot = getSnapshot();
    this.maxEnemies = Math.max(this.maxEnemies, snapshot.enemies);
    if (this.keepTimeline) {
      this.timeline.push({ t: Math.round(this.time), ...snapshot });
    }
  }

  /**
   * @param {'win'|'dead'|'timeout'} outcome
   * @returns {object} the result of the run
   */
  finish(outcome) {
    const endedAt = Math.round(this.time);
    const startAt = CONFIG.DIFFICULTY.debug.startAt;
    const stages = CONFIG.DIFFICULTY.stages;
    const stageTimeMs = stages.map((stage, i) => {
      const from = Math.max(0, stage.from - startAt);
      const to = i + 1 < stages.length ? stages[i + 1].from - startAt : Infinity;
      return Math.max(0, Math.min(endedAt, to) - from);
    });
    const { spawnAt, defeatedAt } = this.boss;
    return {
      outcome,
      timeMs: endedAt,
      score: this.score,
      livesLost: this.deaths.length,
      extraLives: this.extraLives,
      deaths: this.deaths,
      kills: this.kills,
      shots: this.shots,
      hits: this.hits,
      damage: this.damage,
      pickups: this.pickups,
      weapon: this.weapon,
      boss: { ...this.boss, reached: spawnAt !== null, timeToKill: spawnAt !== null && defeatedAt !== null ? defeatedAt - spawnAt : null },
      stageTimeMs,
      maxEnemies: this.maxEnemies,
      timeline: this.keepTimeline ? this.timeline : undefined,
    };
  }
}
