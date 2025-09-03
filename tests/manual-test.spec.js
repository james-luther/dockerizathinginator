// tests/manual-test.spec.js
import { test, expect } from '@playwright/test';

test.describe('Manual Navigation Test', () => {
  test('should test navigation in running Wails app', async ({ page }) => {
    // Navigate to the running Wails app
    await page.goto('http://localhost:34115');
    
    // Wait for the page to load completely
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Give extra time for Wails to initialize
    
    console.log('Testing navigation in running Wails app...');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-initial-state.png', fullPage: true });
    
    // Test 1: Initial state - Connection pane should be visible
    await expect(page.locator('#connectionPane')).toBeVisible();
    await expect(page.locator('#containerPane')).toBeHidden();
    console.log('✅ Initial state: Connection pane visible');
    
    // Test 2: Navigate to Container pane
    await page.click('#containerButton');
    await page.waitForTimeout(500);
    
    // Take screenshot after navigation
    await page.screenshot({ path: 'test-after-container-click.png', fullPage: true });
    
    await expect(page.locator('#containerPane')).toBeVisible();
    await expect(page.locator('#connectionPane')).toBeHidden();
    console.log('✅ Navigation to Container pane successful');
    
    // Test 3: Navigate to Volume pane
    await page.click('#volumeButton');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#volumePane')).toBeVisible();
    await expect(page.locator('#containerPane')).toBeHidden();
    console.log('✅ Navigation to Volume pane successful');
    
    // Test 4: Navigate to Logging pane
    await page.click('#loggingButton');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#loggingPane')).toBeVisible();
    await expect(page.locator('#volumePane')).toBeHidden();
    console.log('✅ Navigation to Logging pane successful');
    
    // Test 5: Navigate to Backup pane
    await page.click('#backupButton');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#backupPane')).toBeVisible();
    await expect(page.locator('#loggingPane')).toBeHidden();
    console.log('✅ Navigation to Backup pane successful');
    
    // Test 6: Navigate to Summary pane
    await page.click('#summaryButton');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#summaryPane')).toBeVisible();
    await expect(page.locator('#backupPane')).toBeHidden();
    console.log('✅ Navigation to Summary pane successful');
    
    // Test 7: Navigate back to Connection pane
    await page.click('#connectionButton');
    await page.waitForTimeout(500);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-final-state.png', fullPage: true });
    
    await expect(page.locator('#connectionPane')).toBeVisible();
    await expect(page.locator('#summaryPane')).toBeHidden();
    console.log('✅ Navigation back to Connection pane successful');
    
    console.log('🎉 All navigation tests passed! The Wails app navigation is working perfectly.');
  });
});