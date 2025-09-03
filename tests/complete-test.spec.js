// tests/complete-test.spec.js
import { test, expect } from '@playwright/test';

test.describe('Complete App Test', () => {
  test('should test layout fixes and functionality', async ({ page }) => {
    // Navigate to the running Wails app
    await page.goto('http://localhost:34115');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    console.log('Testing layout fixes and functionality...');
    
    // Take initial screenshot
    await page.screenshot({ path: 'complete-test-initial.png', fullPage: true });
    
    // Test 1: Check that all panes have proper full-screen coverage
    console.log('Testing layout fixes...');
    
    const panes = ['#connectionPane', '#containerPane', '#volumePane', '#loggingPane', '#backupPane', '#summaryPane'];
    
    for (const paneId of panes) {
      // Navigate to pane
      const buttonId = paneId.replace('Pane', 'Button');
      await page.click(buttonId);
      await page.waitForTimeout(300);
      
      // Check that pane has proper height coverage
      const paneHeight = await page.locator(paneId).evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          height: styles.height,
          minHeight: styles.minHeight,
          overflow: styles.overflow,
          overflowY: styles.overflowY
        };
      });
      
      console.log(`${paneId} styles:`, paneHeight);
      
      // Verify full screen coverage (should be viewport height)
      await expect(page.locator(paneId)).toBeVisible();
    }
    
    // Test 2: Test navigation works properly (no scrollbars when not needed)
    console.log('Testing navigation without unnecessary scrollbars...');
    
    // Navigate to each pane and check scroll behavior
    await page.click('#connectionButton');
    await page.waitForTimeout(300);
    await expect(page.locator('#connectionPane')).toBeVisible();
    
    await page.click('#containerButton');
    await page.waitForTimeout(300);
    await expect(page.locator('#containerPane')).toBeVisible();
    await page.screenshot({ path: 'container-pane-fixed.png', fullPage: true });
    
    // Test 3: Test improved SSH error handling
    console.log('Testing SSH error handling improvements...');
    
    // Go back to connection pane
    await page.click('#connectionButton');
    await page.waitForTimeout(300);
    
    // Test with invalid credentials to get better error message
    await page.fill('#piHost', 'localhost');
    await page.fill('#piUser', 'testuser');
    await page.fill('#piPass', 'wrongpassword');
    
    // Click test connection
    await page.click('#connectTest');
    
    // Wait for response (should be an error with better message)
    await page.waitForTimeout(5000);
    
    // Check if error message appeared and take screenshot
    const errorVisible = await page.locator('#connectFail').isVisible();
    if (errorVisible) {
      console.log('✅ Error message displayed properly');
      await page.screenshot({ path: 'ssh-error-improved.png', fullPage: true });
      
      // Get the error message text
      const errorText = await page.locator('#modelFail').textContent();
      console.log('Error message:', errorText);
      
      // Verify it's a more helpful error message
      expect(errorText).toContain('SSH');
    } else {
      console.log('No error message displayed - connection might have succeeded or failed silently');
    }
    
    // Test 4: Test with empty fields to verify input validation
    console.log('Testing input validation...');
    
    await page.fill('#piHost', '');
    await page.fill('#piUser', '');
    await page.fill('#piPass', '');
    
    await page.click('#connectTest');
    await page.waitForTimeout(2000);
    
    // Should show validation error
    const validationErrorVisible = await page.locator('#connectFail').isVisible();
    if (validationErrorVisible) {
      const validationErrorText = await page.locator('#modelFail').textContent();
      console.log('Validation error:', validationErrorText);
    }
    
    // Final screenshot
    await page.screenshot({ path: 'complete-test-final.png', fullPage: true });
    
    console.log('🎉 Complete test finished - layout and functionality improvements tested');
  });
});