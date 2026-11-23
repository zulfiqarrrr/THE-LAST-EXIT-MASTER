import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5178,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: './index.html',
        viewer: './viewer.html',
      },
    },
  },
});
