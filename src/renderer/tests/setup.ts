import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Electron API
global.window = global.window || {};
(global.window as any).electronAPI = {
  fileSystem: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    openFile: vi.fn(),
    openDirectory: vi.fn(),
    watchDirectory: vi.fn(),
    unwatchDirectory: vi.fn(),
    onFileChange: vi.fn(),
    removeFileChangeListener: vi.fn(),
  },
};
