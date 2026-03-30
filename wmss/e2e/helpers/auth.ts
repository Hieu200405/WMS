import { Page, expect } from '@playwright/test';

/**
 * Login as Admin user
 */
export async function loginAsAdmin(page: Page) {
    await page.goto('/');
    await page.locator('input[type="text"], input:not([type="password"])').first().fill('admin@wms.local');
    await page.locator('input[type="password"]').fill('123456');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

/**
 * Login as Manager user
 */
export async function loginAsManager(page: Page) {
    await page.goto('/');
    await page.locator('input[type="text"], input:not([type="password"])').first().fill('manager1@wms.local');
    await page.locator('input[type="password"]').fill('123456');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

/**
 * Login as Staff user
 */
export async function loginAsStaff(page: Page) {
    await page.goto('/');
    await page.locator('input[type="text"], input:not([type="password"])').first().fill('staff1@wms.local');
    await page.locator('input[type="password"]').fill('123456');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
    // Look for logout button/link (adjust selector based on actual UI)
    await page.click('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');
    await page.waitForURL('/');
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
    return page.waitForResponse(response =>
        (typeof urlPattern === 'string' ? response.url().includes(urlPattern) : urlPattern.test(response.url())) &&
        response.status() === 200
    );
}

/**
 * Fill form field by label
 */
export async function fillFieldByLabel(page: Page, label: string, value: string) {
    const field = page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select');
    await field.fill(value);
}

/**
 * Select option by label
 */
export async function selectOptionByLabel(page: Page, fieldLabel: string, optionLabel: string) {
    const field = page.locator(`label:has-text("${fieldLabel}")`).locator('..').locator('select');
    await field.selectOption({ label: optionLabel });
}

/**
 * Click button by text
 */
export async function clickButton(page: Page, buttonText: string) {
    await page.click(`button:has-text("${buttonText}"), input[type="submit"][value="${buttonText}"]`);
}

/**
 * Wait for toast/notification message
 */
export async function waitForToast(page: Page, message?: string) {
    if (message) {
        await expect(page.locator('.toast, .notification, [role="alert"]').filter({ hasText: message })).toBeVisible();
    } else {
        await expect(page.locator('.toast, .notification, [role="alert"]').first()).toBeVisible();
    }
}

/**
 * Navigate to a page via sidebar/menu
 */
export async function navigateTo(page: Page, menuItem: string) {
    await page.click(`nav a:has-text("${menuItem}"), aside a:has-text("${menuItem}"), [data-testid="nav-${menuItem.toLowerCase()}"]`);
}
