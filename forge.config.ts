import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/node_modules/{electron-updater,electron-log}/**/*',
    },
    name: 'Tapestry',
    appBundleId: 'com.saadiq.tapestry',
    appCategoryType: 'public.app-category.productivity',
    icon: 'assets/icons/icon',
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      const { execSync } = await import('child_process');
      const path = await import('path');
      const fs = await import('fs');

      // Verify icon files exist before packaging
      const iconFiles = [
        'assets/icons/icon.icns',
        'assets/icons/icon.ico',
        'assets/icons/icon.png',
      ];
      console.log('Verifying icon files...');
      for (const iconPath of iconFiles) {
        if (!fs.existsSync(iconPath)) {
          throw new Error(`Missing icon file: ${iconPath}`);
        }
        console.log(`✓ Found ${iconPath}`);
      }

      // Install only the external dependencies needed at runtime
      console.log('Installing external dependencies...');
      execSync('bun add --production electron-updater electron-log', {
        cwd: buildPath,
        stdio: 'inherit',
      });
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      iconUrl: 'https://raw.githubusercontent.com/saadiq/tapestry/main/assets/icons/icon.ico',
      setupIcon: 'assets/icons/icon.ico',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        icon: 'assets/icons/icon.png',
      },
    }),
    new MakerDeb({
      options: {
        icon: 'assets/icons/icon.png',
      },
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/main/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
