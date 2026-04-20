const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log(msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:5173/dashboard');
  await page.click('#btn-deactivate-crisis'); // wait, the demo mode button is next to it, not this one.
  // The demo mode button has onClick={() => setDemoModeEnabled(true)} and text "Demo Mode"
  await page.click('text=Demo Mode');
  await page.waitForTimeout(2000);
  await browser.close();
})();
