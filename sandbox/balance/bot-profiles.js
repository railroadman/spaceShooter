// Bot skill profiles. Data only.
// reactionMs: how often the bot decides (keys are held between decisions)
// lookahead: seconds of bullet/enemy movement the bot predicts
// dodgeRadius: px kept away from bullets and ships, aimNoise: px error of the aim point
// pickupGreed: how much the bot wants to fly to pickups (0 = ignores them)
// dangerWeight: how much staying away from bullets counts against aiming and pickups
// home: share of the world height where the bot likes to stay (0 top, 1 bottom)
export const BOT_PROFILES = {
  idle: { moves: false },
  novice: { moves: true, reactionMs: 300, lookahead: 0.4, dodgeRadius: 26, aimNoise: 40, pickupGreed: 0.3, dangerWeight: 120, home: 0.85 },
  average: { moves: true, reactionMs: 150, lookahead: 0.6, dodgeRadius: 34, aimNoise: 18, pickupGreed: 0.8, dangerWeight: 120, home: 0.85 },
  expert: { moves: true, reactionMs: 120, lookahead: 0.6, dodgeRadius: 34, aimNoise: 6, pickupGreed: 1.0, dangerWeight: 120, home: 0.8 },
};
