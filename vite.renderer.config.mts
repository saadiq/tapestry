import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Ignore user content directories to prevent HMR reload when saving documents
      ignored: [
        '**/docs/**',       // Ignore docs directory
        '**/*.md',          // Ignore all markdown files (user content)
        '!**/src/**'        // But still watch files in src (source code)
      ]
    }
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main_window: 'index.html',
      },
    },
  },
});
