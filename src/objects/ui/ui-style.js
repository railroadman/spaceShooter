import * as CONFIG from '../../config.js';

/**
 * Single source of truth for HUD text look. Every scene/object asks for a
 * style by kind ('score', 'popup', 'title', 'danger', 'body') so fonts, colors
 * and outlines stay consistent. Kinds are defined in CONFIG.UI_TEXT_STYLES.
 * @param {Phaser.Scene} scene used to pick a text resolution that stays crisp when the canvas is scaled
 * @param {keyof typeof CONFIG.UI_TEXT_STYLES} kind
 * @returns {Phaser.Types.GameObjects.Text.TextStyle}
 */
export function getTextStyle(scene, kind) {
  const style = CONFIG.UI_TEXT_STYLES[kind];
  const color = CONFIG.UI_COLORS[style.color];

  return {
    fontFamily: CONFIG.UI_FONT_FAMILY,
    fontSize: `${style.size}px`,
    fontStyle: 'bold',
    color,
    align: 'center',
    stroke: CONFIG.UI_COLORS.outline,
    strokeThickness: style.stroke,
    shadow: { offsetX: 0, offsetY: 0, color, blur: 8, stroke: false, fill: true },
    resolution: getTextResolution(scene),
  };
}

/**
 * Text is drawn on its own canvas; render it at the real on-screen density
 * (CSS scale of the game canvas x device pixel ratio) to avoid blur.
 * @param {Phaser.Scene} scene
 * @returns {number}
 */
export function getTextResolution(scene) {
  const { displaySize, gameSize } = scene.scale;
  const cssScale = displaySize.width / Math.max(gameSize.width, 1);
  const density = Math.ceil(cssScale * (window.devicePixelRatio || 1));
  return Math.min(CONFIG.UI_TEXT_MAX_RESOLUTION, Math.max(1, density));
}
