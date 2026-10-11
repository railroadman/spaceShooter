import * as CONFIG from '../config.js';

/**
 * Computes the world height for the current window shape.
 * World width is fixed (CONFIG.GAME_WIDTH) so a wide screen gives no horizontal
 * advantage; tall/short screens only change height, clamped to a fair range.
 * @param {number} windowWidth
 * @param {number} windowHeight
 * @returns {number} world height in game units
 */
export function computeGameHeight(windowWidth, windowHeight) {
  const ratio = windowHeight / Math.max(windowWidth, 1);
  const height = Math.round(CONFIG.GAME_WIDTH * ratio);
  return Math.min(CONFIG.GAME_MAX_HEIGHT, Math.max(CONFIG.GAME_MIN_HEIGHT, height));
}

/**
 * Returns the rectangle where HUD elements may be placed (world minus margin).
 * @param {Phaser.Scale.ScaleManager} scale
 * @returns {{left: number, top: number, right: number, bottom: number}}
 */
export function getSafeArea(scale) {
  const margin = CONFIG.UI_SAFE_MARGIN;
  return {
    left: margin,
    top: margin,
    right: scale.width - margin,
    bottom: scale.height - margin,
  };
}
