import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(join(dir, e.name)) : join(dir, e.name)))).flat();
}
export async function buildServiceWorker(root = process.cwd()) {
  const output = join(root, 'dist');
  const assets = (await files(output)).filter(p => relative(output, p) !== 'sw.js').sort();
  const hash = createHash('sha256'), urls = ['/'];
  for (const file of assets) {
    const path = '/' + relative(output, file).split(/[\\/]/).map(encodeURIComponent).join('/');
    hash.update(path).update(await readFile(file)); urls.push(path);
  }
  const version = hash.digest('hex').slice(0, 16);
  const source = await readFile(join(root, 'scripts/sw-template.js'), 'utf8');
  await writeFile(join(output, 'sw.js'), `const CACHE = 'kasse-${version}';\nconst ASSETS = ${JSON.stringify(urls)};\n` + source);
  return { version, files: urls.length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await buildServiceWorker();
  console.log(`Offline-Cache: kasse-${result.version} (${result.files} Dateien)`);
}
