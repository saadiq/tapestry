/**
 * Shared types between main and renderer processes
 */

export interface IElectronAPI {
  // Platform info
  platform: NodeJS.Platform;

  // Placeholder for future IPC methods
  // Will be expanded in Phase 2 with file system operations
}

// Extend Window interface to include our API
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
