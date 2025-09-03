// tests/test-navigation.spec.js
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Simple Navigation Test', () => {
  test('should test navigation with simplified HTML', async ({ page }) => {
    // Use the simplified test HTML file
    const testUrl = `file://${join(__dirname, '..', 'test-navigation.html')}`;
    await page.goto(testUrl);
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // Check that the page loaded
    await expect(page.locator('h2')).toContainText('Navigation Test');
    
    // Test initial state
    await expect(page.locator('#pane1')).toBeVisible();
    await expect(page.locator('#pane2')).toBeHidden();
    await expect(page.locator('#pane3')).toBeHidden();
    await expect(page.locator('#btn1')).toHaveClass(/active/);
    
    // Test navigation to pane 2
    await page.click('#btn2');
    await page.waitForTimeout(200);
    
    await expect(page.locator('#pane1')).toBeHidden();
    await expect(page.locator('#pane2')).toBeVisible();
    await expect(page.locator('#pane3')).toBeHidden();
    await expect(page.locator('#btn2')).toHaveClass(/active/);
    await expect(page.locator('#btn1')).not.toHaveClass(/active/);
    
    // Test navigation to pane 3
    await page.click('#btn3');
    await page.waitForTimeout(200);
    
    await expect(page.locator('#pane1')).toBeHidden();
    await expect(page.locator('#pane2')).toBeHidden();
    await expect(page.locator('#pane3')).toBeVisible();
    await expect(page.locator('#btn3')).toHaveClass(/active/);
    await expect(page.locator('#btn2')).not.toHaveClass(/active/);
    
    // Test navigation back to pane 1
    await page.click('#btn1');
    await page.waitForTimeout(200);
    
    await expect(page.locator('#pane1')).toBeVisible();
    await expect(page.locator('#pane2')).toBeHidden();
    await expect(page.locator('#pane3')).toBeHidden();
    await expect(page.locator('#btn1')).toHaveClass(/active/);
    await expect(page.locator('#btn3')).not.toHaveClass(/active/);
  });
});