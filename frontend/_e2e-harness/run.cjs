// Optional end-to-end smoke test: renders the REAL app (nav, routes, pages) in jsdom against a stubbed API,
// as every role, and drives the main workflows. It does not touch your backend or database.
//
//   cd frontend
//   npm install --no-save jsdom@24      # test-only; does not modify package.json
//   node _e2e-harness/run.cjs
const path = require('path');
const os = require('os');
const FE = path.resolve(__dirname, '..');
const esbuild = require(path.join(FE, 'node_modules/esbuild'));
const outfile = path.join(os.tmpdir(), 'cleanconnect-e2e-bundle.cjs');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'scenarios.tsx')], bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic',
  outfile, logLevel: 'error', define: { 'import.meta.env.VITE_API_URL': '"http://stub/api"' },
});
const { JSDOM } = require(path.join(FE, 'node_modules/jsdom'));
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const k of ['window', 'document', 'localStorage', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'KeyboardEvent', 'Event', 'File'])
  Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
// jsdom cannot draw on <canvas>; a no-op 2D context lets the QR code mount.
dom.window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ width: 0 })), set: (t, k, v) => { t[k] = v; return true; } });
dom.window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);
require(outfile);
