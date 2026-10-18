// Classic script: reads the run parameters, builds the patched config and plugs it in with an import map,
// then loads run.js. Parameters come from the URL hash (JSON) and/or the query string.
(function () {
  const defaults = { id: '', seed: '1', limit: 600000, profile: 'idle', overrides: {}, h: 640, render: false, timeline: true };
  const query = Object.fromEntries(new URLSearchParams(location.search));
  let hash = {};
  if (location.hash.length > 1) {
    try {
      hash = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    } catch (error) {
      hash = {};
    }
  }
  const params = Object.assign({}, defaults, query, hash);
  params.limit = Number(params.limit);
  params.h = Number(params.h);
  params.render = params.render === true || params.render === '1';
  window.__simParams = params;

  function fail(error) {
    const message = String((error && error.stack) || error);
    console.error('[sim] boot error', message);
    window.__simError = message;
    window.parent.postMessage({ type: 'sim-error', id: params.id, error: message }, '*');
  }

  const configUrl = new URL('src/config.js', document.baseURI).href;
  fetch(configUrl)
    .then((response) => response.text())
    .then((source) => {
      const patched = window.patchConfigSource(source, params.overrides);
      const blobUrl = URL.createObjectURL(new Blob([patched], { type: 'text/javascript' }));
      const map = document.createElement('script');
      map.type = 'importmap';
      map.textContent = JSON.stringify({ imports: { [configUrl]: blobUrl } });
      document.head.appendChild(map);
      return import('./run.js?v=' + Date.now());
    })
    .catch(fail);
})();
