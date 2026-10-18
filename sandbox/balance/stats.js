// Aggregates the results of many runs (one profile, one configuration) into comparable numbers.

/**
 * @param {number[]} values
 * @returns {number | null}
 */
export function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * @param {number[]} values
 * @param {number} share 0..1
 * @returns {number | null}
 */
export function percentile(values, share) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * share;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/** Metrics shown in the panel, used by sweeps and targets. `better`: which direction is an improvement for the player. */
export const METRIC_DEFS = [
  { key: 'winRate', label: 'Win rate', fmt: 'percent' },
  { key: 'deathRate', label: 'Died (all lives lost)', fmt: 'percent' },
  { key: 'timeoutRate', label: 'Timeout', fmt: 'percent' },
  { key: 'timeMedianMs', label: 'Run time, median', fmt: 'time' },
  { key: 'timeP10Ms', label: 'Run time, p10', fmt: 'time' },
  { key: 'timeP90Ms', label: 'Run time, p90', fmt: 'time' },
  { key: 'firstDeathMedianMs', label: 'First death, median', fmt: 'time' },
  { key: 'livesLostMean', label: 'Lives lost, mean', fmt: 'number' },
  { key: 'scoreMean', label: 'Score, mean', fmt: 'number0' },
  { key: 'bossReachRate', label: 'Boss reached', fmt: 'percent' },
  { key: 'bossKillRate', label: 'Boss killed', fmt: 'percent' },
  { key: 'bossTtkMedianMs', label: 'Boss kill time, median', fmt: 'time' },
  { key: 'accuracy', label: 'Hits per shot', fmt: 'percent' },
  { key: 'damageLifeMean', label: 'Health lost to bullets, mean', fmt: 'number' },
  { key: 'shieldAbsorbedMean', label: 'Hits absorbed by shield, mean', fmt: 'number' },
  { key: 'pickupsSpawnedMean', label: 'Pickups dropped, mean', fmt: 'number' },
  { key: 'pickupsCollectedMean', label: 'Pickups taken, mean', fmt: 'number' },
  { key: 'weaponPickupsMean', label: 'Weapon pickups taken, mean', fmt: 'number' },
  { key: 'killsMean', label: 'Kills, mean', fmt: 'number' },
  { key: 'maxEnemiesMean', label: 'Peak enemies on screen, mean', fmt: 'number' },
];

/**
 * @param {number | null | undefined} value
 * @param {string} fmt
 * @returns {string}
 */
export function formatMetric(value, fmt) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  switch (fmt) {
    case 'percent':
      return `${(value * 100).toFixed(0)}%`;
    case 'time': {
      const seconds = Math.round(value / 1000);
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }
    case 'number0':
      return String(Math.round(value));
    default:
      return value.toFixed(1);
  }
}

/**
 * @param {object[]} runs results of single runs (`run.js`)
 * @returns {object} flat metrics plus breakdowns
 */
export function aggregate(runs) {
  const n = runs.length;
  const share = (predicate) => (n === 0 ? null : runs.filter(predicate).length / n);
  const sum = (selector) => runs.map(selector);
  const bossKills = runs.map((run) => run.boss.timeToKill).filter((value) => value !== null);
  const firstDeaths = runs.map((run) => run.deaths[0]?.t).filter((value) => value !== undefined);
  const shots = runs.reduce((total, run) => total + run.shots, 0);
  const hits = runs.reduce((total, run) => total + run.hits, 0);
  const totalKills = (run) => Object.values(run.kills).reduce((total, value) => total + value, 0);
  const collected = (run) => Object.values(run.pickups.collected).reduce((total, value) => total + value, 0);
  const weaponCollected = (run) =>
    Object.entries(run.pickups.collected)
      .filter(([key]) => key.startsWith('weapon:'))
      .reduce((total, [, value]) => total + value, 0);

  const deathsByStage = [];
  const sources = {};
  runs.forEach((run) => {
    run.deaths.forEach((death) => {
      deathsByStage[death.stage] = (deathsByStage[death.stage] ?? 0) + 1;
    });
    Object.entries(run.damage.bySource).forEach(([source, entry]) => {
      sources[source] = (sources[source] ?? 0) + entry.life;
    });
  });
  Object.keys(sources).forEach((source) => {
    sources[source] /= n;
  });

  const stageTimeMean = [];
  runs.forEach((run) =>
    run.stageTimeMs.forEach((value, index) => {
      stageTimeMean[index] = (stageTimeMean[index] ?? 0) + value / n;
    })
  );

  return {
    n,
    winRate: share((run) => run.outcome === 'win'),
    deathRate: share((run) => run.outcome === 'dead'),
    timeoutRate: share((run) => run.outcome === 'timeout'),
    timeMedianMs: percentile(sum((run) => run.timeMs), 0.5),
    timeP10Ms: percentile(sum((run) => run.timeMs), 0.1),
    timeP90Ms: percentile(sum((run) => run.timeMs), 0.9),
    firstDeathMedianMs: percentile(firstDeaths, 0.5),
    livesLostMean: mean(sum((run) => run.livesLost)),
    scoreMean: mean(sum((run) => run.score)),
    bossReachRate: share((run) => run.boss.reached),
    bossKillRate: share((run) => run.boss.timeToKill !== null),
    bossTtkMedianMs: percentile(bossKills, 0.5),
    accuracy: shots === 0 ? null : hits / shots,
    damageLifeMean: mean(sum((run) => run.damage.projectileLife)),
    shieldAbsorbedMean: mean(sum((run) => run.damage.shieldAbsorbed)),
    pickupsSpawnedMean: mean(sum((run) => run.pickups.spawned)),
    pickupsCollectedMean: mean(sum(collected)),
    weaponPickupsMean: mean(sum(weaponCollected)),
    killsMean: mean(sum(totalKills)),
    maxEnemiesMean: mean(sum((run) => run.maxEnemies)),
    deathsByStage,
    damageBySource: sources,
    stageTimeMean,
  };
}

/**
 * @param {number[]} values
 * @param {number} buckets
 * @returns {{from: number, to: number, count: number}[]}
 */
export function histogram(values, buckets = 10) {
  if (values.length === 0) {
    return [];
  }
  const max = Math.max(...values, 1);
  const width = max / buckets;
  const bars = Array.from({ length: buckets }, (_, i) => ({ from: i * width, to: (i + 1) * width, count: 0 }));
  values.forEach((value) => {
    bars[Math.min(buckets - 1, Math.floor(value / width))].count += 1;
  });
  return bars;
}
