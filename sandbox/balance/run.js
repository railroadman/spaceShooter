// One simulated run of the real game. Loaded by boot.js after the patched config is plugged in.
// Fast mode: time is driven here with a fixed step and no rendering. Render mode (`render: true`): Phaser's own loop,
// real time, with the bot playing, to watch a run again.
// Nothing in src/ is modified: the sandbox listens to the event bus, wraps a few methods on the class prototypes
// of its own page, and reads objects from the scene.
import Phaser from '../../src/lib/phaser.js';
import { BootScene } from '../../src/scenes/boot-scene.js';
import { PreloadScene } from '../../src/scenes/preload-scene.js';
import { GameScene } from '../../src/scenes/game-scene.js';
import { PauseScene } from '../../src/scenes/pause-scene.js';
import { GameOverScene } from '../../src/scenes/game-over-scene.js';
import { LevelEndScene } from '../../src/scenes/level-end-scene.js';
import { EventBusComponent } from '../../src/components/events/event-bus-component.js';
import { ColliderComponent } from '../../src/components/collider/collider-component.js';
import { WeaponComponent } from '../../src/components/weapon/weapon-component.js';
import { Player } from '../../src/objects/player.js';
import { ScoutEnemy } from '../../src/objects/enemies/scout-enemy.js';
import { FighterEnemy } from '../../src/objects/enemies/fighter-enemy.js';
import { BossEnemy } from '../../src/objects/enemies/boss-enemy.js';
import * as CONFIG from '../../src/config.js';
import { BotDriver } from './bot-driver.js';
import { MetricsCollector } from './metrics-collector.js';

const params = window.__simParams;
const STEP = 1000 / 60;
const STEPS_PER_TASK = 900;

const metrics = new MetricsCollector(params.timeline !== false);
/** @type {{scene: Phaser.Scene | null, player: Player | null, boss: BossEnemy | null, bus: unknown, bulletGroups: Set<Phaser.GameObjects.Group>, owners: Map<unknown, string>, lastBullet: unknown, pending: string | null, weapon: {type: string, level: number}}} */
const ctx = {
  scene: null,
  player: null,
  boss: null,
  bus: null,
  bulletGroups: new Set(),
  owners: new Map(),
  groupOwners: new Map(),
  lastBullet: null,
  pending: null,
  weapon: { type: '-', level: 0 },
};

// --- instrumentation (own page only) ---------------------------------------------------------------------------

const originalEmit = EventBusComponent.prototype.emit;
EventBusComponent.prototype.emit = function emit(event, ...args) {
  ctx.bus = this;
  if (event === 'ENEMY_INIT') {
    const enemy = args[0];
    if (enemy?.weaponGameObjectGroup) {
      ctx.bulletGroups.add(enemy.weaponGameObjectGroup);
      ctx.owners.set(enemy.weaponComponent, enemy.constructor.name);
      ctx.groupOwners.set(enemy.weaponGameObjectGroup, enemy.constructor.name);
    }
  } else if (event === 'BOSS_SPAWN') {
    ctx.boss = args[0];
    args[0].weaponComponents.forEach((weapon) => {
      ctx.bulletGroups.add(weapon.bulletGroup);
      ctx.owners.set(weapon, 'BossEnemy');
      ctx.groupOwners.set(weapon.bulletGroup, 'BossEnemy');
    });
  } else if (event === 'WEAPON_CHANGED' && args[0].slot === 'main') {
    ctx.weapon = { type: args[0].type, level: args[0].level };
  } else if (event === 'GAME_OVER') {
    ctx.pending = 'dead';
  } else if (event === 'BOSS_DEFEATED') {
    ctx.pending = 'win';
  }
  metrics.onEvent(event, args);
  return originalEmit.call(this, event, ...args);
};

const originalDestroyBullet = WeaponComponent.prototype.destroyBullet;
WeaponComponent.prototype.destroyBullet = function destroyBullet(bullet) {
  ctx.lastBullet = { weapon: this, frame: bullet?.frame?.name ?? '?' };
  return originalDestroyBullet.call(this, bullet);
};

/**
 * Names what hit the player: enemy class and bullet frame. Some enemies do not report the bullet that hit,
 * then the closest enemy bullet to the ship is taken.
 * @param {{weapon: unknown, frame: string} | null} bullet
 * @param {Player} player
 * @returns {string}
 */
function describeSource(bullet, player) {
  if (bullet) {
    return `${ctx.owners.get(bullet.weapon) ?? 'enemy'}/${bullet.frame}`;
  }
  let best = null;
  let bestDistance = 40;
  ctx.bulletGroups.forEach((group) => {
    group.getChildren().forEach((child) => {
      const distance = Math.hypot(child.x - player.x, child.y - player.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { group, frame: child.frame?.name ?? '?' };
      }
    });
  });
  return best ? `${ctx.groupOwners.get(best.group) ?? 'enemy'}/${best.frame}` : 'unknown';
}

/**
 * Wraps a hit method of the collider: for the player's collider it measures what the hit did.
 * @param {'collideWithEnemyProjectile' | 'collideWithEnemyShip'} name
 * @returns {void}
 */
function wrapCollider(name) {
  const original = ColliderComponent.prototype[name];
  ColliderComponent.prototype[name] = function wrapped(...args) {
    const player = ctx.player;
    if (!player || this !== player.colliderComponent) {
      return original.apply(this, args);
    }
    const lifeBefore = player.healthComponent.life;
    const shieldBefore = this.shield;
    const bullet = ctx.lastBullet;
    ctx.lastBullet = null;
    const result = original.apply(this, args);
    const absorbed = this.shield < shieldBefore;
    const source = name === 'collideWithEnemyShip' ? 'ram' : describeSource(bullet, player);
    metrics.onPlayerHit(name === 'collideWithEnemyShip' ? 'ram' : 'projectile', source, lifeBefore - player.healthComponent.life, absorbed);
    return result;
  };
}
wrapCollider('collideWithEnemyProjectile');
wrapCollider('collideWithEnemyShip');

// --- reading the world ------------------------------------------------------------------------------------------

/** @type {Phaser.Physics.Arcade.Sprite[]} */
let pickupSprites = [];
const pickupAge = new Map();

function readEnemies() {
  const list = [];
  ctx.scene.children.list.forEach((child) => {
    if (!child.active || !child.body || !(child instanceof ScoutEnemy || child instanceof FighterEnemy || child instanceof BossEnemy)) {
      return;
    }
    const body = child.body;
    list.push({
      x: child.x,
      y: child.y,
      vx: body.velocity.x,
      vy: body.velocity.y,
      radius: Math.max(body.halfWidth, body.halfHeight),
      isBoss: child instanceof BossEnemy,
    });
  });
  return list;
}

function readBullets() {
  const list = [];
  ctx.bulletGroups.forEach((group) => {
    group.getChildren().forEach((bullet) => {
      if (bullet.active && bullet.body) {
        list.push({ x: bullet.x, y: bullet.y, vx: bullet.body.velocity.x, vy: bullet.body.velocity.y, damage: bullet.getData('damage') || 1 });
      }
    });
  });
  return list;
}

function readPickups() {
  return pickupSprites
    .filter((sprite) => sprite.active)
    .map((sprite) => ({ x: sprite.x, y: sprite.y, kind: sprite.getData('kind') }));
}

/** counts a pickup when its age restarts */
function trackPickups() {
  pickupSprites.forEach((sprite) => {
    if (!sprite.active) {
      pickupAge.delete(sprite);
      return;
    }
    const age = sprite.getData('age') ?? 0;
    const previous = pickupAge.get(sprite);
    if (previous === undefined || age < previous) {
      metrics.onPickupSpawned();
    }
    pickupAge.set(sprite, age);
  });
}

function snapshot() {
  const player = ctx.player;
  return {
    hp: player.healthComponent.life,
    lives: CONFIG.PLAYER_LIVES - metrics.deaths.length + metrics.extraLives,
    enemies: readEnemies().length,
    enemyBullets: readBullets().length,
    shield: player.colliderComponent.shield,
    weapon: ctx.weapon.type,
    level: ctx.weapon.level,
  };
}

// --- the game ---------------------------------------------------------------------------------------------------

const game = new Phaser.Game({
  type: Phaser.AUTO,
  banner: false,
  audio: { noAudio: true },
  seed: [String(params.seed)],
  roundPixels: true,
  pixelArt: false,
  antialias: true,
  scale: { parent: 'game-container', width: CONFIG.GAME_WIDTH, height: params.h, mode: Phaser.Scale.NONE },
  backgroundColor: '#000000',
  physics: { default: 'arcade', arcade: { gravity: { y: 0, x: 0 }, debug: false } },
  callbacks: {
    preBoot: (g) => {
      // fast mode: time is driven below, Phaser's own requestAnimationFrame loop stays off
      if (!params.render) {
        g.loop.start = () => {};
      }
    },
  },
});
window.__game = game;
game.scene.add('BootScene', BootScene);
game.scene.add('PreloadScene', PreloadScene);
game.scene.add('GameScene', GameScene);
game.scene.add('PauseScene', PauseScene);
game.scene.add('GameOverScene', GameOverScene);
game.scene.add('LevelEndScene', LevelEndScene);
game.scene.start('BootScene');

let bot = null;
let started = false;
let finished = false;
const wallStart = performance.now();

function tryStart() {
  const scene = game.scene.getScene('GameScene');
  if (!scene || scene.sys.settings.status !== Phaser.Scenes.RUNNING) {
    return;
  }
  const player = scene.children.list.find((child) => child instanceof Player);
  if (!player) {
    return;
  }
  ctx.scene = scene;
  ctx.player = player;
  pickupSprites = scene.children.list.filter((child) => child.texture?.key === 'weapons' && child.frame?.name?.startsWith('box_'));
  bot = new BotDriver(scene, params.profile, params.seed, {
    speed: CONFIG.PLAYER_MOVEMENT_HORIZONTAL_VELOCITY,
    width: scene.scale.width,
    height: scene.scale.height,
  }, params.bot);
  started = true;
}

function finish(outcome) {
  finished = true;
  const data = metrics.finish(outcome);
  data.wallMs = Math.round(performance.now() - wallStart);
  window.__simResult = data;
  const message = { type: 'sim-result', id: params.id, seed: params.seed, profile: params.profile, data };
  window.parent.postMessage(message, '*');
  if (params.render) {
    const view = document.createElement('pre');
    view.id = 'sim-result';
    view.textContent = JSON.stringify({ ...data, timeline: undefined, deaths: undefined, weapon: undefined }, null, 1);
    document.body.appendChild(view);
  }
}

game.events.on(Phaser.Core.Events.PRE_STEP, (time, delta) => {
  if (finished) {
    return;
  }
  if (!started) {
    tryStart();
    return;
  }
  bot.update(delta, ctx.player, () => ({
    player: ctx.player,
    enemies: readEnemies(),
    bullets: readBullets(),
    pickups: readPickups(),
    playerHealth: ctx.player.healthComponent.life,
    playerMaxHealth: CONFIG.PLAYER_HEALTH,
  }));
});

game.events.on(Phaser.Core.Events.POST_STEP, (time, delta) => {
  if (finished || !started) {
    return;
  }
  metrics.step(delta, snapshot);
  trackPickups();
  if (ctx.pending) {
    finish(ctx.pending);
  } else if (metrics.time >= params.limit) {
    finish('timeout');
  }
});

if (!params.render) {
  let gameTime = 0;
  const events = game.events;

  // Game.step without the render part
  const simStep = () => {
    gameTime += STEP;
    events.emit(Phaser.Core.Events.PRE_STEP, gameTime, STEP);
    events.emit(Phaser.Core.Events.STEP, gameTime, STEP);
    game.scene.update(gameTime, STEP);
    events.emit(Phaser.Core.Events.POST_STEP, gameTime, STEP);
  };

  const pump = () => {
    try {
      if (!game.isRunning || !game.scene.isBooted) {
        setTimeout(pump, 0);
        return;
      }
      // boot and preload: the loader needs real events between the steps
      const steps = started ? STEPS_PER_TASK : 1;
      for (let i = 0; i < steps && !finished; i += 1) {
        simStep();
      }
      if (!finished) {
        setTimeout(pump, 0);
      }
    } catch (error) {
      window.__simError = String(error?.stack ?? error);
      console.error('[sim] error', error);
      window.parent.postMessage({ type: 'sim-error', id: params.id, error: window.__simError }, '*');
    }
  };
  pump();
}
