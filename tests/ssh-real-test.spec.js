// tests/ssh-real-test.spec.js
import { test, expect } from '@playwright/test';

test.describe('Real SSH Connection Test', () => {
  test('should test SSH connection with real localhost credentials', async ({ page }) => {
    // Navigate to the running Wails app
    await page.goto('http://localhost:34115');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    console.log('Testing real SSH connection to localhost...');
    
    // Make sure we're on the connection pane
    await page.click('#connectionButton');
    await page.waitForTimeout(500);
    
    // Fill in the real SSH credentials
    await page.fill('#piHost', 'localhost');
    await page.fill('#piUser', 'jamis');
    
    // Note: We won't fill the password in the test for security reasons
    // But we'll test that the improved error handling works
    await page.fill('#piPass', '');
    
    console.log('Testing with empty password (should show validation error)...');
    
    // Click test connection with empty password
    await page.click('#connectTest');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check that our validation catches empty password
    const emptyPasswordError = await page.locator('#connectFail').isVisible();
    if (emptyPasswordError) {
      const errorText = await page.locator('#modelFail').textContent();
      console.log('Empty password error:', errorText);
    }
    
    // Now test with a placeholder password to see the improved SSH error
    console.log('Testing with placeholder password to see SSH error handling...');
    await page.fill('#piPass', 'testpassword123');
    
    // Click test connection
    await page.click('#connectTest');
    
    // Wait for the improved error message
    await page.waitForTimeout(5000);
    
    // Take screenshot of the improved error handling
    await page.screenshot({ path: 'ssh-localhost-test.png', fullPage: true });
    
    const errorVisible = await page.locator('#connectFail').isVisible();
    const successVisible = await page.locator('#connectSuccess').isVisible();
    
    if (errorVisible) {
      const errorText = await page.locator('#modelFail').textContent();
      console.log('SSH Error Message:', errorText);
      
      // Check if our improved error message provides helpful guidance
      if (errorText.includes('authentication failed') || errorText.includes('SSH')) {
        console.log('✅ Improved SSH error message is working');
      }
    } else if (successVisible) {
      const successText = await page.locator('#modelSuccess').textContent();
      console.log('SSH Success Message:', successText);
      console.log('✅ SSH connection succeeded!');
    } else {
      console.log('❓ No error or success message shown');
    }
    
    console.log('Real SSH test completed - check screenshot for visual confirmation');
  });
});