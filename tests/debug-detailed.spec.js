// tests/debug-detailed.spec.js
import { test, expect } from '@playwright/test';

test.describe('Detailed Debug Test', () => {
  test('should debug navigation step by step', async ({ page }) => {
    // Listen for all console messages
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', error => console.log('ERROR:', error.message));
    
    // Navigate to the Wails app
    await page.goto('http://localhost:34115');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Check if the JavaScript has loaded
    const jsLoaded = await page.evaluate(() => {
      return typeof window.showPane === 'function';
    });
    console.log('JavaScript showPane function loaded:', jsLoaded);
    
    // Check if event handlers are bound
    const containerButton = page.locator('#containerButton');
    const hasClickHandler = await containerButton.evaluate(el => {
      return el.onclick !== null || el.addEventListener !== undefined;
    });
    console.log('Container button has click handler:', hasClickHandler);
    
    // Check initial pane states
    const initialStates = await page.evaluate(() => {
      const panes = ['#connectionPane', '#containerPane', '#volumePane', '#loggingPane', '#backupPane', '#summaryPane'];
      return panes.map(id => {
        const el = document.querySelector(id);
        return {
          id,
          exists: !!el,
          display: el ? window.getComputedStyle(el).display : 'not found',
          visibility: el ? window.getComputedStyle(el).visibility : 'not found'
        };
      });
    });
    console.log('Initial pane states:', initialStates);
    
    // Manually trigger the showPane function
    console.log('Manually calling showPane...');
    const manualResult = await page.evaluate(() => {
      if (typeof window.showPane === 'function') {
        try {
          window.showPane('#containerPane', '#containerButton');
          return 'showPane called successfully';
        } catch (error) {
          return 'Error calling showPane: ' + error.message;
        }
      } else {
        return 'showPane function not found';
      }
    });
    console.log('Manual showPane result:', manualResult);
    
    // Check pane states after manual call
    const afterManualStates = await page.evaluate(() => {
      const panes = ['#connectionPane', '#containerPane'];
      return panes.map(id => {
        const el = document.querySelector(id);
        return {
          id,
          display: el ? window.getComputedStyle(el).display : 'not found',
          visibility: el ? window.getComputedStyle(el).visibility : 'not found',
          style: el ? el.style.display : 'not found'
        };
      });
    });
    console.log('States after manual call:', afterManualStates);
    
    // Now try the click
    console.log('Clicking container button...');
    await page.click('#containerButton');
    await page.waitForTimeout(1000);
    
    // Check final states
    const finalStates = await page.evaluate(() => {
      const panes = ['#connectionPane', '#containerPane'];
      return panes.map(id => {
        const el = document.querySelector(id);
        return {
          id,
          display: el ? window.getComputedStyle(el).display : 'not found',
          visibility: el ? window.getComputedStyle(el).visibility : 'not found',
          style: el ? el.style.display : 'not found'
        };
      });
    });
    console.log('Final states after click:', finalStates);
  });
});