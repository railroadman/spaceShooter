// Balance targets: "this profile should end up in this range for this metric".
// targets.json: [{ "profile": "average", "metric": "winRate", "min": 0.4, "max": 0.6, "label": "..." }]

/**
 * @param {{profile: string, metric: string, min?: number, max?: number, label?: string}[]} targets
 * @param {Record<string, object>} aggregates aggregate() result per profile
 * @returns {{target: object, value: number | null, status: 'pass' | 'low' | 'high' | 'n/a'}[]}
 */
export function evaluateTargets(targets, aggregates) {
  return targets
    .filter((target) => aggregates[target.profile])
    .map((target) => {
      const value = aggregates[target.profile][target.metric];
      let status = 'pass';
      if (value === null || value === undefined) {
        status = 'n/a';
      } else if (target.min !== undefined && value < target.min) {
        status = 'low';
      } else if (target.max !== undefined && value > target.max) {
        status = 'high';
      }
      return { target, value: value ?? null, status };
    });
}
