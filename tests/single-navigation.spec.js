// tests/single-navigation.spec.js
import { test, expect } from '@playwright/test';

test.describe('Single Navigation Test', () => {
  test('should test single navigation step', async ({ page }) => {
    // Navigate to the Wails app running locally
    await page.goto('http://localhost:34115');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Allow more time for Wails to initialize
    
    // Check initial state
    console.log('Checking initial state...');
    await expect(page.locator('#connectionPane')).toBeVisible();
    
    // Test navigation to container pane
    console.log('Clicking container button...');
    await page.click('#containerButton');
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Check if container pane is now visible
    console.log('Checking if container pane is visible...');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-navigation.png', fullPage: true });
    
    // Check computed styles
    const containerPane = page.locator('#containerPane');
    const displayStyle = await containerPane.evaluate(el => window.getComputedStyle(el).display);
    console.log('Container pane display style:', displayStyle);
    
    const visibility = await containerPane.evaluate(el => window.getComputedStyle(el).visibility);
    console.log('Container pane visibility:', visibility);
    
    // Test if pane is visible
    await expect(containerPane).toBeVisible();
  });
});