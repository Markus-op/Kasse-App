import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cp, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const library = fileURLToPath(new URL('./Bilder/', import.meta.url));
const mime: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', md: 'text/markdown; charset=utf-8' };
export default defineConfig({
  plugins: [react(), {
    name: 'kasse-bildbibliothek',
    configureServer(server) {
      server.middlewares.use('/Bilder', async (req, res) => {
        try {
          const name = decodeURIComponent((req.url ?? '').split('?')[0]).slice(1);
          if (!name || /[/\\]/.test(name) || name.startsWith('.') || !(name === 'Liste.md' || /\.(svg|png|jpe?g|webp|gif|avif)$/i.test(name))) { res.statusCode = 404; res.end(); return; }
          const content = await readFile(join(library, name));
          res.setHeader('Content-Type', mime[name.split('.').pop()!.toLowerCase()] || 'application/octet-stream');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.end(content);
        } catch { res.statusCode = 404; res.end(); }
      });
    },
    async closeBundle() { await cp(library, fileURLToPath(new URL('./dist/Bilder/', import.meta.url)), { recursive: true }); }
  }],
  build: { target: 'es2022' }
});
