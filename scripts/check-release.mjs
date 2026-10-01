import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function loadTs(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => name === 'react-native' ? { StyleSheet: { create: value => value } } : require(name) });
  return exports;
}
const { getDeveloperAccess } = loadTs('../lib/developerAccess.ts');
assert.equal(getDeveloperAccess(null, 'regular'), null);
assert.equal(getDeveloperAccess({ userId: 'admin', level: 'admin' }, 'admin'), 'admin');
assert.equal(getDeveloperAccess({ userId: 'dev', level: 'developer' }, 'dev'), 'developer');
assert.equal(getDeveloperAccess({ userId: 'admin', level: 'admin' }, 'regular'), null, 'Switching accounts must immediately drop the previous grant');
assert.equal(getDeveloperAccess({ userId: 'admin', level: 'admin' }, ''), null, 'Signing out must drop admin access');
assert.equal(getDeveloperAccess({ userId: '', level: 'admin' }, ''), null);

const { getWorkspacePalette, designNames, mosaicTileColors } = loadTs('../lib/workspaceDesign.ts');
const fallback = { background: '#101C24', surface: '#1B2C37', inset: '#101C24', accent: '#82B6D9', muted: '#B6C7D1', text: '#EDF3F5', hot: '#EDF3F5', onAccent: '#101C24' };
function luminance(hex) {
  return hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + 0.05) / (values[1] + 0.05); }
for (const color of mosaicTileColors) assert.ok(contrast('#FFFFFF', color) >= 4.5, 'Mosaic tile labels must be readable');
for (const mode of Object.keys(designNames)) for (const light of [false, true]) {
  const palette = getWorkspacePalette(mode, light, fallback);
  for (const color of Object.values(palette)) assert.match(color, /^#[0-9a-f]{6}$/i);
  assert.ok(contrast(palette.text, palette.surface) >= 4.5, `${mode}/${light}: body text contrast`);
  assert.ok(contrast(palette.muted, palette.surface) >= 4.5, `${mode}/${light}: secondary text contrast`);
  assert.ok(contrast(palette.onAccent, palette.accent) >= 4.5, `${mode}/${light}: action text contrast`);
}
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url)));
assert.equal(pkg.version, '0.2.3'); assert.equal(app.expo.version, pkg.version); assert.equal(lock.version, pkg.version); assert.equal(lock.packages[''].version, pkg.version);
assert.ok(app.expo.android.versionCode > 1);
console.log('Release checks passed: account-scoped access, 12 readable workspace palettes, synchronized 0.2.3 versions.');
