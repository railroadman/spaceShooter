// Balance sandbox panel: scenario, config overrides, batch runs, sweeps, baseline comparison, targets, presets.
import * as CONFIG from '../../src/config.js';
import { BOT_PROFILES } from './bot-profiles.js';
import { runJobs } from './sim-orchestrator.js';
import { aggregate, formatMetric, histogram, METRIC_DEFS } from './stats.js';
import { evaluateTargets } from './targets.js';

const $ = (id) => document.getElementById(id);
const MAX_ROWS = 200;
const BASELINE_KEY = 'balance-sandbox-baseline';
const esc = (text) => String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** @type {Record<string, number | string | boolean>} */
const defaults = {};
/** @type {Record<string, number | string | boolean>} */
let overrides = {};
let last = null;
let baseline = null;
let signal = { cancelled: false };
let targets = [];

// --- config parameters ------------------------------------------------------------------------------------------

function flatten(path, value, depth) {
  if (typeof value === 'function' || depth > 7) {
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.keys(value).forEach((key) => flatten(`${path}.${key}`, value[key], depth + 1));
    return;
  }
  if (value === null || ['number', 'string', 'boolean'].includes(typeof value)) {
    defaults[path] = value;
  }
}
Object.entries(CONFIG).forEach(([name, value]) => flatten(name, value, 0));

function parseValue(path, text) {
  const base = defaults[path];
  if (base === null) {
    // unset in the config (debug switches): a number, a name, or empty for unset
    return text.trim() === '' || text.trim() === 'null' ? null : Number.isFinite(Number(text)) ? Number(text) : text;
  }
  if (typeof base === 'number') {
    const value = Number(text);
    return text.trim() === '' || !Number.isFinite(value) ? undefined : value;
  }
  if (typeof base === 'boolean') {
    return text === 'true' ? true : text === 'false' ? false : undefined;
  }
  return text;
}

function renderParams() {
  const filter = $('search').value.trim().toLowerCase();
  const changed = Object.keys(overrides);
  const rest = Object.keys(defaults).filter((path) => !(path in overrides) && (!filter || path.toLowerCase().includes(filter)));
  const paths = [...changed, ...rest].slice(0, MAX_ROWS);
  $('params').innerHTML =
    '<tr><th>Parameter</th><th>Default</th><th>Value</th><th></th></tr>' +
    paths
      .map((path) => {
        const isChanged = path in overrides;
        const value = isChanged ? overrides[path] : defaults[path];
        return `<tr class="${isChanged ? 'changed' : ''}"><td>${esc(path)}</td><td class="muted">${esc(defaults[path])}</td>
          <td><input data-path="${esc(path)}" value="${esc(value)}" /></td>
          <td>${isChanged ? `<button data-reset="${esc(path)}">x</button>` : ''}</td></tr>`;
      })
      .join('');
  $('changedCount').textContent = changed.length ? `(${changed.length} changed)` : '';
  if (rest.length + changed.length > MAX_ROWS) {
    $('params').insertAdjacentHTML('beforeend', `<tr><td colspan="4" class="muted">... ${rest.length + changed.length - MAX_ROWS} more, narrow the filter</td></tr>`);
  }
}

$('params').addEventListener('change', (event) => {
  const path = event.target.dataset?.path;
  if (!path) {
    return;
  }
  const value = parseValue(path, event.target.value);
  if (value === undefined || value === defaults[path]) {
    delete overrides[path];
  } else {
    overrides[path] = value;
  }
  renderParams();
});
$('params').addEventListener('click', (event) => {
  const path = event.target.dataset?.reset;
  if (path) {
    delete overrides[path];
    renderParams();
  }
});
$('search').addEventListener('input', renderParams);
$('resetAll').addEventListener('click', () => {
  overrides = {};
  renderParams();
});
$('showDiff').addEventListener('click', () => {
  const lines = Object.keys(overrides).map((path) => {
    const value = typeof overrides[path] === 'string' ? `'${overrides[path]}'` : overrides[path];
    return path.includes('.')
      ? `${path}: ${defaults[path]} -> ${overrides[path]}`
      : `export const ${path} = ${value};  // was ${defaults[path]}`;
  });
  $('diff').textContent = lines.length ? lines.join('\n') : 'no changes';
});
$('paramList').innerHTML = Object.keys(defaults)
  .filter((path) => typeof defaults[path] === 'number')
  .map((path) => `<option value="${path}"></option>`)
  .join('');

// --- scenario ---------------------------------------------------------------------------------------------------

$('profiles').innerHTML = Object.keys(BOT_PROFILES)
  .map((name) => `<label><input type="checkbox" name="profile" value="${name}" ${name === 'average' ? 'checked' : ''} /> ${name}</label>`)
  .join('');
$('sweepProfile').innerHTML = Object.keys(BOT_PROFILES).map((name) => `<option ${name === 'average' ? 'selected' : ''}>${name}</option>`).join('');
$('sweepMetric').innerHTML = METRIC_DEFS.map((metric) => `<option value="${metric.key}">${metric.label}</option>`).join('');

function readScenario() {
  return {
    profiles: [...document.querySelectorAll('input[name=profile]:checked')].map((input) => input.value),
    seeds: Number($('seeds').value),
    firstSeed: Number($('firstSeed').value),
    limitSec: Number($('limit').value),
    concurrency: Number($('concurrency').value),
    height: Number($('height').value),
    timeline: $('timeline').checked,
  };
}

function applyScenario(scenario) {
  if (!scenario) {
    return;
  }
  document.querySelectorAll('input[name=profile]').forEach((input) => {
    input.checked = (scenario.profiles ?? []).includes(input.value);
  });
  $('seeds').value = scenario.seeds ?? 10;
  $('firstSeed').value = scenario.firstSeed ?? 1;
  $('limit').value = scenario.limitSec ?? 600;
  $('concurrency').value = scenario.concurrency ?? 3;
  $('height').value = scenario.height ?? 640;
  $('timeline').checked = scenario.timeline !== false;
}

function buildJobs(scenario, profile, extraOverrides, tag) {
  return Array.from({ length: scenario.seeds }, (_, i) => ({
    tag,
    params: {
      seed: scenario.firstSeed + i,
      profile,
      limit: scenario.limitSec * 1000,
      h: scenario.height,
      overrides: { ...overrides, ...extraOverrides },
      timeline: scenario.timeline,
    },
  }));
}

function setBusy(busy) {
  $('run').disabled = busy;
  $('runSweep').disabled = busy;
  $('stop').disabled = !busy;
}

function onProgress(done, total) {
  $('progress').textContent = `${done} / ${total} runs`;
}

function showErrors(results) {
  const errors = results.filter((result) => !result.ok).map((result) => result.error);
  $('log').textContent = errors.length ? `${errors.length} runs failed:\n${[...new Set(errors)].slice(0, 3).join('\n---\n')}` : '';
}

$('stop').addEventListener('click', () => {
  signal.cancelled = true;
});

$('run').addEventListener('click', async () => {
  const scenario = readScenario();
  if (scenario.profiles.length === 0) {
    $('log').textContent = 'select at least one profile';
    return;
  }
  const jobs = scenario.profiles.flatMap((profile) => buildJobs(scenario, profile, {}, profile));
  if (jobs.length > 60) {
    jobs.forEach((job) => {
      job.params.timeline = false;
    });
  }
  signal = { cancelled: false };
  setBusy(true);
  const started = performance.now();
  const results = await runJobs(jobs, { concurrency: scenario.concurrency, onProgress, signal });
  setBusy(false);
  showErrors(results.filter(Boolean));
  const runs = {};
  jobs.forEach((job, i) => {
    if (results[i]?.ok) {
      (runs[job.tag] ??= []).push({ seed: job.params.seed, ...results[i].data });
    }
  });
  const aggregates = {};
  Object.keys(runs).forEach((profile) => {
    aggregates[profile] = aggregate(runs[profile]);
  });
  last = { scenario, overrides: { ...overrides }, runs, aggregates, seconds: (performance.now() - started) / 1000 };
  renderResults();
  renderTargets();
});

// --- results ----------------------------------------------------------------------------------------------------

function delta(value, base, fmt) {
  if (value === null || base === null || base === undefined) {
    return '';
  }
  const diff = value - base;
  if (Math.abs(diff) < 1e-9) {
    return '=';
  }
  const text = fmt === 'percent' ? `${(diff * 100).toFixed(0)} pp` : fmt === 'time' ? `${(diff / 1000).toFixed(0)} s` : diff.toFixed(1);
  return `${diff > 0 ? '+' : ''}${text}`;
}

function renderBars(values, label) {
  const bars = histogram(values, 10);
  const max = Math.max(1, ...bars.map((bar) => bar.count));
  return `<div class="muted">${label}</div><div class="bars">${bars
    .map((bar) => `<div style="height:${(bar.count / max) * 100}%" title="${formatMetric(bar.from, 'time')}-${formatMetric(bar.to, 'time')}: ${bar.count}"></div>`)
    .join('')}</div>`;
}

function renderResults() {
  $('resultsBox').hidden = false;
  $('resultsInfo').textContent = `${last.seconds.toFixed(1)} s wall`;
  $('baselineInfo').textContent = baseline ? 'baseline set' : '';
  $('results').innerHTML = Object.keys(last.runs)
    .map((profile) => {
      const agg = last.aggregates[profile];
      const base = baseline?.aggregates?.[profile];
      const metricRows = METRIC_DEFS.map((metric) => {
        const value = agg[metric.key];
        const baseValue = base?.[metric.key];
        return `<tr><td>${metric.label}</td><td>${formatMetric(value, metric.fmt)}</td>${
          base ? `<td class="muted">${formatMetric(baseValue, metric.fmt)}</td><td>${delta(value, baseValue, metric.fmt)}</td>` : ''
        }</tr>`;
      }).join('');
      const stageDeaths = (last.aggregates[profile].deathsByStage ?? []).map((count, i) => `stage ${i}: ${count ?? 0}`).join(', ');
      const stageTime = agg.stageTimeMean.map((ms, i) => `stage ${i}: ${formatMetric(ms, 'time')}`).join(', ');
      const sources = Object.entries(agg.damageBySource)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([source, life]) => `<tr><td>${source}</td><td>${life.toFixed(2)}</td></tr>`)
        .join('');
      const runRows = last.runs[profile]
        .map(
          (run, i) =>
            `<tr><td>${run.seed}</td><td>${run.outcome}</td><td>${formatMetric(run.timeMs, 'time')}</td><td>${run.score}</td><td>${run.livesLost}</td>
            <td>${run.boss.reached ? (run.boss.timeToKill !== null ? formatMetric(run.boss.timeToKill, 'time') : 'reached') : '-'}</td>
            <td>${run.timeline ? `<button data-timeline="${profile}:${i}">timeline</button>` : ''}
            <a href="run.html#${encodeURIComponent(JSON.stringify({ seed: run.seed, profile, limit: last.scenario.limitSec * 1000, h: last.scenario.height, overrides: last.overrides, render: true }))}" target="_blank">watch</a></td></tr>`
        )
        .join('');
      return `<h2 style="margin-top:12px">${profile} <span class="muted">${agg.n} runs</span></h2>
        <table><tr><th>Metric</th><th>Value</th>${base ? '<th>Baseline</th><th>Change</th>' : ''}</tr>${metricRows}</table>
        ${renderBars(last.runs[profile].map((run) => run.timeMs), 'Run time distribution')}
        <div class="muted" style="margin-top:6px">Deaths by stage: ${stageDeaths || 'none'}<br />Time per stage (mean): ${stageTime}</div>
        <table style="margin-top:6px"><tr><th>Health lost per run, by source</th><th></th></tr>${sources || '<tr><td class="muted">none</td><td></td></tr>'}</table>
        <details style="margin-top:6px"><summary>Runs</summary><table><tr><th>Seed</th><th>Outcome</th><th>Time</th><th>Score</th><th>Lives lost</th><th>Boss</th><th></th></tr>${runRows}</table></details>`;
    })
    .join('');
}

$('results').addEventListener('click', (event) => {
  const key = event.target.dataset?.timeline;
  if (!key) {
    return;
  }
  const [profile, index] = key.split(':');
  drawTimeline(last.runs[profile][Number(index)], profile);
});

function drawTimeline(run, profile) {
  $('runBox').hidden = false;
  $('runInfo').textContent = `${profile}, seed ${run.seed}, ${run.outcome}, ${formatMetric(run.timeMs, 'time')}`;
  const canvas = $('timeline-canvas');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  const maxT = Math.max(1, run.timeMs);
  const x = (t) => (t / maxT) * (canvas.width - 10) + 5;
  const y = (value) => canvas.height - 8 - value;
  const line = (color, selector, scale) => {
    context.strokeStyle = color;
    context.beginPath();
    run.timeline.forEach((point, i) => (i === 0 ? context.moveTo(x(point.t), y(selector(point) * scale)) : context.lineTo(x(point.t), y(selector(point) * scale))));
    context.stroke();
  };
  line('#555d73', (p) => p.enemyBullets, 3);
  line('#ff6b6b', (p) => p.enemies, 10);
  line('#ffc233', (p) => p.lives, 20);
  line('#5bd68a', (p) => p.hp, 20);
  context.strokeStyle = '#4fc3ff';
  run.deaths.forEach((death) => {
    context.beginPath();
    context.moveTo(x(death.t), 0);
    context.lineTo(x(death.t), canvas.height);
    context.stroke();
  });
  if (run.boss.spawnAt !== null) {
    context.fillStyle = '#b455ff';
    context.fillRect(x(run.boss.spawnAt), 0, 2, canvas.height);
  }
}

// --- baseline ---------------------------------------------------------------------------------------------------

try {
  baseline = JSON.parse(localStorage.getItem(BASELINE_KEY) ?? 'null');
} catch (error) {
  baseline = null;
}
$('setBaseline').addEventListener('click', () => {
  if (!last) {
    return;
  }
  baseline = { aggregates: last.aggregates, overrides: last.overrides };
  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
  } catch (error) {
    // storage may be blocked, the baseline then lives until the page closes
  }
  renderResults();
});
$('clearBaseline').addEventListener('click', () => {
  baseline = null;
  try {
    localStorage.removeItem(BASELINE_KEY);
  } catch (error) {
    // nothing to do
  }
  if (last) {
    renderResults();
  }
});

// --- targets ----------------------------------------------------------------------------------------------------

function renderTargets() {
  if (!last || targets.length === 0) {
    return;
  }
  const rows = evaluateTargets(targets, last.aggregates);
  $('targetsBox').hidden = rows.length === 0;
  $('targets').innerHTML = `<table><tr><th></th><th>Profile</th><th>Target</th><th>Range</th><th>Value</th></tr>${rows
    .map(({ target, value, status }) => {
      const def = METRIC_DEFS.find((metric) => metric.key === target.metric);
      const fmt = def?.fmt ?? 'number';
      const range = `${target.min !== undefined ? formatMetric(target.min, fmt) : '...'} - ${target.max !== undefined ? formatMetric(target.max, fmt) : '...'}`;
      return `<tr><td class="${status}">${status === 'pass' ? 'PASS' : status === 'low' ? 'LOW' : status === 'high' ? 'HIGH' : 'n/a'}</td><td>${target.profile}</td>
        <td>${target.label ?? def?.label ?? target.metric}</td><td>${range}</td><td>${formatMetric(value, fmt)}</td></tr>`;
    })
    .join('')}</table>`;
}

fetch('presets/targets.json')
  .then((response) => (response.ok ? response.json() : []))
  .then((list) => {
    targets = list;
  })
  .catch(() => {});

// --- sweep ------------------------------------------------------------------------------------------------------

function range(from, to, step) {
  if (!(step > 0) || to < from) {
    return [from];
  }
  const count = Math.round((to - from) / step);
  return Array.from({ length: count + 1 }, (_, i) => Number((from + i * step).toFixed(6)));
}

$('runSweep').addEventListener('click', async () => {
  const pathA = $('sweepA').value.trim();
  const pathB = $('sweepB').value.trim();
  if (!(pathA in defaults) || (pathB && !(pathB in defaults))) {
    $('log').textContent = 'unknown sweep parameter';
    return;
  }
  const valuesA = range(Number($('aFrom').value), Number($('aTo').value), Number($('aStep').value));
  const valuesB = pathB ? range(Number($('bFrom').value), Number($('bTo').value), Number($('bStep').value)) : [null];
  const scenario = readScenario();
  const profile = $('sweepProfile').value;
  const metric = $('sweepMetric').value;
  const cells = valuesA.flatMap((a) => valuesB.map((b) => ({ a, b })));
  const jobs = cells.flatMap((cell, index) =>
    buildJobs(scenario, profile, { [pathA]: cell.a, ...(pathB ? { [pathB]: cell.b } : {}) }, index).map((job) => {
      job.params.timeline = false;
      return job;
    })
  );
  signal = { cancelled: false };
  setBusy(true);
  const results = await runJobs(jobs, { concurrency: scenario.concurrency, onProgress, signal });
  setBusy(false);
  showErrors(results.filter(Boolean));
  const byCell = cells.map(() => []);
  jobs.forEach((job, i) => {
    if (results[i]?.ok) {
      byCell[job.tag].push(results[i].data);
    }
  });
  const values = byCell.map((runs) => (runs.length ? aggregate(runs)[metric] : null));
  const finite = values.filter((value) => value !== null);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const fmt = METRIC_DEFS.find((item) => item.key === metric).fmt;
  const heat = (value) => {
    if (value === null) {
      return '';
    }
    const share = max === min ? 0.5 : (value - min) / (max - min);
    return `style="background: hsl(200 80% ${85 - share * 45}%)"`;
  };
  const cell = (i) => `<td class="heat" ${heat(values[i])}>${formatMetric(values[i], fmt)}</td>`;
  const header = pathB ? `<tr><th>${pathA} \\ ${pathB}</th>${valuesB.map((b) => `<th>${b}</th>`).join('')}</tr>` : `<tr><th>${pathA}</th><th>${metric}</th></tr>`;
  const body = valuesA
    .map((a, ia) => `<tr><th>${a}</th>${valuesB.map((b, ib) => cell(ia * valuesB.length + ib)).join('')}</tr>`)
    .join('');
  $('sweepBox').hidden = false;
  $('sweepInfo').textContent = `${profile}, ${scenario.seeds} seeds per cell, metric: ${METRIC_DEFS.find((item) => item.key === metric).label}`;
  $('sweepResult').innerHTML = `<table>${header}${body}</table>`;
});

// --- presets and export -----------------------------------------------------------------------------------------

function download(name, text, type) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function applyPreset(preset) {
  overrides = { ...(preset.overrides ?? {}) };
  Object.keys(overrides).forEach((path) => {
    if (!(path in defaults)) {
      delete overrides[path];
    }
  });
  applyScenario(preset.scenario);
  $('presetInfo').textContent = preset.name ? `loaded: ${preset.name}` : '';
  renderParams();
}

$('presetSave').addEventListener('click', () => {
  const name = `preset-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
  download(`${name}.json`, JSON.stringify({ name, scenario: readScenario(), overrides }, null, 2), 'application/json');
});
$('presetFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    applyPreset(JSON.parse(await file.text()));
  }
});
$('presetLoad').addEventListener('click', async () => {
  const file = $('presetList').value;
  if (file) {
    applyPreset(await (await fetch(`presets/${file}`)).json());
  }
});
fetch('presets/index.json')
  .then((response) => (response.ok ? response.json() : []))
  .then((list) => {
    $('presetList').innerHTML = list.map((item) => `<option value="${item.file}">${item.name}</option>`).join('');
  })
  .catch(() => {});

$('exportJson').addEventListener('click', () => {
  if (last) {
    download('balance-results.json', JSON.stringify({ scenario: last.scenario, overrides: last.overrides, aggregates: last.aggregates, runs: last.runs }), 'application/json');
  }
});
$('exportCsv').addEventListener('click', () => {
  if (!last) {
    return;
  }
  const head = 'profile,seed,outcome,timeMs,score,livesLost,bossReached,bossKillMs,shots,hits,damageLife,pickupsSpawned,pickupsCollected';
  const lines = Object.keys(last.runs).flatMap((profile) =>
    last.runs[profile].map((run) =>
      [
        profile, run.seed, run.outcome, run.timeMs, run.score, run.livesLost, run.boss.reached, run.boss.timeToKill ?? '', run.shots, run.hits,
        run.damage.projectileLife, run.pickups.spawned, Object.values(run.pickups.collected).reduce((total, value) => total + value, 0),
      ].join(',')
    )
  );
  download('balance-runs.csv', [head, ...lines].join('\n'), 'text/csv');
});

renderParams();
