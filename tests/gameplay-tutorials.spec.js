const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const gameUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const expectedVideos = {
  fourFigure: 'four-figure-grid.webm',
  sixFigure: 'six-figure-grid.webm',
  distance: 'distance.webm',
  bearings: 'bearings.webm',
  gradient: 'gradient.webm'
};

test('each geography lesson exposes the matching lazy-loaded gameplay tutorial', async ({ page }) => {
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });

  for (const [lesson, file] of Object.entries(expectedVideos)) {
    await page.evaluate(key => { show('game'); showSkillPopup(key); }, lesson);
    const section = page.locator('.gameplay-tutorial');
    const video = section.locator('video');
    await expect(section.getByRole('heading', { name: 'Watch Gameplay Tutorial' })).toBeVisible();
    await expect(section.locator('.gameplay-tutorial-alt')).toContainText('Text alternative:');
    expect(await section.evaluate(element => element.previousElementSibling?.tagName)).toBe('P');
    await expect(video).not.toHaveAttribute('src', /.+/);
    await section.locator('.gameplay-tutorial-load').click();
    await expect(video).toHaveAttribute('controls', '');
    await expect(video).toHaveAttribute('preload', 'none');
    await expect(video).toHaveAttribute('src', new RegExp(`${file}$`));
    await expect(section.locator('.gameplay-tutorial-replay')).toBeVisible();
    await page.locator('#skillPopup').evaluate(element => element.classList.remove('show'));
  }
});

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 }
]) {
  test(`tutorial notes remain usable at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { show('game'); showSkillPopup('fourFigure'); });
    await expect(page.locator('.gameplay-tutorial-load')).toBeVisible();
    await page.locator('.gameplay-tutorial-load').click();
    await expect(page.locator('.gameplay-tutorial video')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
