import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiPort = process.env.API_PORT ?? '3005';

export default defineConfig({
  root: path.resolve(__dirname, 'client'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
  },
  server: {
    port: 9433,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://localhost:${apiPort}`,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
});
