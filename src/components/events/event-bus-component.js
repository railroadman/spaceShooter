export const CUSTOM_EVENTS = Object.freeze({
  ENEMY_INIT: 'ENEMY_INIT',
  ENEMY_DESTROYED: 'ENEMY_DESTROYED',
  PLAYER_SPAWN: 'PLAYER_SPAWN',
  PLAYER_DESTROYED: 'PLAYER_DESTROYED',
  GAME_OVER: 'GAME_OVER',
  SHIP_HIT: 'SHIP_HIT',
  SHIP_SHOOT: 'SHIP_SHOOT',
  PLAYER_THRUST: 'PLAYER_THRUST',
  EXTRA_LIFE: 'EXTRA_LIFE',
  WEAPON_CHANGED: 'WEAPON_CHANGED',
  BULLET_HIT: 'BULLET_HIT',
  PICKUP_COLLECTED: 'PICKUP_COLLECTED',
  SHIELD_CHANGED: 'SHIELD_CHANGED',
  BOSS_WARNING: 'BOSS_WARNING',
  BOSS_SPAWN: 'BOSS_SPAWN',
  BOSS_PHASE_CHANGED: 'BOSS_PHASE_CHANGED',
  BOSS_HEALTH_CHANGED: 'BOSS_HEALTH_CHANGED',
  BOSS_EXPLOSION: 'BOSS_EXPLOSION',
  BOSS_DEFEATED: 'BOSS_DEFEATED',
});

/**
 * Uses the native Phaser 3 EventEmitter class to allow communication
 * between the various components in our game.
 *
 * For example, this event bus can be used for notifying the UI when
 * an enemy is destroyed so we can update the score in our game.
 */
export class EventBusComponent extends Phaser.Events.EventEmitter {
  constructor() {
    
    super();
  }
}
