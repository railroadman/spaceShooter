import Phaser from '../../lib/phaser.js';
import * as CONFIG from '../../config.js';

/**
 * Generates every procedural texture used by the space background.
 * Runs once (textures stay in the global texture manager, so scene restarts are free).
 * Keys come from the BACKGROUND_STAR_TILES / BACKGROUND_NEBULAE config, plus streak. Planets are loaded images.
 * @param {Phaser.Scene} scene
 * @returns {void}
 */
export function generateSpaceTextures(scene) {
  if (scene.textures.exists('streak')) {
    return;
  }

  CONFIG.BACKGROUND_STAR_TILES.forEach((tile) =>
    createStarTile(scene, tile.key, tile.size, tile.count, tile.maxRadius, tile.brightness)
  );
  CONFIG.BACKGROUND_NEBULAE.forEach((nebula) => createNebula(scene, nebula.key, nebula.rgb));

  createStreak(scene, 'streak');
}

/**
 * Seamless star tile: every star lies fully inside the tile, so wrapping has no seam.
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {number} size tile edge in px
 * @param {number} count number of stars
 * @param {number} maxRadius biggest star radius
 * @param {number} brightness 0..1 upper bound of star alpha
 * @returns {void}
 */
function createStarTile(scene, key, size, count, maxRadius, brightness) {
  const texture = scene.textures.createCanvas(key, size, size);
  const ctx = texture.getContext();
  const glowScale = CONFIG.BACKGROUND_STAR_GLOW_RADIUS;
  const margin = Math.ceil(maxRadius * glowScale) + 1;

  for (let i = 0; i < count; i++) {
    const x = Phaser.Math.RND.between(margin, size - margin);
    const y = Phaser.Math.RND.between(margin, size - margin);
    const radius = Phaser.Math.RND.realInRange(CONFIG.BACKGROUND_STAR_MIN_RADIUS, maxRadius);
    const alpha = Phaser.Math.RND.realInRange(CONFIG.BACKGROUND_STAR_MIN_ALPHA, 1) * brightness;
    const tint = Phaser.Math.RND.pick(CONFIG.BACKGROUND_STAR_TINTS);

    ctx.fillStyle = `rgba(${tint},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (radius > maxRadius * CONFIG.BACKGROUND_STAR_GLOW_THRESHOLD) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * glowScale);
      glow.addColorStop(0, `rgba(${tint},${alpha * CONFIG.BACKGROUND_STAR_GLOW_ALPHA})`);
      glow.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * glowScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  texture.refresh();
}

/**
 * Soft cloud made of overlapping radial blobs; edges fade to transparent.
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {number[]} rgb
 * @returns {void}
 */
function createNebula(scene, key, rgb) {
  const size = CONFIG.BACKGROUND_NEBULA_SIZE;
  const texture = scene.textures.createCanvas(key, size, size);
  const ctx = texture.getContext();

  for (let i = 0; i < CONFIG.BACKGROUND_NEBULA_BLOBS; i++) {
    const radius = Phaser.Math.RND.between(
      CONFIG.BACKGROUND_NEBULA_MIN_RADIUS,
      CONFIG.BACKGROUND_NEBULA_MAX_RADIUS
    );
    const x = Phaser.Math.RND.between(radius * 0.6, size - radius * 0.6);
    const y = Phaser.Math.RND.between(radius * 0.6, size - radius * 0.6);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${CONFIG.BACKGROUND_NEBULA_ALPHA})`);
    gradient.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  texture.refresh();
}

/**
 * Thin vertical light streak (bright head at the bottom) used for the speed effect.
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @returns {void}
 */
function createStreak(scene, key) {
  const width = CONFIG.BACKGROUND_STREAK_WIDTH;
  const height = CONFIG.BACKGROUND_STREAK_HEIGHT;
  const texture = scene.textures.createCanvas(key, width, height);
  const ctx = texture.getContext();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, CONFIG.BACKGROUND_STREAK_TAIL_COLOR);
  gradient.addColorStop(1, CONFIG.BACKGROUND_STREAK_HEAD_COLOR);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  texture.refresh();
}
