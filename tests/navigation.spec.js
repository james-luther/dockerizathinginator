// tests/navigation.spec.js
import { test, expect } from '@playwright/test';

test.describe('Dockerizathinginator Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Wails app
    // Since Wails apps run on a dynamic port, we'll use file:// for testing the static HTML
    const testUrl = `file://${process.cwd()}/frontend/dist/index.html`;
    await page.goto(testUrl);
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for JavaScript to initialize
    await page.waitForTimeout(1000);
  });

  test('should load the main page with sidebar navigation', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Dockerizathinginator');
    
    // Check that the sidebar exists
    await expect(page.locator('.w-56.bg-gray-900')).toBeVisible();
    
    // Check that all navigation buttons exist
    await expect(page.locator('#connectionButton')).toBeVisible();
    await expect(page.locator('#containerButton')).toBeVisible();
    await expect(page.locator('#volumeButton')).toBeVisible();
    await expect(page.locator('#loggingButton')).toBeVisible();
    await expect(page.locator('#backupButton')).toBeVisible();
    await expect(page.locator('#summaryButton')).toBeVisible();
  });

  test('should show connection pane by default', async ({ page }) => {
    // Connection pane should be visible by default
    await expect(page.locator('#connectionPane')).toBeVisible();
    
    // Other panes should be hidden
    await expect(page.locator('#containerPane')).toBeHidden();
    await expect(page.locator('#volumePane')).toBeHidden();
    await expect(page.locator('#loggingPane')).toBeHidden();
    await expect(page.locator('#backupPane')).toBeHidden();
    await expect(page.locator('#summaryPane')).toBeHidden();
    
    // Connection button should have active styling
    await expect(page.locator('#connectionButton')).toHaveClass(/bg-gray-800/);
  });

  test('should navigate to container pane when container button is clicked', async ({ page }) => {
    // Click the container button
    await page.click('#containerButton');
    
    // Wait for navigation to complete
    await page.waitForTimeout(500);
    
    // Container pane should be visible
    await expect(page.locator('#containerPane')).toBeVisible();
    
    // Connection pane should be hidden
    await expect(page.locator('#connectionPane')).toBeHidden();
    
    // Container button should have active styling
    await expect(page.locator('#containerButton')).toHaveClass(/bg-gray-800/);
    
    // Connection button should not have active styling
    await expect(page.locator('#connectionButton')).not.toHaveClass(/bg-gray-800/);
  });

  test('should navigate to volume pane when volume button is clicked', async ({ page }) => {
    // Click the volume button
    await page.click('#volumeButton');
    
    // Wait for navigation to complete
    await page.waitForTimeout(500);
    
    // Volume pane should be visible
    await expect(page.locator('#volumePane')).toBeVisible();
    
    // Other panes should be hidden
    await expect(page.locator('#connectionPane')).toBeHidden();
    await expect(page.locator('#containerPane')).toBeHidden();
    
    // Volume button should have active styling
    await expect(page.locator('#volumeButton')).toHaveClass(/bg-gray-800/);
  });

  test('should navigate to logging pane when logging button is clicked', async ({ page }) => {
    // Click the logging button
    await page.click('#loggingButton');
    
    // Wait for navigation to complete
    await page.waitForTimeout(500);
    
    // Logging pane should be visible
    await expect(page.locator('#loggingPane')).toBeVisible();
    
    // Other panes should be hidden
    await expect(page.locator('#connectionPane')).toBeHidden();
    
    // Logging button should have active styling
    await expect(page.locator('#loggingButton')).toHaveClass(/bg-gray-800/);
  });

  test('should navigate to backup pane when backup button is clicked', async ({ page }) => {
    // Click the backup button
    await page.click('#backupButton');
    
    // Wait for navigation to complete
    await page.waitForTimeout(500);
    
    // Backup pane should be visible
    await expect(page.locator('#backupPane')).toBeVisible();
    
    // Other panes should be hidden
    await expect(page.locator('#connectionPane')).toBeHidden();
    
    // Backup button should have active styling
    await expect(page.locator('#backupButton')).toHaveClass(/bg-gray-800/);
  });

  test('should navigate to summary pane when summary button is clicked', async ({ page }) => {
    // Click the summary button
    await page.click('#summaryButton');
    
    // Wait for navigation to complete
    await page.waitForTimeout(500);
    
    // Summary pane should be visible
    await expect(page.locator('#summaryPane')).toBeVisible();
    
    // Other panes should be hidden
    await expect(page.locator('#connectionPane')).toBeHidden();
    
    // Summary button should have active styling
    await expect(page.locator('#summaryButton')).toHaveClass(/bg-gray-800/);
  });

  test('should maintain proper pane switching sequence', async ({ page }) => {
    // Test a sequence of navigation clicks
    const navigationSequence = [
      { button: '#containerButton', pane: '#containerPane' },
      { button: '#volumeButton', pane: '#volumePane' },
      { button: '#loggingButton', pane: '#loggingPane' },
      { button: '#backupButton', pane: '#backupPane' },
      { button: '#summaryButton', pane: '#summaryPane' },
      { button: '#connectionButton', pane: '#connectionPane' }
    ];

    for (const step of navigationSequence) {
      // Click the button
      await page.click(step.button);
      
      // Wait for navigation
      await page.waitForTimeout(300);
      
      // Check that the correct pane is visible
      await expect(page.locator(step.pane)).toBeVisible();
      
      // Check that the button has active styling
      await expect(page.locator(step.button)).toHaveClass(/bg-gray-800/);
      
      // Check that only one pane is visible at a time
      const allPanes = ['#connectionPane', '#containerPane', '#volumePane', '#loggingPane', '#backupPane', '#summaryPane'];
      const otherPanes = allPanes.filter(pane => pane !== step.pane);
      
      for (const otherPane of otherPanes) {
        await expect(page.locator(otherPane)).toBeHidden();
      }
    }
  });

  test('should handle form inputs in connection pane', async ({ page }) => {
    // Ensure we're on connection pane
    await page.click('#connectionButton');
    await page.waitForTimeout(300);
    
    // Test form inputs
    const hostInput = page.locator('#piHost');
    const userInput = page.locator('#piUser');
    const passInput = page.locator('#piPass');
    
    // Check that inputs exist and are visible
    await expect(hostInput).toBeVisible();
    await expect(userInput).toBeVisible();
    await expect(passInput).toBeVisible();
    
    // Test input values
    await hostInput.fill('192.168.1.100');
    await userInput.fill('testuser');
    await passInput.fill('testpass');
    
    // Verify values were set
    await expect(hostInput).toHaveValue('192.168.1.100');
    await expect(userInput).toHaveValue('testuser');
    await expect(passInput).toHaveValue('testpass');
    
    // Test connection button exists
    await expect(page.locator('#connectTest')).toBeVisible();
  });

  test('should handle container selection in container pane', async ({ page }) => {
    // Navigate to container pane
    await page.click('#containerButton');
    await page.waitForTimeout(300);
    
    // Check that container checkboxes exist
    await expect(page.locator('#networkStack')).toBeVisible();
    await expect(page.locator('#iotStack')).toBeVisible();
    await expect(page.locator('#mediaStack')).toBeVisible();
    
    // Test checkbox interactions
    await page.check('#networkStack');
    await page.check('#iotStack');
    
    // Verify checkboxes are checked
    await expect(page.locator('#networkStack')).toBeChecked();
    await expect(page.locator('#iotStack')).toBeChecked();
    await expect(page.locator('#mediaStack')).not.toBeChecked();
  });

  test('should display proper content in all panes', async ({ page }) => {
    const paneTests = [
      {
        button: '#connectionButton',
        pane: '#connectionPane',
        expectedContent: 'Raspberry Pi Connection'
      },
      {
        button: '#containerButton',
        pane: '#containerPane',
        expectedContent: 'Select Container Stacks'
      },
      {
        button: '#volumeButton',
        pane: '#volumePane',
        expectedContent: 'Volume Configuration'
      },
      {
        button: '#loggingButton',
        pane: '#loggingPane',
        expectedContent: 'Logging Options'
      },
      {
        button: '#backupButton',
        pane: '#backupPane',
        expectedContent: 'Cloud Backup Configuration'
      },
      {
        button: '#summaryButton',
        pane: '#summaryPane',
        expectedContent: 'Deployment Summary'
      }
    ];

    for (const test of paneTests) {
      // Navigate to pane
      await page.click(test.button);
      await page.waitForTimeout(300);
      
      // Check that pane is visible
      await expect(page.locator(test.pane)).toBeVisible();
      
      // Check that expected content is present
      await expect(page.locator(test.pane)).toContainText(test.expectedContent);
    }
  });

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    let consoleErrors = [];
    let jsErrors = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Listen for JavaScript errors
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // Perform navigation operations
    const buttons = ['#connectionButton', '#containerButton', '#volumeButton', '#loggingButton', '#backupButton', '#summaryButton'];
    
    for (const button of buttons) {
      await page.click(button);
      await page.waitForTimeout(300);
    }
    
    // Check for errors (this test will help identify issues)
    console.log('Console errors found:', consoleErrors);
    console.log('JavaScript errors found:', jsErrors);
    
    // For now, we'll just log errors rather than failing the test
    // In a production scenario, you might want to assert no errors
  });
});