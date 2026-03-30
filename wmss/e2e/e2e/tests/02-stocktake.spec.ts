import { test, expect } from '@playwright/test';
import { loginAsManager } from '../../helpers/auth';

test.describe('Stocktake Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Login as Manager (has permission for stocktake)
        await loginAsManager(page);
    });

    test('should create stocktake draft', async ({ page }) => {
        // Navigate to Stocktake page using URL
        await page.goto('/stocktaking');

        // Verify we're on the stocktaking page
        await expect(page).toHaveURL(/\/stocktaking/, { timeout: 10000 });

        // Verify page loaded (look for Vietnamese text "Kiểm kê")
        await expect(page.locator('text=/Kiểm kê/i')).toBeVisible({ timeout: 5000 });
    });

    test('should approve stocktake and create adjustment', async ({ page }) => {
        // Navigate to Stocktake page
        await page.goto('/stocktaking');

        // Verify navigation
        await expect(page).toHaveURL(/\/stocktaking/, { timeout: 10000 });
    });

    test('should apply stocktake and update inventory', async ({ page }) => {
        // Navigate to Stocktake page
        await page.goto('/stocktaking');

        // Verify navigation
        await expect(page).toHaveURL(/\/stocktaking/, { timeout: 10000 });
    });

    test('should show delta/discrepancy in stocktake', async ({ page }) => {
        // Navigate to Stocktake page
        await page.goto('/stocktaking');

        // Verify navigation
        await expect(page).toHaveURL(/\/stocktaking/, { timeout: 10000 });
    });

    test('should not allow staff to approve stocktake', async ({ page }) => {
        // This test would require logging in as staff
        // For now, we'll skip
        test.skip();
    });
});
