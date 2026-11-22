import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Exposes `virtual:asset-files`: a map of every file that actually exists under
 * public/assets (path -> mtime). The game only requests optional art that exists,
 * so missing teammate files never cause 404 spam, and adding/replacing a PNG
 * triggers a reload with a cache-busting version.
 */
function assetIndex(): Plugin {
  const id = 'virtual:asset-files';
  const rid = '\0' + id;
  const root = path.resolve(__dirname, 'public');
  const walk = (dir: string, out: Record<string, number> = {}) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (!e.name.startsWith('.') && !e.name.endsWith('.md')) out[path.relative(root, p).split(path.sep).join('/')] = Math.floor(fs.statSync(p).mtimeMs);
    }
    return out;
  };
  return {
    name: 'asset-index',
    resolveId: (i) => (i === id ? rid : undefined),
    load: (i) => (i === rid ? `export default ${JSON.stringify(walk(path.join(root, 'assets')))};` : undefined),
    configureServer(server) {
      const assetsDir = path.join(root, 'assets');
      server.watcher.add(assetsDir);
      const refresh = (f: string) => {
        if (!f.startsWith(assetsDir)) return;
        const m = server.moduleGraph.getModuleById(rid);
        if (m) server.moduleGraph.invalidateModule(m);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
      server.watcher.on('change', refresh);
    },
  };
}

export default defineConfig({
  plugins: [react(), assetIndex()],
  base: './',
  // Phaser's development source map is large; keep dependency prebundling lean.
  optimizeDeps: { esbuildOptions: { sourcemap: false } },
  define: { __BUILD_HASH__: JSON.stringify(Date.now().toString(36)) },
  server: { port: 5173, host: true },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
