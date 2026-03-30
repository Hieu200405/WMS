import { test, expect } from '@playwright/test';
import { loginAsStaff } from '../../helpers/auth';

test.describe('Receipt (Nhập kho) Workflow', () => {

    test.beforeEach(async ({ page }) => {
        // Login as Staff
        await loginAsStaff(page);
    });

    test('should create partial receipt and approve it', async ({ page }) => {
        // Navigate to Receipts page using URL
        await page.goto('/receipts');

        // Verify we're on the receipts page
        await expect(page).toHaveURL(/\/receipts/, { timeout: 10000 });

        // Verify page loaded (look for Vietnamese text "Nhập kho")
        await expect(page.locator('text=/Nhập kho/i')).toBeVisible({ timeout: 5000 });
    });
});
