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
export const PLAYER_HEALTH = 100;
export const PLAYER_EXTRA_LIFE_SCORE = 5000;
export const PLAYER_BULLET_SPEED = 300;
export const PLAYER_BULLET_INTERVAL = 300;
export const PLAYER_BULLET_LIFESPAN = 3;
export const PLAYER_MOVEMENT_HORIZONTAL_VELOCITY = 125;
export const PLAYER_MOVEMENT_VERTICAL_VELOCITY = 125;
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

// bullet defaults (the weapon config can override scale and hitbox)
export const BULLET_DEFAULT_SCALE = 0.8;
export const BULLET_BODY_WIDTH = 14;
export const BULLET_BODY_HEIGHT = 18;

// impact effects of player bullets: frames `<weapon>_hit_1..4` of the `weapons` atlas
export const HIT_EFFECT_FRAME_COUNT = 4;
export const HIT_EFFECT_FRAME_RATE = 24;
export const HIT_EFFECT_POOL_SIZE = 12;
export const HIT_EFFECT_SCALE = 0.5;
export const HIT_EFFECT_DEPTH = 3;

// chain lightning arcs (jagged lines between the enemies a lightning bolt jumps over)
// radius: default px a bolt can jump to the next enemy (a weapon `chain` setting may override it)
// arcDuration: ms an arc stays visible while it fades; jags: segments per arc, jagSize: max px a segment point strays
export const CHAIN_LIGHTNING = {
  radius: 150,
  arcDuration: 150,
  jags: 6,
  jagSize: 9,
  depth: 4,
  glow: { color: 0xb455ff, width: 6, alpha: 0.55 },
  core: { color: 0xffffff, width: 2, alpha: 1 },
};

const LASER_MUZZLE_Y = -34; // the beam is long, its center sits further ahead of the ship than a plasma bolt

// player weapons (main slot): each type has `base` bullet settings and one entry per level in `levels`
// (a level overrides the base). Bullets are frames `<type>_shot` of the `weapons` atlas.
// muzzles: {x, y} px from the ship, one bullet per muzzle and angle; a muzzle may override scale and damage.
// angles: degrees of the fan, one bullet per angle and muzzle. The bullet pool is sized from these values.
// debug.type/level: the weapon the player starts with for testing (null = start.type, start.level);
// debug.secondary: level (1-3) the rockets start with, null = no secondary weapon until one is picked up;
// debug.cycleKey / debug.secondaryCycleKey: KeyboardEvent.code (e.g. 'KeyT') that steps through every main weapon
// and level / through the rocket levels, null = off
export const WEAPONS = {
  maxLevel: 3,
  start: { type: 'plasma', level: 1 },
  debug: { type: null, level: 1, secondary: null, cycleKey: null, secondaryCycleKey: null },
  types: {
    plasma: {
      color: 0x29b6ff,
      base: {
        speed: PLAYER_BULLET_SPEED,
        interval: PLAYER_BULLET_INTERVAL,
        lifespan: PLAYER_BULLET_LIFESPAN,
        textureKey: 'weapons',
        frame: 'plasma_shot',
        hitEffect: 'plasma',
        scale: 0.6,
        bodySize: { width: 14, height: 40 },
        damage: 1,
      },
      levels: [
        { muzzles: [{ x: 0, y: PLAYER_BULLET_Y_OFFSET }] },
        { muzzles: [{ x: -8, y: PLAYER_BULLET_Y_OFFSET }, { x: 8, y: PLAYER_BULLET_Y_OFFSET }] },
        {
          muzzles: [
            { x: -13, y: PLAYER_BULLET_Y_OFFSET + 3 },
            { x: 0, y: PLAYER_BULLET_Y_OFFSET - 2, scale: 0.85, damage: 2 },
            { x: 13, y: PLAYER_BULLET_Y_OFFSET + 3 },
          ],
        },
      ],
    },
    shotgun: {
      color: 0xffc233,
      base: {
        speed: 280,
        interval: 450,
        lifespan: 0.9,
        textureKey: 'weapons',
        frame: 'shotgun_shot',
        hitEffect: 'shotgun',
        scale: 0.55,
        bodySize: { width: 14, height: 30 },
        damage: 1,
        muzzles: [{ x: 0, y: PLAYER_BULLET_Y_OFFSET }],
      },
      levels: [
        { angles: [-12, 0, 12] },
        { angles: [-24, -12, 0, 12, 24] },
        { angles: [-36, -24, -12, 0, 12, 24, 36] },
      ],
    },
    // fast piercing beams: every beam hits each enemy once and flies on. Rough damage per second on one target
    // (scout/fighter have 2-3 health, the boss 300): level 1 ~6, level 2 ~12, level 3 ~18 (plasma level 3 is ~13)
    laser: {
      color: 0xff3b3b,
      base: {
        speed: 600,
        interval: 160,
        lifespan: 1.6,
        textureKey: 'weapons',
        frame: 'laser_shot',
        hitEffect: 'laser',
        pierce: true,
        scale: 1,
        bodySize: { width: 8, height: 48 },
        damage: 1,
      },
      levels: [
        { muzzles: [{ x: 0, y: LASER_MUZZLE_Y }] },
        {
          interval: 160,
          scale: 1.15,
          bodySize: { width: 10, height: 48 },
          muzzles: [{ x: -6, y: LASER_MUZZLE_Y }, { x: 6, y: LASER_MUZZLE_Y }],
        },
        {
          interval: 220,
          scale: 1.5,
          bodySize: { width: 12, height: 48 },
          damage: 2,
          muzzles: [{ x: -8, y: LASER_MUZZLE_Y }, { x: 8, y: LASER_MUZZLE_Y }],
        },
      ],
    },
    // chain lightning: a slow bolt that, on a hit, jumps from the enemy it hit to the nearest other enemies
    // (`chain.targets` = enemies hit in total, the first one included); every target takes the bolt damage once
    lightning: {
      color: 0xb455ff,
      base: {
        speed: 450,
        interval: 420,
        lifespan: 1.4,
        textureKey: 'weapons',
        frame: 'lightning_shot',
        hitEffect: 'lightning',
        scale: 0.8,
        bodySize: { width: 12, height: 40 },
        damage: 1,
        muzzles: [{ x: 0, y: PLAYER_BULLET_Y_OFFSET }],
      },
      levels: [
        { chain: { targets: 2 } },
        { scale: 0.95, chain: { targets: 3 } },
        { scale: 1.1, chain: { targets: 5 } },
      ],
    },
  },
  // secondary slot: shoots together with the main weapon while Space is held (silent: no shot sound of its own)
  // homing: the rocket flies straight for `delay` ms, then turns toward the nearest enemy ahead of it within `range` px,
  // at most `turnRate` deg/s; its speed climbs by `acceleration` px/s^2 up to `maxSpeed`
  // explosion: on a hit every other enemy within `radius` px of the hit takes `damage` (the enemy hit takes the rocket
  // damage); `effectScale` scales the `<effect>_hit` frames to the radius. Levels give 1 / 2 / 3 rockets
  secondaryTypes: {
    rocket: {
      color: 0xff7a1a,
      base: {
        speed: 220,
        interval: 1200,
        lifespan: 3,
        silent: true,
        textureKey: 'weapons',
        frame: 'rocket_shot',
        scale: 0.7,
        bodySize: { width: 10, height: 26 },
        damage: 2,
        homing: { delay: 250, turnRate: 220, range: 450, acceleration: 500, maxSpeed: 420 },
        explosion: { radius: 50, damage: 1, effect: 'rocket', effectScale: 1.1 },
      },
      levels: [
        { muzzles: [{ x: 0, y: -8 }] },
        { muzzles: [{ x: -12, y: -6 }, { x: 12, y: -6 }] },
        { muzzles: [{ x: -16, y: -4 }, { x: 0, y: -10 }, { x: 16, y: -4 }] },
      ],
    },
  },
};

// pickups dropped by destroyed enemies
// chance: drop probability by enemy class name (FighterEnemy counts as the elite enemy)
// cooldown: ms after a drop during which regular enemies drop nothing (the boss always drops)
// weights: relative share of every kind among the drops
// mainWeapons / secondaryWeapons: weapon types a weapon drop can give
// debug.forceAll: every destroyed enemy drops a pickup (testing)
export const DROP = {
  debug: { forceAll: false },
  chance: { ScoutEnemy: 0.065, FighterEnemy: 0.22, BossEnemy: 1 },
  cooldown: 10000,
  weights: { health: 35, shield: 30, main: 25, secondary: 10 },
  mainWeapons: ['plasma', 'shotgun', 'laser', 'lightning'],
  secondaryWeapons: ['rocket'],
};

// falling pickup boxes (frames `box_<name>` of the `weapons` atlas)
// fallSpeed: px/s; spinSpeed: degrees/s; pulse: scale swing (share of the size) and period in ms
// lifetime: ms until it disappears, it blinks during the last blinkTime ms
// bodySize: hitbox in atlas px; the ship has to fly into a box to pick it up
export const PICKUPS = {
  poolSize: 8,
  fallSpeed: 55,
  scale: 0.5,
  depth: 2,
  bodySize: 56,
  spinSpeed: 40,
  pulse: { amount: 0.08, period: 700 },
  lifetime: 9000,
  blinkTime: 2500,
  blinkInterval: 120,
  texts: { shield: '+SHIELD', levelPrefix: 'LV' },
};

// health pickup: share of PLAYER_HEALTH it restores (never above the max), the popup shows it as `+30%`
export const HEALTH_PICKUP_HEAL_PERCENT = 0.3;

// shield pickup: absorbs `charges` hits, then breaks; hits during `hitGrace` ms after an absorbed hit are ignored
export const SHIELD = {
  charges: 3,
  hitGrace: 400,
  radius: 30,
  color: 0x4fc3ff,
  depth: 3,
  rippleDuration: 350,
};

// shared enemy config
export const ENEMY_BODY_SIZE = 24;
export const ENEMY_BULLET_Y_OFFSET = 10;
// player health a plain enemy bullet takes (scout, fighter, boss guns without a `bullet` preset): 6 hits kill
export const ENEMY_BULLET_DAMAGE = 17;
// impact effect where an enemy bullet hits the ship (frames `<effect>_hit_1..4` of the `weapons` atlas);
// a bullet preset (BULLET_ACID, BULLET_RAILGUN) sets its own `hitEffect`
export const ENEMY_BULLET_HIT_EFFECT = 'plasma';
// the ship is filled with `color` for `duration` ms when a bullet takes its health
export const PLAYER_HIT_FLASH = { color: 0xff3b3b, duration: 120 };

// audio config
export const AUDIO_MUSIC_VOLUME = 0.05;
export const AUDIO_EXPLOSION_VOLUME = 0.6;
export const AUDIO_HIT_VOLUME = 0.6;
export const AUDIO_SHOT_VOLUME = 0.05;
export const AUDIO_PICKUP_VOLUME = 0.15;

// enemy fighter config
export const ENEMY_FIGHTER_SCORE = 200;
export const ENEMY_FIGHTER_HEALTH = 3;
export const ENEMY_FIGHTER_MOVEMENT_VERTICAL_VELOCITY = 40;
export const ENEMY_FIGHTER_MOVEMENT_HORIZONTAL_VELOCITY = 45;
export const ENEMY_FIGHTER_BULLET_SPEED = -280;
export const ENEMY_FIGHTER_BULLET_INTERVAL = 4000;
export const ENEMY_FIGHTER_BULLET_LIFESPAN = 3;
export const ENEMY_FIGHTER_BULLET_MAX_COUNT = 12;
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
export const ENEMY_SCOUT_BULLET_MAX_COUNT = 12;
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
// planet photos: assets/images/planets/planet_<name>.png (256 px), loaded in assets.json as `planet_<name>`
export const BACKGROUND_PLANET_NAMES = [
  'alien',
  'amethyst',
  'copper',
  'crystal',
  'desert',
  'frozen_ringed',
  'ice',
  'jungle',
  'lava',
  'magma_blue',
  'moon',
  'obsidian',
  'ocean',
  'ocean_dark',
  'red_giant',
  'ringed',
  'rose_ringed',
  'salt',
  'storm',
  'toxic',
];
export const BACKGROUND_PLANET_KEYS = BACKGROUND_PLANET_NAMES.map((name) => `planet_${name}`);
// weight: relative chance of a spawn, a planet is never picked twice in a row
export const BACKGROUND_PROPS = [
  { key: 'nebula_0', scaleMin: 1.6, scaleMax: 2.8, weight: 1 },
  { key: 'nebula_1', scaleMin: 1.6, scaleMax: 2.8, weight: 1 },
  { key: 'nebula_2', scaleMin: 1.6, scaleMax: 2.8, weight: 1 },
  ...BACKGROUND_PLANET_KEYS.map((key) => ({ key, scaleMin: 0.35, scaleMax: 0.8, weight: 0.3 })),
];
export const BACKGROUND_PROP_DEPTH = -95;
export const BACKGROUND_PROP_FIRST_SPAWN = 1500;
export const BACKGROUND_PROP_MAX_COUNT = 4;
export const BACKGROUND_PROP_SPAWN_INTERVAL = 24000;
export const BACKGROUND_PROP_RETRY_DELAY = 1500; // ms before another try when a planet found no free place
export const BACKGROUND_PLANET_GAP = 40; // min px between two planets, they never overlap
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
export const BACKGROUND_STREAK_WIDTH = 2;
export const BACKGROUND_STREAK_HEIGHT = 48;
export const BACKGROUND_STREAK_TAIL_COLOR = 'rgba(180,210,255,0)';
export const BACKGROUND_STREAK_HEAD_COLOR = 'rgba(220,235,255,1)';

// enemy zigzag interval spread (random multiplier range of the base interval)
export const ENEMY_ZIGZAG_INTERVAL_MIN_SCALE = 0.7;
export const ENEMY_ZIGZAG_INTERVAL_MAX_SCALE = 1.3;

// ui config
export const LEVEL_END_TITLE = 'LEVEL COMPLETE';
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
export const UI_EXTRA_LIFE_TEXT = '+1';
export const UI_LIFE_ICON_POP_DURATION = 250;
// weapon slot of the HUD (above the lives): box icon scale, level pips radius and spacing, gap above the lives row
export const UI_WEAPON_SLOT = { iconScale: 0.28, pipRadius: 2, pipSpacing: 6, pipOffsetX: 6, lifeRowGap: 32, rowGap: 26, dimAlpha: 0.25 };
// player health bar of the HUD, on the lives row right after the last life icon (gapX px from it)
// colors: fill by health share (low below lowBelow, mid below midBelow); ghost trails a hit after ghostDelay ms
// at ghostSpeed health fractions/s; a heal fills the bar at healSpeed fractions/s
export const UI_PLAYER_HEALTH_BAR = {
  depth: 9,
  width: 90,
  height: 6,
  border: 2,
  gapX: 8,
  backColor: 0x04101c,
  ghostColor: 0xffffff,
  colors: { high: 0x4fff8a, mid: 0xffd24f, low: 0xff4f6a },
  midBelow: 0.5,
  lowBelow: 0.25,
  ghostDelay: 400,
  ghostSpeed: 0.6,
  hitFlashColor: 0xffffff,
  hitFlashDuration: 80,
  healSpeed: 1,
  healFlashColor: 0xc8ffd8,
  healFlashDuration: 300,
};

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

// enemy bullet looks (frames of the `weapons` atlas) and damage; a boss weapon or an enemy preset takes one as `bullet`
export const BULLET_ACID = { textureKey: 'weapons', frame: 'acid_shot', scale: 0.5, bodySize: { width: 16, height: 16 }, damage: 20, hitEffect: 'acid' };
export const BULLET_RAILGUN = { textureKey: 'weapons', frame: 'railgun_shot', scale: 0.6, bodySize: { width: 10, height: 30 }, damage: 34, hitEffect: 'railgun' };

// enemy weapon presets: overrides on the base bullet settings of the enemy (ENEMY_SCOUT_BULLET_*, ENEMY_FIGHTER_BULLET_*)
// bullet: look and damage (see BULLET_ACID), aim: turn the volley toward the player, speed < 0 = bullets fly down
export const ENEMY_WEAPONS = {
  single: {},
  triple: { burst: { count: 3, delay: 200 } },
  acid: { bullet: BULLET_ACID, speed: -210, burst: { count: 2, delay: 220 } },
  spread3: {},
  spread5: { angles: [-24, 0, 24] },
  acid5: { bullet: BULLET_ACID, speed: -220, angles: [-18, 0, 18] },
  railgun: { bullet: BULLET_RAILGUN, speed: -380, angles: [0], aim: true, maxAimAngle: 30, burst: { count: 2, delay: 250 } },
};

// difficulty grows with game time (ms, paused while the game is paused): the last stage with `from` <= time applies
// healthBonus: extra health of every new enemy, spawnScale / fireScale: multipliers of the group spawn and shot intervals
// scout / fighter: key of ENEMY_WEAPONS the enemy shoots with in this stage
// debug.startAt: ms of game time the run starts at, for testing
export const DIFFICULTY = {
  debug: { startAt: 0 },
  stages: [
    { from: 0, healthBonus: 0, spawnScale: 1, fireScale: 1, scout: 'single', fighter: 'spread3' },
    { from: 60000, healthBonus: 2, spawnScale: 0.85, fireScale: 1.1, scout: 'triple', fighter: 'spread5' },
    { from: 150000, healthBonus: 3, spawnScale: 0.65, fireScale: 1.2, scout: 'acid', fighter: 'acid5' },
    { from: 240000, healthBonus: 4, spawnScale: 0.55, fireScale: 1.2, scout: 'acid', fighter: 'railgun' },
  ],
};

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

// boss config: the whole first boss is tuned here
// the boss shows up once, after a random moment of game time in [spawn.timeMin, spawn.timeMax]
export const AUDIO_BOSS_EXPLOSION_VOLUME = 0.35;
export const BOSS = {
  // debug.spawnAt: ms of game time to force the boss for testing, null = random spawn.timeMin..timeMax
  debug: { spawnAt: null },
  // warningDuration: ms of WARNING before the boss flies in (normal enemies stop spawning at its start)
  // resumeDelay: ms after the boss death until normal enemies spawn again
  spawn: { timeMin: 300000, timeMax: 360000, warningDuration: 3000, resumeDelay: 4000 },
  // scale: texture is 400px, ~0.56 gives a ship ~220px wide; body* = hitbox in px (smaller than the art);
  // moveMargin: px from the screen edge to the boss center it never crosses; spawnY: start y above the screen
  sprite: {
    key: 'boss_1',
    scale: 0.56,
    flipY: false,
    depth: 1,
    bodyWidth: 120,
    bodyHeight: 110,
    bodyOffsetY: 0,
    moveMargin: 115,
    spawnY: -100,
  },
  // victory: the level ends `delay` ms after the boss is destroyed (LevelEndScene)
  victory: { delay: 1500 },
  health: 300, // health points (a player bullet takes 1 or more)
  score: 5000,
  // holdY: y where the boss hovers; fly-in speed = max(minSpeed, distance * gain) px/s; invulnerable while flying in
  entry: { holdY: 150, minSpeed: 30, gain: 1.5 },
  maxVerticalSpeed: 400,
  // phase change: invulnerable for `duration` ms without shooting, white flash for `flashDuration` ms
  transition: { duration: 1200, flashDuration: 200 },
  hitFlashDuration: 50, // ms of white flash on every hit
  flashColor: 0xffffff,
  // muzzles: {x, y} px from the ship center (y > 0 = toward the player); speed < 0 = bullets fly down;
  // angles: degrees of the volley (one bullet per angle and muzzle), burst: repeat volleys,
  // aim: turn the volley toward the player (limited by maxAimAngle degrees)
  weapons: {
    main: {
      muzzles: [{ x: -31, y: 62 }, { x: 31, y: 62 }],
      speed: -230,
      lifespan: 4,
      maxCount: 24,
      angles: [-14, 0, 14],
      aim: true,
      maxAimAngle: 25,
    },
    wingL: {
      muzzles: [{ x: -59, y: 20 }],
      speed: -260,
      lifespan: 4,
      maxCount: 12,
      angles: [0],
      burst: { count: 3, delay: 180 },
      aim: true,
      maxAimAngle: 30,
    },
    wingR: {
      muzzles: [{ x: 59, y: 20 }],
      speed: -260,
      lifespan: 4,
      maxCount: 12,
      angles: [0],
      burst: { count: 3, delay: 180 },
      aim: true,
      maxAimAngle: 30,
    },
    // railgun shot: fast, aimed, hits hard
    snipe: {
      muzzles: [{ x: 0, y: 66 }],
      speed: -400,
      lifespan: 3,
      maxCount: 8,
      angles: [0],
      burst: { count: 2, delay: 280 },
      aim: true,
      maxAimAngle: 35,
      bullet: BULLET_RAILGUN,
    },
    fan: {
      muzzles: [{ x: 0, y: 66 }],
      speed: -200,
      lifespan: 4,
      maxCount: 30,
      angles: [-60, -40, -20, 0, 20, 40, 60],
      burst: { count: 2, delay: 300 },
      aim: false,
      bullet: BULLET_ACID,
    },
    ring: {
      muzzles: [{ x: 0, y: 20 }],
      speed: -170,
      lifespan: 4,
      maxCount: 36,
      angles: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      aim: false,
      bullet: BULLET_ACID,
    },
  },
  // phases are played in order; a phase ends when the health fraction drops to hpTo (the last one: 0)
  // move.type: 'sway' (period ms) | 'chase' (range px, smoothing 1/s) | 'dash' (chase + dash, see ENEMY_FIGHTER_DASH)
  //   speed: horizontal px/s at full axis; returnGain: pull back to entry.holdY (1/s);
  //   diveSpeed: px/s of the vertical push of a dash speed scale (wind-up pulls up, dash dives down)
  // attacks: weapon id from `weapons`, interval ms between shots, firstDelay ms after the phase starts
  // tint: ship tint (null = none), barColor: health bar color, clearBullets: remove boss bullets at phase start
  phases: [
    {
      hpTo: 0.65,
      move: { type: 'sway', period: 4200, speed: 60, returnGain: 2 },
      attacks: [{ weapon: 'main', interval: 2200, firstDelay: 1200 }],
      tint: null,
      barColor: 0x4fd8ff,
      clearBullets: false,
    },
    {
      hpTo: 0.3,
      move: { type: 'sway', period: 3000, speed: 85, returnGain: 2 },
      attacks: [
        { weapon: 'main', interval: 2000, firstDelay: 800 },
        { weapon: 'wingL', interval: 3200, firstDelay: 1500 },
        { weapon: 'wingR', interval: 3200, firstDelay: 3100 },
        { weapon: 'snipe', interval: 5200, firstDelay: 2400 },
      ],
      tint: null,
      barColor: 0xffd24f,
      clearBullets: true,
    },
    {
      hpTo: 0,
      move: {
        type: 'dash',
        range: 140,
        smoothing: 2.5,
        speed: 90,
        returnGain: 2,
        diveSpeed: 220,
        dash: {
          cooldownMin: 4000,
          cooldownMax: 6000,
          windup: 600,
          windupAxisFactor: 0.1,
          windupSpeedScale: 0.6,
          duration: 500,
          axisBoost: 1.6,
          speedBoost: 2.2,
        },
      },
      attacks: [
        { weapon: 'main', interval: 1700, firstDelay: 800 },
        { weapon: 'snipe', interval: 3600, firstDelay: 1200 },
        { weapon: 'fan', interval: 4200, firstDelay: 1500 },
        { weapon: 'ring', interval: 5200, firstDelay: 3000 },
      ],
      tint: 0xff9a9a,
      barColor: 0xff4f6a,
      clearBullets: true,
    },
  ],
  // death: explosions over the hull every explosionInterval ms for `duration` ms, then a camera shake
  death: {
    duration: 2200,
    explosionInterval: 140,
    spreadX: 90,
    spreadY: 70,
    scaleMin: 1.2,
    scaleMax: 2.4,
    shakeDuration: 600,
    shakeIntensity: 0.012,
  },
  // health bar above the boss: anchorOffset = px above the boss center, minY = top limit in px
  bar: {
    depth: 9,
    width: 170,
    height: 9,
    border: 2,
    minY: 46,
    anchorOffset: 95,
    backColor: 0x04101c,
    ghostColor: 0xffffff,
    flashColor: 0xffffff,
    ghostDelay: 400,
    ghostSpeed: 0.6, // health fractions per second
    flashDuration: 80,
    fadeDuration: 500,
  },
  // warning text, yFraction = vertical position as a share of the screen height
  warning: { text: 'WARNING', yFraction: 0.3, blinkPeriod: 350 },
};
