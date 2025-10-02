/**
 * Preload script - runs before the renderer process loads.
 * This is where we expose a secure API to the renderer using contextBridge.
 *
 * See the Electron documentation for details on how to use preload scripts:
 * https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
 */

import { contextBridge } from 'electron';
import type { IElectronAPI } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: IElectronAPI = {
  platform: process.platform,
  // Additional IPC methods will be added here in future phases
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('🔌 Preload script loaded');
