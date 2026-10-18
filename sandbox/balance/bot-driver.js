// Bot player: reads the world from the scene and presses keys by emitting keyboard events (the game is not touched).
// Every `reactionMs` it picks the best of 9 moves: it scores each by the danger along the predicted path,
// the distance to the aim point under the nearest enemy, pickups worth flying to and the distance to its home row.
import { BOT_PROFILES } from './bot-profiles.js';

const KEYS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', fire: 'Space' };
const SAMPLES = 6;

/**
 * @param {number} seed
 * @returns {() => number} small deterministic random generator, separate from the game one
 */
function createRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export class BotDriver {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} profileName
   * @param {number} seed
   * @param {{speed: number, width: number, height: number}} world
   * @param {object} [profileOverrides] fields replacing the profile ones (tuning the bot)
   */
  constructor(scene, profileName, seed, world, profileOverrides = {}) {
    this.scene = scene;
    this.profile = { ...(BOT_PROFILES[profileName] ?? BOT_PROFILES.idle), ...profileOverrides };
    this.random = createRandom(Number(seed) * 7919 + 13);
    this.world = world;
    this.pressed = {};
    this.timeToDecision = 0;
    this.aimOffset = 0;
    this.#set('fire', true);
  }

  /**
   * @param {number} dt ms
   * @param {{active: boolean}} player
   * @param {() => {player: object, enemies: object[], bullets: object[], pickups: object[], playerHealth: number, playerMaxHealth: number}} getState read only when the bot decides
   * @returns {void}
   */
  update(dt, player, getState) {
    if (!this.profile.moves) {
      return;
    }
    if (!player.active) {
      this.#applyMove(0, 0);
      return;
    }
    this.timeToDecision -= dt;
    if (this.timeToDecision > 0) {
      return;
    }
    this.timeToDecision = this.profile.reactionMs;
    this.aimOffset = (this.random() * 2 - 1) * this.profile.aimNoise;
    const move = this.#decide(getState());
    this.#applyMove(move.dx, move.dy);
  }

  #decide(state) {
    const { player, enemies, bullets, pickups } = state;
    const profile = this.profile;
    const { speed, width, height } = this.world;
    const margin = 14;
    const target = this.#pickTarget(player, enemies);
    const pickup = this.#pickPickup(player, pickups, state);
    const homeY = height * profile.home;
    let best = null;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        let danger = 0;
        for (let i = 1; i <= SAMPLES; i += 1) {
          const t = (profile.lookahead * i) / SAMPLES;
          const px = clamp(player.x + dx * speed * t, margin, width - margin);
          const py = clamp(player.y + dy * speed * t, margin, height - margin);
          const weight = 1 + (SAMPLES - i) * 0.15;
          danger += weight * this.#dangerAt(px, py, t, bullets, enemies);
        }
        const fx = clamp(player.x + dx * speed * profile.lookahead, margin, width - margin);
        const fy = clamp(player.y + dy * speed * profile.lookahead, margin, height - margin);
        let score = -danger * profile.dangerWeight;
        if (target) {
          score -= Math.abs(fx - (target.x + this.aimOffset)) * 0.6;
        }
        score -= Math.abs(fy - homeY) * 0.25;
        if (pickup) {
          score -= Math.hypot(fx - pickup.x, fy - pickup.y) * pickup.weight * profile.pickupGreed * 0.9;
        }
        // staying put wins ties
        if (dx === 0 && dy === 0) {
          score += 0.5;
        }
        if (!best || score > best.score) {
          best = { score, dx, dy };
        }
      }
    }
    return best;
  }

  #dangerAt(px, py, t, bullets, enemies) {
    const radius = this.profile.dodgeRadius;
    let danger = 0;
    for (let i = 0; i < bullets.length; i += 1) {
      const b = bullets[i];
      const d = Math.hypot(px - (b.x + b.vx * t), py - (b.y + b.vy * t));
      if (d < radius) {
        danger += ((radius - d) / radius) * b.damage;
      }
    }
    for (let i = 0; i < enemies.length; i += 1) {
      const e = enemies[i];
      const reach = radius + e.radius;
      const d = Math.hypot(px - (e.x + e.vx * t), py - (e.y + e.vy * t));
      if (d < reach) {
        danger += ((reach - d) / reach) * 3;
      }
    }
    return danger;
  }

  #pickTarget(player, enemies) {
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < enemies.length; i += 1) {
      const e = enemies[i];
      if (e.y > player.y || e.y < 0) {
        continue;
      }
      const score = Math.abs(e.x - player.x) + (player.y - e.y) * 0.5 - (e.isBoss ? 200 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  #pickPickup(player, pickups, state) {
    let best = null;
    let bestDistance = 260;
    for (let i = 0; i < pickups.length; i += 1) {
      const p = pickups[i];
      const distance = Math.hypot(p.x - player.x, p.y - player.y);
      if (distance < bestDistance) {
        const missing = state.playerMaxHealth - state.playerHealth;
        const weight = p.kind === 'health' ? 1 + missing * 0.8 : p.kind === 'shield' ? 1.2 : 1;
        bestDistance = distance;
        best = { x: p.x, y: p.y, weight };
      }
    }
    return best;
  }

  #applyMove(dx, dy) {
    this.#set('left', dx < 0);
    this.#set('right', dx > 0);
    this.#set('up', dy < 0);
    this.#set('down', dy > 0);
  }

  #set(name, down) {
    if (Boolean(this.pressed[name]) === down) {
      return;
    }
    this.pressed[name] = down;
    this.scene.input.keyboard.emit(down ? 'keydown' : 'keyup', { code: KEYS[name] });
  }
}
