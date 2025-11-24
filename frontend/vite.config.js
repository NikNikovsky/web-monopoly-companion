import { defineConfig } from 'vite';
import path from 'path';

// Use dynamic import for the Svelte plugin to avoid ESM/CJS resolution issues
export default async () => {
  const mod = await import('@sveltejs/vite-plugin-svelte');
  const { svelte } = mod;
  return defineConfig({
    plugins: [svelte()],
    root: '.',
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3000'
      }
    },
    build: {
      outDir: path.resolve(__dirname, '../public'),
      emptyOutDir: false
    }
  });
};
