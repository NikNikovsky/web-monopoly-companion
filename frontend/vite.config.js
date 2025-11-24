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
      fs: {
        strict: true,
        allow: [
          path.resolve(__dirname, '.'),
          path.resolve(__dirname, '../public')
        ],
        deny: [
          path.resolve(__dirname, '../.env'),
          path.resolve(__dirname, '../node_modules'),
          path.resolve(__dirname, '../server.js'),
          path.resolve(__dirname, '../data')
        ]
      },
      middlewareMode: false,
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: false,
          rewrite: (path) => path
        }
      },
      hmr: {
        host: 'localhost',
        port: 5173,
        protocol: 'ws'
      }
    },
    build: {
      outDir: path.resolve(__dirname, '../public'),
      emptyOutDir: false,
      sourcemap: false
    }
  });
};
