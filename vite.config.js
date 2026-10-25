import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.cjs',
        vite: {
          build: {
            lib: {
              entry: 'electron/main.cjs',
              formats: ['cjs'],
              fileName: () => 'main.cjs',
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.cjs',
        vite: {
          build: {
            rollupOptions: {
              output: {
                entryFileNames: '[name].cjs',
              },
            },
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
