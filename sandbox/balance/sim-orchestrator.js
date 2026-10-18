// Runs simulated games in hidden iframes (run.html), several at a time, and collects their results.

let nextId = 1;

/**
 * Runs one game in an iframe.
 * @param {object} params run parameters (see boot.js)
 * @param {number} timeoutMs wall clock limit
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
function runOne(params, timeoutMs) {
  return new Promise((resolve) => {
    const id = `run-${nextId}`;
    nextId += 1;
    const frame = document.createElement('iframe');
    frame.style.cssText = `position:fixed;left:-9999px;top:0;width:450px;height:${params.h ?? 640}px;border:0`;
    let timer = null;
    const done = (result) => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      frame.remove();
      resolve(result);
    };
    const onMessage = (event) => {
      if (event.source !== frame.contentWindow || event.data?.id !== id) {
        return;
      }
      if (event.data.type === 'sim-result') {
        done({ ok: true, data: event.data.data });
      } else if (event.data.type === 'sim-error') {
        done({ ok: false, error: event.data.error });
      }
    };
    window.addEventListener('message', onMessage);
    timer = setTimeout(() => done({ ok: false, error: 'wall clock timeout' }), timeoutMs);
    frame.src = `run.html#${encodeURIComponent(JSON.stringify({ ...params, id }))}`;
    document.body.appendChild(frame);
  });
}

/**
 * @param {{params: object}[]} jobs
 * @param {{concurrency?: number, timeoutMs?: number, onProgress?: (done: number, total: number) => void, signal?: {cancelled: boolean}}} [options]
 * @returns {Promise<{ok: boolean, data?: object, error?: string}[]>} results in job order
 */
export async function runJobs(jobs, options = {}) {
  const { concurrency = 3, timeoutMs = 180000, onProgress = () => {}, signal = { cancelled: false } } = options;
  const results = new Array(jobs.length);
  let next = 0;
  let finished = 0;
  const worker = async () => {
    while (next < jobs.length && !signal.cancelled) {
      const index = next;
      next += 1;
      results[index] = await runOne(jobs[index].params, timeoutMs);
      finished += 1;
      onProgress(finished, jobs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return results;
}
