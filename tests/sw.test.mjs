import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildServiceWorker } from '../scripts/build-sw.mjs';
import vm from 'node:vm';
const template = await readFile(new URL('../scripts/sw-template.js', import.meta.url), 'utf8');
function worker({ cacheFailure = false, clients = 1 } = {}) {
  const events = new Map(), deleted = [], calls = [];
  const cache = { addAll: async urls => { calls.push(urls); if (cacheFailure) throw new Error('offline during install'); }, match: async url => ({ cached: url }) };
  const scope = { location: { origin: 'https://kasse.example' }, addEventListener: (name, fn) => events.set(name, fn), skipWaiting: () => calls.push('activate'), clients: { claim: async () => calls.push('claim'), matchAll: async () => Array(clients).fill({}) } };
  vm.runInNewContext("const CACHE='kasse-new';const ASSETS=['/','/index.html','/assets/app.js','/Bilder/Mein%20Bild.png'];" + template, { self: scope, caches: { open: async () => cache, keys: async () => ['kasse-old','kasse-new','other-app'], delete: async name => deleted.push(name) }, URL, fetch: async req => ({ network: req }) });
  return { events, deleted, calls };
}
test('SW install fills a new cache and never forces activation', async () => {
  const w = worker(); let promise; w.events.get('install')({ waitUntil: p => promise = p }); await promise;
  assert.equal(w.calls.length, 1); assert.ok(w.calls[0].includes('/Bilder/Mein%20Bild.png')); assert.deepEqual(w.deleted, []);
  w.events.get('message')({ data: { type: 'ACTIVATE_UPDATE' } }); assert.equal(w.calls.at(-1), 'activate');
});
test('failed SW install cannot delete the previous working release', async () => {
  const w = worker({ cacheFailure: true }); let promise; w.events.get('install')({ waitUntil: p => promise = p }); await assert.rejects(promise); assert.deepEqual(w.deleted, []);
});
test('activation cleans only app caches and retains old caches for other tabs', async () => {
  const w = worker(); let promise; w.events.get('activate')({ waitUntil: p => promise = p }); await promise;
  assert.deepEqual(w.deleted, ['kasse-old']);
  const multi = worker({ clients: 2 }); multi.events.get('activate')({ waitUntil: p => promise = p }); await promise; assert.deepEqual(multi.deleted, []);
});
test('offline navigation and assets return cached responses; unrelated requests pass through', async () => {
  const w = worker(); let response;
  w.events.get('fetch')({ request: { method: 'GET', url: 'https://kasse.example/', mode: 'navigate' }, respondWith: p => response = p });
  assert.equal((await response).cached, '/index.html');
  w.events.get('fetch')({ request: { method: 'GET', url: 'https://kasse.example/Bilder/Mein%20Bild.png', mode: 'cors' }, respondWith: p => response = p });
  assert.equal((await response).cached, '/Bilder/Mein%20Bild.png');
  let intercepted = false;
  w.events.get('fetch')({ request: { method: 'POST', url: 'https://kasse.example/', mode: 'cors' }, respondWith: () => intercepted = true }); assert.equal(intercepted, false);
});
test('build hash covers worker behavior and images and URL-encodes filenames', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kasse-sw-'));
  try {
    await mkdir(join(dir, 'dist/Bilder'), { recursive: true }); await mkdir(join(dir, 'scripts'));
    await writeFile(join(dir, 'scripts/sw-template.js'), template); await writeFile(join(dir, 'dist/index.html'), '<html>v1</html>'); await writeFile(join(dir, 'dist/Bilder/Mein Bild.svg'), '<svg/>');
    await buildServiceWorker(dir); const first = await readFile(join(dir, 'dist/sw.js'), 'utf8');
    assert.ok(first.includes('/Bilder/Mein%20Bild.svg'));
    await buildServiceWorker(dir); assert.equal(await readFile(join(dir, 'dist/sw.js'), 'utf8'), first);
    await writeFile(join(dir, 'scripts/sw-template.js'), template + '\n// Updated worker behavior\n');
    await buildServiceWorker(dir);
    const workerUpdate = await readFile(join(dir, 'dist/sw.js'), 'utf8');
    assert.notEqual(workerUpdate.split('\n')[0], first.split('\n')[0]);
    await writeFile(join(dir, 'dist/Bilder/Mein Bild.svg'), '<svg>updated</svg>');
    await buildServiceWorker(dir); assert.notEqual((await readFile(join(dir, 'dist/sw.js'), 'utf8')).split('\n')[0], workerUpdate.split('\n')[0]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
