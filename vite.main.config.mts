import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // Ensure node modules can be resolved
    browserField: false,
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        // Temporarily removed for v0.0.2 - auto-updater disabled
        // 'electron-updater',
        // 'electron-log',
      ],
    },
  },
});
