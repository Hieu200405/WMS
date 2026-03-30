import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup runs once before all tests
 * This ensures the database is seeded and ready
 */
async function globalSetup(config: FullConfig) {
    console.log('🌱 Global Setup: Starting...');

    const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
    const apiURL = baseURL.replace('5173', '4005'); // Backend port

    // Wait for backend to be ready
    console.log('⏳ Waiting for backend to be ready...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    let retries = 30;
    let backendReady = false;

    while (retries > 0 && !backendReady) {
        try {
            const response = await page.goto(`${apiURL}/health`, {
                timeout: 5000,
                waitUntil: 'domcontentloaded'
            });
            if (response && response.ok()) {
                backendReady = true;
                console.log('✅ Backend is ready!');
            }
        } catch (e) {
            retries--;
            if (retries > 0) {
                console.log(`⏳ Backend not ready, retrying... (${retries} attempts left)`);
                await page.waitForTimeout(2000);
            }
        }
    }

    if (!backendReady) {
        console.error('❌ Backend failed to start');
        await browser.close();
        throw new Error('Backend is not ready');
    }

    // Verify database has users (check if seed ran)
    console.log('🔍 Verifying database is seeded...');
    try {
        // Try to login with admin credentials to verify users exist
        const loginResponse = await page.request.post(`${apiURL}/api/v1/auth/login`, {
            data: {
                email: 'admin@wms.local',
                password: '123456'
            }
        });

        if (loginResponse.ok()) {
            console.log('✅ Database is seeded and ready!');
        } else {
            console.warn('⚠️  Admin login failed, database might not be seeded properly');
            const body = await loginResponse.text();
            console.log('Response:', body);
        }
    } catch (e) {
        console.error('❌ Failed to verify database:', e);
    }

    await browser.close();
    console.log('✅ Global Setup: Complete!\n');
}

export default globalSetup;
