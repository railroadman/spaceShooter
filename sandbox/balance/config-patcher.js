// Classic script (not a module): it must run before any module is loaded, because the patched config
// is plugged in with an import map. Exposes window.patchConfigSource(source, overrides).
// overrides: { 'PLAYER_HEALTH': 8, 'WEAPONS.types.plasma.base.interval': 200, 'DIFFICULTY.stages.1.from': 50000 }
// A top-level number/string/boolean replaces the right side of its `export const NAME = ...;` line, so constants
// derived from it follow. Other paths are set after the whole config has been evaluated.
(function (global) {
  function patchConfigSource(source, overrides) {
    let text = source;
    const late = [];
    Object.keys(overrides || {}).forEach((path) => {
      const value = overrides[path];
      const parts = path.split('.');
      // the path ends up in generated code and in a RegExp: allow plain identifiers and array indices only
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(parts[0]) || !parts.slice(1).every((key) => /^[A-Za-z0-9_$]+$/.test(key))) {
        throw new Error('invalid config path: ' + path);
      }
      const declaration = new RegExp('^export const ' + parts[0] + '\\b', 'm');
      if (!declaration.test(text)) {
        throw new Error('config export not found: ' + parts[0]);
      }
      if (parts.length === 1) {
        if (value !== null && typeof value === 'object') {
          throw new Error('top-level object overrides are not supported: ' + path);
        }
        const line = new RegExp('^(export const ' + parts[0] + ' = )[^\n]*?;([ \t]*//[^\n]*)?\r?$', 'm');
        if (!line.test(text)) {
          throw new Error('single-line declaration not found: ' + path);
        }
        text = text.replace(line, (match, head, comment) => head + JSON.stringify(value) + ';' + (comment || ''));
        return;
      }
      late.push({ root: parts[0], keys: parts.slice(1), value: value });
    });
    if (late.length > 0) {
      text +=
        '\n;(function () {\n' +
        '  const set = (root, keys, value, path) => {\n' +
        '    let object = root;\n' +
        '    for (let i = 0; i < keys.length - 1; i += 1) {\n' +
        '      object = object == null ? undefined : object[keys[i]];\n' +
        "      if (object == null) throw new Error('config path not found: ' + path);\n" +
        '    }\n' +
        "    if (!(keys[keys.length - 1] in object)) throw new Error('config path not found: ' + path);\n" +
        '    object[keys[keys.length - 1]] = value;\n' +
        '  };\n' +
        late
          .map(
            (item) =>
              '  set(' + item.root + ', ' + JSON.stringify(item.keys) + ', ' + JSON.stringify(item.value) + ', ' +
              JSON.stringify([item.root].concat(item.keys).join('.')) + ');'
          )
          .join('\n') +
        '\n})();\n';
    }
    return text;
  }
  global.patchConfigSource = patchConfigSource;
})(window);
