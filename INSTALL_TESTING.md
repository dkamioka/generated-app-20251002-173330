# Testing Dependencies Installation Guide

This guide helps you install all necessary dependencies for running tests.

## Prerequisites

- Node.js 18.x or 20.x
- npm or bun package manager

## Step-by-Step Installation

### 1. Install Core Testing Dependencies

```bash
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8
```

**Or with Bun:**
```bash
bun add -d vitest @vitest/ui @vitest/coverage-v8
```

### 2. Install React Testing Library

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### 3. Install Playwright

```bash
npm install --save-dev @playwright/test
```

### 4. Install Playwright Browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers (~500MB).

**For CI environments (smaller download):**
```bash
npx playwright install --with-deps chromium
```

### 5. Install Happy DOM (Alternative to jsdom)

```bash
npm install --save-dev happy-dom
```

## Complete Installation Command

Install everything at once:

```bash
npm install --save-dev \
  vitest \
  @vitest/ui \
  @vitest/coverage-v8 \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test \
  jsdom \
  happy-dom

# Then install browsers
npx playwright install
```

## Verify Installation

### Check Vitest

```bash
npx vitest --version
```

Should output: `vitest/1.x.x`

### Check Playwright

```bash
npx playwright --version
```

Should output: `Version 1.x.x`

### Run Test

```bash
# Run unit tests
npm run test:unit

# If tests run without errors, installation is successful!
```

## Troubleshooting

### Issue: Module not found '@testing-library/react'

**Solution:**
```bash
npm install --save-dev @testing-library/react
```

### Issue: Playwright browsers not found

**Solution:**
```bash
npx playwright install --force
```

### Issue: Permission denied on Linux

**Solution:**
```bash
sudo npx playwright install-deps
```

### Issue: Out of memory during tests

**Solution:**
Add to `package.json`:
```json
{
  "scripts": {
    "test": "NODE_OPTIONS='--max_old_space_size=4096' vitest"
  }
}
```

### Issue: Can't find module 'jsdom'

**Solution:**
```bash
npm install --save-dev jsdom
```

Or use `happy-dom`:
```bash
npm install --save-dev happy-dom
```

Then update `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    environment: 'happy-dom', // Change from 'jsdom'
  }
});
```

## Optional: Development Tools

### Vitest VS Code Extension

Install from VS Code marketplace:
- Search for "Vitest"
- Install extension by Vitest team

### Playwright VS Code Extension

Install from VS Code marketplace:
- Search for "Playwright Test for VS Code"
- Install extension by Microsoft

## Package Versions

Recommended versions (update as needed):

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@playwright/test": "^1.40.0",
    "jsdom": "^23.0.0",
    "happy-dom": "^12.0.0"
  }
}
```

## Disk Space Requirements

- Node modules: ~500MB
- Playwright browsers: ~500MB
- **Total: ~1GB**

## Next Steps

After installation:

1. Read [TESTING.md](./TESTING.md) for comprehensive guide
2. Run `npm test` to execute all tests
3. Run `npm run test:coverage` to see coverage report
4. Run `npm run test:e2e` to test full user flows

## Getting Help

If you encounter issues:

1. Check [Vitest Troubleshooting](https://vitest.dev/guide/troubleshooting.html)
2. Check [Playwright Troubleshooting](https://playwright.dev/docs/troubleshooting)
3. Clear cache: `rm -rf node_modules && npm install`
4. Open an issue on GitHub

---

**Happy Testing! 🎉**
