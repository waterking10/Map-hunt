const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

test('submits a guess and shows the expected result', async ({ page }) => {
  const gameUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

  await page.goto(gameUrl);
  await page.getByLabel('Student name').fill('Test Student');
  await page.getByLabel('Class').fill('Test Class');
  await page.getByRole('button', { name: 'Start Adventure' }).click();
  await page.getByRole('button', { name: 'Begin Expedition' }).click();

  const skillPopup = page.locator('#skillPopup');
  await expect(skillPopup).toBeVisible();
  while (await skillPopup.isVisible()) {
    await page.locator('#nextSkillSlide').click();
  }

  await page.locator('#answerInput').fill('9999');
  await page.getByRole('button', { name: 'Submit Answer' }).click();

  await expect(page.locator('#feedback')).toHaveText(
    'Not quite. Check the map and try again.'
  );
});
