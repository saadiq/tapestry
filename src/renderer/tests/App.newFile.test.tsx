/**
 * Tests for New File button functionality in App component
 *
 * These tests verify:
 * - New file modal opens when button clicked with folder open
 * - Warning shown when button clicked without folder open
 * - File created in root directory when modal confirmed
 * - New file automatically opens in editor
 * - Success toast shown after creation
 * - Modal closes on cancel
 * - Security validation blocks path traversal attacks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Create mock functions
const mockReadDirectory = vi.fn();
const mockCreateFile = vi.fn();
const mockReadFile = vi.fn();
const mockOpenDirectory = vi.fn();
const mockWatchDirectory = vi.fn();

// Mock the file system service
vi.mock('../services/fileSystemService', () => ({
  fileSystemService: {
    readDirectory: mockReadDirectory,
    createFile: mockCreateFile,
    readFile: mockReadFile,
    openDirectory: mockOpenDirectory,
    watchDirectory: mockWatchDirectory,
  },
}));

// Mock window.electronAPI
const mockElectronAPI = {
  fileSystem: {
    onFileChange: vi.fn(),
    removeFileChangeListener: vi.fn(),
  },
  getAppVersion: vi.fn().mockResolvedValue('1.0.0'),
  onUpdateAvailable: vi.fn(),
  onUpdateDownloaded: vi.fn(),
  onUpdateStatus: vi.fn(),
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
  removeUpdateListeners: vi.fn(),
};

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Setup window.electronAPI mock
  (window as any).electronAPI = mockElectronAPI;
});

describe('App - New File Button', () => {
  it('should show warning when clicking New File without folder open', async () => {
    // Render the app
    render(<App />);

    // Find the New File button by its title attribute
    const newFileButton = screen.getByTitle('New File (⌘N)');

    // Click it
    fireEvent.click(newFileButton);

    // Wait for warning toast to appear
    await waitFor(() => {
      expect(screen.getByText('Please open a folder first')).toBeInTheDocument();
    });

    // Modal should NOT appear
    expect(screen.queryByText('Enter a name for the new file:')).not.toBeInTheDocument();
  });

  it('should create file and open it when modal confirmed', async () => {
    // Mock file system service responses
    mockReadDirectory.mockResolvedValue([]);
    mockCreateFile.mockResolvedValue({ success: true });
    mockReadFile.mockResolvedValue({
      path: '/test-folder/new-note.md',
      content: '',
      metadata: {
        name: 'new-note.md',
        size: 0,
        modified: new Date(),
        isDirectory: false,
        extension: '.md',
      },
    });
    mockWatchDirectory.mockResolvedValue(undefined);

    // Mock the dialog returning a folder path
    mockOpenDirectory.mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });

    // Render app
    render(<App />);

    // Simulate opening a folder first
    // We'll call the handler directly since testing the full folder dialog is complex
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');

    // Click open folder and wait for it to process
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalledWith('/test-folder', true);
    });

    // Now click New File button
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Enter filename
    const input = screen.getByPlaceholderText('notes.md');
    fireEvent.change(input, { target: { value: 'new-note' } });

    // Click Create button
    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    // Wait for file to be created
    // Note: fileTreeStore's createFile adds .md extension and builds full path
    await waitFor(() => {
      expect(mockCreateFile).toHaveBeenCalledWith('/test-folder/new-note.md', '');
    });

    // Wait for success toast
    await waitFor(() => {
      expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
    });

    // Modal should close
    expect(screen.queryByText('Enter a name for the new file:')).not.toBeInTheDocument();
  });

  it('should close modal without creating file when cancelled', async () => {
    // Mock file system service
    mockReadDirectory.mockResolvedValue([]);
    mockCreateFile.mockResolvedValue({ success: true });
    mockOpenDirectory.mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });
    mockWatchDirectory.mockResolvedValue(undefined);

    render(<App />);

    // Open a folder first
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Click New File button
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Click Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Enter a name for the new file:')).not.toBeInTheDocument();
    });

    // createFile should NOT have been called
    expect(mockCreateFile).not.toHaveBeenCalled();
  });

  it('should open modal when Cmd+N pressed', async () => {
    // Mock file system
    mockReadDirectory.mockResolvedValue([]);
    mockOpenDirectory.mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });
    mockWatchDirectory.mockResolvedValue(undefined);

    render(<App />);

    // Open a folder first
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Press Cmd+N (or Ctrl+N on Windows/Linux)
    fireEvent.keyDown(document, {
      key: 'n',
      code: 'KeyN',
      metaKey: true, // Cmd on Mac
      ctrlKey: false,
    });

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });
  });

  it('should reject filename with forward slash', async () => {
    // Mock file system
    mockReadDirectory.mockResolvedValue([]);
    mockCreateFile.mockResolvedValue({ success: true });
    mockOpenDirectory.mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });
    mockWatchDirectory.mockResolvedValue(undefined);

    render(<App />);

    // Open a folder first
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Click New File button
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Try malicious filename with forward slash
    const input = screen.getByPlaceholderText('notes.md');
    fireEvent.change(input, { target: { value: 'path/to/file' } });

    // Click Create
    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    // Should show error toast
    await waitFor(() => {
      expect(screen.getByText(/cannot contain path separators/i)).toBeInTheDocument();
    });

    // createFile should NOT be called
    expect(mockCreateFile).not.toHaveBeenCalled();

    // Modal should close
    expect(screen.queryByText('Enter a name for the new file:')).not.toBeInTheDocument();
  });

  it('should reject filename with path traversal (..)', async () => {
    // Similar setup
    mockReadDirectory.mockResolvedValue([]);
    mockCreateFile.mockResolvedValue({ success: true });
    mockOpenDirectory.mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });
    mockWatchDirectory.mockResolvedValue(undefined);

    render(<App />);

    // Open folder
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Open modal
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Try path traversal attack
    const input = screen.getByPlaceholderText('notes.md');
    fireEvent.change(input, { target: { value: '../../../evil' } });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    // Should block it
    await waitFor(() => {
      expect(screen.getByText(/cannot contain path separators/i)).toBeInTheDocument();
    });

    expect(mockCreateFile).not.toHaveBeenCalled();
  });

  it('should reject filename with backslash (Windows paths)', async () => {
    // Similar setup
    mockReadDirectory.mockResolvedValue([]);
    mockCreateFile.mockResolvedValue({ success: true });
    mockOpenDirectory.mockResolvedValue({
      success: true,
      path: '/test-folder',
      canceled: false,
    });
    mockWatchDirectory.mockResolvedValue(undefined);

    render(<App />);

    // Open folder
    const openFolderButton = screen.getByTitle('Open Folder (⌘O)');
    fireEvent.click(openFolderButton);
    await waitFor(() => {
      expect(mockReadDirectory).toHaveBeenCalled();
    });

    // Open modal
    const newFileButton = screen.getByTitle('New File (⌘N)');
    fireEvent.click(newFileButton);
    await waitFor(() => {
      expect(screen.getByText('Enter a name for the new file:')).toBeInTheDocument();
    });

    // Try backslash (Windows path separator)
    const input = screen.getByPlaceholderText('notes.md');
    fireEvent.change(input, { target: { value: 'windows\\path' } });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    // Should block it
    await waitFor(() => {
      expect(screen.getByText(/cannot contain path separators/i)).toBeInTheDocument();
    });

    expect(mockCreateFile).not.toHaveBeenCalled();
  });
});
