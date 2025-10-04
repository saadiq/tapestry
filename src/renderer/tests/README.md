# Testing Guide

## Setup

To run tests, first install the testing dependencies:

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom @vitest/coverage-v8
```

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Files

- `setup.ts` - Global test setup and mocks for Electron API
- `App.cache.test.tsx` - Tests for multi-file cache management

## Writing Tests

The cache management tests in `App.cache.test.tsx` provide basic integration testing coverage for:

- Cache invalidation on directory changes
- Dirty state synchronization
- Auto-save timer management
- Loading states
- Memory leak prevention

For deeper integration testing with actual cache behavior, consider:

### Integration Testing Approach

1. **Use React Testing Library** to render the App with real providers
2. **Mock Electron IPC** calls in the fileSystemService
3. **Simulate user interactions** (file opening, editing, switching)
4. **Assert on cache behavior** using test utilities

### Recommended Test Utilities

Create test helpers for:

- `openFile(path)` - Simulates opening a file
- `editFile(content)` - Simulates editing content
- `getCacheSize()` - Gets current cache size
- `getCacheEntry(path)` - Gets cache entry for a file
- `triggerFileWatcher(event)` - Simulates external file changes

### Example Test Pattern

```typescript
it('should evict oldest entry when cache exceeds MAX_CACHE_SIZE', async () => {
  const { user } = renderApp();

  // Open 11 files
  for (let i = 1; i <= 11; i++) {
    await user.openFile(`/test/file${i}.md`);
    await user.editFile(`Content ${i}`);
  }

  // Verify cache size is 10 (oldest evicted)
  expect(getCacheSize()).toBe(10);

  // Verify first file was evicted
  expect(getCacheEntry('/test/file1.md')).toBeUndefined();
});
```

## Known Limitations

- Cache is managed via refs and not exposed in component props, making direct testing challenging
- File watcher events require careful mocking of Electron IPC
- Auto-save timing behavior requires async testing utilities

Consider adding:
1. A `getCacheMetrics()` method for testing (debug mode only)
2. Dependency injection for easier mocking
3. E2E tests with Playwright for complex user workflows
