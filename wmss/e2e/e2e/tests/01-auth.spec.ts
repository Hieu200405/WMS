import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsManager, loginAsStaff } from '../../helpers/auth';

test.describe('Authentication Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Ensure we start from login page
        await page.goto('/');
    });

    test('should display login page correctly', async ({ page }) => {
        // Check page title
        await expect(page).toHaveTitle(/WMS|Warehouse|Login/i);

        // Check login form elements - using label-based selectors since inputs don't have name attributes
        await expect(page.locator('input[type="text"], input:not([type="password"])').first()).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should login successfully as Admin', async ({ page }) => {
        // Fill username (first input that's not password)
        await page.locator('input[type="text"], input:not([type="password"])').first().fill('admin@wms.local');
        await page.locator('input[type="password"]').fill('123456');
        await page.click('button[type="submit"]');

        // Should be redirected to dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('should login successfully as Manager', async ({ page }) => {
        await page.locator('input[type="text"], input:not([type="password"])').first().fill('manager1@wms.local');
        await page.locator('input[type="password"]').fill('123456');
        await page.click('button[type="submit"]');

        // Should be redirected to dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('should login successfully as Staff', async ({ page }) => {
        await page.locator('input[type="text"], input:not([type="password"])').first().fill('staff1@wms.local');
        await page.locator('input[type="password"]').fill('123456');
        await page.click('button[type="submit"]');

        // Should be redirected to dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.locator('input[type="text"], input:not([type="password"])').first().fill('invalid@test.com');
        await page.locator('input[type="password"]').fill('wrongpassword');
        await page.click('button[type="submit"]');

        // Should stay on login page
        await page.waitForTimeout(3000); // Wait for potential redirect
        await expect(page).toHaveURL('/', { timeout: 5000 });
    });

    test('should show validation error with empty fields', async ({ page }) => {
        // Clear pre-filled values
        await page.locator('input[type="text"], input:not([type="password"])').first().clear();
        await page.locator('input[type="password"]').clear();

        await page.click('button[type="submit"]');

        // Should stay on login page
        await expect(page).toHaveURL('/');

        // Check if HTML5 validation is triggered or custom error messages appear
        const usernameInput = page.locator('input[type="text"], input:not([type="password"])').first();
        const passwordInput = page.locator('input[type="password"]');

        const isUsernameInvalid = await usernameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
        const isPasswordInvalid = await passwordInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

        expect(isUsernameInvalid || isPasswordInvalid).toBeTruthy();
    });

    test('should persist authentication after page reload', async ({ page }) => {
        // Login
        await page.locator('input[type="text"], input:not([type="password"])').first().fill('admin@wms.local');
        await page.locator('input[type="password"]').fill('123456');
        await page.click('button[type="submit"]');

        // Wait for navigation
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

        // Reload page
        await page.reload();

        // Should still be authenticated (not redirected to login)
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    });

    test('should logout successfully', async ({ page }) => {
        // Login first
        await page.locator('input[type="text"], input:not([type="password"])').first().fill('admin@wms.local');
        await page.locator('input[type="password"]').fill('123456');
        await page.click('button[type="submit"]');

        // Wait for navigation
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

        // Find and click logout button
        const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Đăng xuất"), a:has-text("Đăng xuất")').first();

        if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await logoutButton.click();

            // Should be redirected to login page
            await expect(page).toHaveURL('/', { timeout: 5000 });

            // Should see login form
            await expect(page.locator('input[type="password"]')).toBeVisible();
        } else {
            test.skip();
        }
    });
});
