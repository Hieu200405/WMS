# E2E Tests - WMS Project

## 📋 Overview

End-to-End tests for the Warehouse Management System using Playwright. These tests verify the entire application flow from the user's perspective.

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB running
- Backend and Frontend servers running (or will be started automatically)

### Installation
```bash
cd wms/e2e
npm install
npx playwright install
```

### Run Tests
```bash
# Run all E2E tests
npm test

# Run tests in UI mode (recommended for development)
npx playwright test --ui

# Run specific test file
npx playwright test 01-auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Debug tests
npx playwright test --debug
```

---

## 📁 Structure

```
e2e/
├── e2e/
│   └── tests/
│       ├── 01-auth.spec.ts          # Authentication tests
│       ├── 02-stocktake.spec.ts     # Stocktake workflow tests
│       └── ... (more test files)
├── helpers/
│   └── auth.ts                      # Helper functions
├── playwright.config.ts             # Playwright configuration
└── package.json
```

---

## 🧪 Test Scenarios

### ✅ Implemented

#### 1. Authentication Flow (`01-auth.spec.ts`)
- ✅ Display login page correctly
- ✅ Login as Admin
- ✅ Login as Manager
- ✅ Login as Staff
- ✅ Show error with invalid credentials
- ✅ Show validation error with empty fields
- ✅ Persist authentication after reload
- ✅ Logout successfully

#### 2. Stocktake Flow (`02-stocktake.spec.ts`)
- ✅ Create stocktake draft
- ✅ Approve stocktake and create adjustment
- ✅ Apply stocktake and update inventory
- ✅ Show delta/discrepancy
- ⏳ Permission checks (staff cannot approve)

### ⏳ Planned

#### 3. Receipt Flow
- Create receipt
- Add items to receipt
- Approve receipt
- Verify inventory increase
- Verify expense transaction

#### 4. Delivery Flow
- Create delivery
- Select items
- Approve delivery
- Verify inventory decrease
- Verify revenue transaction

#### 5. Warehouse Management
- Create warehouse
- Create zones, aisles, racks, bins
- Move inventory between locations

#### 6. Reporting
- View dashboard
- Generate reports
- Export data

---

## 🛠 Configuration

### playwright.config.ts

Key settings:
- **baseURL**: `http://localhost:5173` (Frontend)
- **workers**: 1 (sequential execution to avoid DB conflicts)
- **fullyParallel**: false
- **retries**: 2 on CI, 0 locally
- **webServer**: Automatically starts `npm run dev`

### Environment Variables

Create `.env` file in `e2e/` directory if needed:
```env
BASE_URL=http://localhost:5173
API_URL=http://localhost:4001
```

---

## 📊 Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

Reports include:
- Test results
- Screenshots on failure
- Videos on failure
- Traces for debugging

---

## 🐛 Debugging

### View Test in UI Mode
```bash
npx playwright test --ui
```

### Debug Specific Test
```bash
npx playwright test --debug 01-auth.spec.ts
```

### View Trace
```bash
npx playwright show-trace trace.zip
```

---

## ✍️ Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('should do something', async ({ page }) => {
    // Test steps
    await page.goto('/');
    await page.click('button');
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Using Helpers
```typescript
import { loginAsAdmin, navigateTo } from '../helpers/auth';

test('admin can access reports', async ({ page }) => {
  await loginAsAdmin(page);
  await navigateTo(page, 'Reports');
  await expect(page).toHaveURL(/.*reports/);
});
```

---

## 📝 Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Avoid hardcoded waits** - use Playwright's auto-waiting
3. **One assertion per test** when possible
4. **Clean up test data** in afterEach hooks
5. **Use descriptive test names** that explain what is being tested
6. **Group related tests** in describe blocks
7. **Use helpers** for common operations

---

## 🔍 Troubleshooting

### Tests are flaky
- Check for timing issues
- Use `waitForLoadState('networkidle')` if needed
- Increase timeout for specific actions

### Cannot find element
- Check if element selector is correct
- Use `page.pause()` to inspect page
- Use Playwright Inspector: `npx playwright test --debug`

### Server not starting
- Check if ports 5173 and 4001 are available
- Manually start servers: `npm run dev` in wms directory
- Check `webServer` config in playwright.config.ts

---

## 📈 Coverage Goals

- ✅ Authentication: 100%
- ✅ Stocktake: 80%
- ⏳ Receipt: 0%
- ⏳ Delivery: 0%
- ⏳ Warehouse: 0%
- ⏳ Reports: 0%

**Overall Target**: 80% of critical user flows

---

## 🚦 CI/CD Integration

### GitHub Actions (example)
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📞 Support

For issues or questions:
1. Check Playwright docs: https://playwright.dev
2. Review test logs and screenshots
3. Use `--debug` mode for step-by-step execution

---

*Last updated: 2026-01-04*
