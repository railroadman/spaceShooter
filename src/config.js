// viewport config (world width is fixed, height follows the screen within limits)
export const GAME_WIDTH = 450;
export const GAME_MIN_HEIGHT = 560;
export const GAME_MAX_HEIGHT = 960;
export const UI_SAFE_MARGIN = 15;

// world layout config
export const SPAWN_MARGIN_X = 30;
export const SPAWN_OFFSET_Y = -20;
export const DESPAWN_MARGIN_Y = 50;
export const PLAYER_SPAWN_OFFSET_Y = 32;

// player config
export const PLAYER_LIVES = 3;
export const PLAYER_HEALTH = 4;
export const PLAYER_EXTRA_LIFE_SCORE = 5000;
export const PLAYER_BULLET_SPEED = 300;
export const PLAYER_BULLET_INTERVAL = 300;
export const PLAYER_BULLET_LIFESPAN = 3;
export const PLAYER_BULLET_MAX_COUNT = 10;
export const PLAYER_MOVEMENT_HORIZONTAL_VELOCITY = 90;
export const PLAYER_MOVEMENT_VERTICAL_VELOCITY = 90;
export const PLAYER_INVULNERABLE_DURATION = 3000;
export const PLAYER_BLINK_INTERVAL = 100;
export const PLAYER_BLINK_ALPHA = 0.25;
export const PLAYER_BODY_SIZE = 24;
export const PLAYER_DEPTH = 2;
export const PLAYER_BULLET_Y_OFFSET = -20;
export const PLAYER_RESPAWN_DELAY = 1500;
export const PLAYER_DEATH_SHAKE_DURATION = 500;
export const PLAYER_DEATH_SHAKE_INTENSITY = 0.01;
export const PLAYER_ACCELERATION = 450;
export const PLAYER_DRAG = 0.45;

// shared enemy config
export const ENEMY_BODY_SIZE = 24;
export const ENEMY_BULLET_Y_OFFSET = 10;

// audio config
export const AUDIO_MUSIC_VOLUME = 0.05;
export const AUDIO_EXPLOSION_VOLUME = 0.6;
export const AUDIO_HIT_VOLUME = 0.6;
export const AUDIO_SHOT_VOLUME = 0.05;

// enemy fighter config
export const ENEMY_FIGHTER_SCORE = 200;
export const ENEMY_FIGHTER_HEALTH = 2;
export const ENEMY_FIGHTER_MOVEMENT_VERTICAL_VELOCITY = 40;
export const ENEMY_FIGHTER_MOVEMENT_HORIZONTAL_VELOCITY = 45;
export const ENEMY_FIGHTER_BULLET_SPEED = -280;
export const ENEMY_FIGHTER_BULLET_INTERVAL = 4000;
export const ENEMY_FIGHTER_BULLET_LIFESPAN = 3;
export const ENEMY_FIGHTER_BULLET_MAX_COUNT = 10;
export const ENEMY_FIGHTER_GROUP_SPAWN_INTERVAL = 7000;
export const ENEMY_FIGHTER_GROUP_SPAWN_START = 3000;

// enemy scout config
export const ENEMY_SCOUT_SCORE = 100;
export const ENEMY_SCOUT_HEALTH = 2;
export const ENEMY_SCOUT_MOVEMENT_MAX_X = 40;
export const ENEMY_SCOUT_MOVEMENT_VERTICAL_VELOCITY = 35;
export const ENEMY_SCOUT_MOVEMENT_HORIZONTAL_VELOCITY = 80;
export const ENEMY_SCOUT_BULLET_SPEED = -250;
export const ENEMY_SCOUT_BULLET_INTERVAL = 5000;
export const ENEMY_SCOUT_BULLET_LIFESPAN = 3;
export const ENEMY_SCOUT_BULLET_MAX_COUNT = 10;
export const ENEMY_SCOUT_GROUP_SPAWN_INTERVAL = 5000;
export const ENEMY_SCOUT_GROUP_SPAWN_START = 1000;

// component config
export const COMPONENT_MOVEMENT_VERTICAL_DRAG = 0.01;
export const COMPONENT_MOVEMENT_VERTICAL_MAX_VELOCITY = 200;
export const COMPONENT_MOVEMENT_HORIZONTAL_DRAG = 0.01;
export const COMPONENT_MOVEMENT_HORIZONTAL_MAX_VELOCITY = 200;

// background config
// layers are drawn back to front; speed is in world px/second
export const BACKGROUND_COLOR = 0x03030d;
export const BACKGROUND_LAYERS = [
  { key: 'star_tile_far', speed: 8, alpha: 0.6, depth: -100 },
  { key: 'star_tile_mid', speed: 22, alpha: 0.75, depth: -90 },
  { key: 'star_tile_near', speed: 55, alpha: 0.8, depth: -70 },
];
export const BACKGROUND_PROPS = [
  { key: 'nebula_0', scaleMin: 1.6, scaleMax: 2.8 },
  { key: 'nebula_1', scaleMin: 1.6, scaleMax: 2.8 },
  { key: 'nebula_2', scaleMin: 1.6, scaleMax: 2.8 },
  { key: 'planet_0', scaleMin: 0.7, scaleMax: 1.5 },
  { key: 'planet_1', scaleMin: 0.7, scaleMax: 1.5 },
  { key: 'planet_2', scaleMin: 0.7, scaleMax: 1.5 },
];
export const BACKGROUND_PROP_DEPTH = -95;
export const BACKGROUND_PROP_FIRST_SPAWN = 1500;
export const BACKGROUND_PROP_MAX_COUNT = 4;
export const BACKGROUND_PROP_SPAWN_INTERVAL = 9000;
export const BACKGROUND_PROP_SPEED_MIN = 12;
export const BACKGROUND_PROP_SPEED_MAX = 30;
export const BACKGROUND_PROP_ALPHA = 0.45;
export const BACKGROUND_PROP_FADE_DISTANCE = 120;
export const BACKGROUND_STREAK_COUNT = 6;
export const BACKGROUND_STREAK_SPEED_MIN = 450;
export const BACKGROUND_STREAK_SPEED_MAX = 800;
export const BACKGROUND_STREAK_ALPHA = 0.3;
export const BACKGROUND_STREAK_DEPTH = -60;
export const BACKGROUND_BOOST_ENABLED = true;
export const BACKGROUND_BOOST_MULTIPLIER = 2.2;
export const BACKGROUND_BOOST_SMOOTHING = 4;

// background texture config (procedural textures, generated once)
// star tiles: size = tile edge px, count = stars, maxRadius = biggest star px, brightness = 0..1 alpha cap
export const BACKGROUND_STAR_TILES = [
  { key: 'star_tile_far', size: 512, count: 80, maxRadius: 1, brightness: 0.5 },
  { key: 'star_tile_mid', size: 384, count: 40, maxRadius: 1.5, brightness: 0.75 },
  { key: 'star_tile_near', size: 256, count: 14, maxRadius: 2.2, brightness: 1 },
];
export const BACKGROUND_STAR_MIN_RADIUS = 0.4;
export const BACKGROUND_STAR_MIN_ALPHA = 0.35;
export const BACKGROUND_STAR_TINTS = ['255,255,255', '200,220,255', '255,235,210'];
export const BACKGROUND_STAR_GLOW_THRESHOLD = 0.7; // share of maxRadius above which a star glows
export const BACKGROUND_STAR_GLOW_RADIUS = 3; // glow radius as multiple of star radius
export const BACKGROUND_STAR_GLOW_ALPHA = 0.4;
export const BACKGROUND_NEBULAE = [
  { key: 'nebula_0', rgb: [120, 60, 200] },
  { key: 'nebula_1', rgb: [40, 110, 210] },
  { key: 'nebula_2', rgb: [200, 60, 140] },
];
export const BACKGROUND_NEBULA_SIZE = 256;
export const BACKGROUND_NEBULA_BLOBS = 7;
export const BACKGROUND_NEBULA_MIN_RADIUS = 50;
export const BACKGROUND_NEBULA_MAX_RADIUS = 100;
export const BACKGROUND_NEBULA_ALPHA = 0.35;
export const BACKGROUND_PLANETS = [
  { key: 'planet_0', rgb: [210, 120, 70] },
  { key: 'planet_1', rgb: [70, 150, 190] },
  { key: 'planet_2', rgb: [140, 110, 190] },
];
export const BACKGROUND_PLANET_SIZE = 128;
export const BACKGROUND_PLANET_RADIUS = 44;
export const BACKGROUND_PLANET_ATMOSPHERE_ALPHA = 0.35;
export const BACKGROUND_PLANET_LIGHT_OFFSET = 16; // highlight shift from center px
export const BACKGROUND_PLANET_LIGHT_BOOST = 60; // rgb added to the highlight
export const BACKGROUND_STREAK_WIDTH = 2;
export const BACKGROUND_STREAK_HEIGHT = 48;
export const BACKGROUND_STREAK_TAIL_COLOR = 'rgba(180,210,255,0)';
export const BACKGROUND_STREAK_HEAD_COLOR = 'rgba(220,235,255,1)';

// enemy zigzag interval spread (random multiplier range of the base interval)
export const ENEMY_ZIGZAG_INTERVAL_MIN_SCALE = 0.7;
export const ENEMY_ZIGZAG_INTERVAL_MAX_SCALE = 1.3;

// ui config
export const UI_LIVES_ICON_SPACING = 20;
export const UI_LIVES_ICON_SCALE = 0.6;
export const UI_FONT_FAMILY = 'Orbitron, "Segoe UI", Arial, sans-serif';
export const UI_FONT_LOAD_TIMEOUT = 2500;
export const UI_COLORS = {
  accent: '#4fd8ff',
  popup: '#ffd24f',
  title: '#e8f4ff',
  danger: '#ff4f6a',
  outline: '#04101c',
};
// size in px, color is a key of UI_COLORS, stroke is outline thickness in px
export const UI_TEXT_STYLES = {
  score: { size: 22, color: 'accent', stroke: 4 },
  popup: { size: 16, color: 'popup', stroke: 3 },
  title: { size: 40, color: 'title', stroke: 5 },
  danger: { size: 40, color: 'danger', stroke: 5 },
  body: { size: 18, color: 'title', stroke: 3 },
};
export const UI_TEXT_MAX_RESOLUTION = 3;
export const UI_SCORE_DIGITS = 6;
export const UI_SCORE_POP_SCALE = 1.25;
export const UI_SCORE_POP_DURATION = 120;
export const UI_POPUP_POOL_SIZE = 6;
export const UI_POPUP_DEPTH = 10;
export const UI_POPUP_RISE = 40;
export const UI_POPUP_DURATION = 700;
export const UI_POPUP_EDGE_MARGIN = 30;

// enemy behavior config
// scout: picks a wave or zigzag pattern on every spawn, fires aimed bursts
export const ENEMY_SCOUT_PATTERNS = ['wave', 'zigzag'];
export const ENEMY_SCOUT_WAVE_PERIOD = 2600;
export const ENEMY_SCOUT_ZIGZAG_INTERVAL = 900;
export const ENEMY_SCOUT_ZIGZAG_SMOOTHING = 5;
export const ENEMY_SCOUT_BURST_COUNT = 2;
export const ENEMY_SCOUT_BURST_DELAY = 250;
export const ENEMY_SCOUT_AIM_MAX_ANGLE = 30;

// fighter: eased chase of the player with telegraphed dashes, fires a 3-way spread
export const ENEMY_FIGHTER_CHASE_RANGE = 120;
export const ENEMY_FIGHTER_CHASE_SMOOTHING = 3;
export const ENEMY_FIGHTER_DASH = {
  cooldownMin: 3500,
  cooldownMax: 6500,
  windup: 350,
  windupAxisFactor: 0.2,
  windupSpeedScale: 0.4,
  duration: 450,
  axisBoost: 2,
  speedBoost: 2.5,
};
export const ENEMY_FIGHTER_SPREAD_ANGLES = [-18, 0, 18];

// enemy groups: every spawn picks one formation from the list of its enemy type
// type: 'single' | 'line' | 'v', count: ships in the formation
export const ENEMY_SCOUT_FORMATIONS = [
  { type: 'single', count: 1 },
  { type: 'single', count: 1 },
  { type: 'line', count: 3 },
];
export const ENEMY_FIGHTER_FORMATIONS = [
  { type: 'single', count: 1 },
  { type: 'v', count: 3 },
];
export const FORMATION_SPACING_X = 50;
export const FORMATION_STAGGER_DELAY = 700; // ms between ships of a 'v' formation
