const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const gameUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

async function dismissSkillPopup(page) {
  await page.waitForTimeout(150);
  const popup = page.locator('#skillPopup');
  while (await popup.isVisible()) {
    await page.locator('#nextSkillSlide').click();
  }
}

async function startCsecRound(page) {
  await page.route('https://**', (route) => route.abort());
  await page.goto(gameUrl);
  await page.evaluate(() => {
    localStorage.clear();
    const randomValues = [0.001, 0.001];
    let randomIndex = 0;
    Math.random = () => randomValues[randomIndex++] ?? 0.5;
  });
  await page.getByLabel('Student name').fill('Mobile Layout Student');
  await page.getByLabel('Class').fill('Test Class');
  await page.getByLabel(/CSEC/).check();
  await page.getByRole('button', { name: 'Start Adventure' }).click();
  await page.getByRole('button', { name: 'Begin Expedition' }).click();
  await dismissSkillPopup(page);
}

test.describe('phone round layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('keeps a CSEC topographic map and answer controls on screen', async ({ page }) => {
    await startCsecRound(page);
    await page.locator('#questionJump button').nth(9).click();
    await page.waitForTimeout(1_600);
    await dismissSkillPopup(page);
    await page.evaluate(() => scrollTo(0, 0));

    const layout = await page.evaluate(() => ({
      viewportHeight: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      map: document.querySelector('.map-card').getBoundingClientRect().toJSON(),
      answer: document.querySelector('#answerInput').getBoundingClientRect().toJSON(),
      submit: document.querySelector('#submitBtn').getBoundingClientRect().toJSON()
    }));

    expect(layout.scrollWidth).toBe(layout.clientWidth);
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.map.height).toBeGreaterThanOrEqual(285);
    expect(layout.answer.bottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.submit.bottom).toBeLessThanOrEqual(layout.viewportHeight);

    const image = page.locator('#topoImage');
    const initialTransform = await image.evaluate((element) => getComputedStyle(element).transform);
    await page.locator('#topoZoomIn').click();
    await expect.poll(() => image.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe(initialTransform);

    const stage = page.locator('#topoStage');
    await expect(stage).toHaveCSS('touch-action', 'none');
    const stageBox = await stage.boundingBox();
    await page.mouse.move(stageBox.x + stageBox.width * 0.65, stageBox.y + stageBox.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(stageBox.x + stageBox.width * 0.35, stageBox.y + stageBox.height * 0.35, { steps: 4 });
    await page.mouse.up();
    const pannedTransform = await image.evaluate((element) => getComputedStyle(element).transform);
    expect(pannedTransform).not.toBe(initialTransform);

    await page.locator('#answerInput').focus();
    await page.setViewportSize({ width: 390, height: 540 });
    await page.waitForTimeout(500);
    await expect.poll(() => page.locator('#submitBtn').evaluate((button) => button.getBoundingClientRect().bottom))
      .toBeLessThanOrEqual(540);
  });

  test('keeps map grid squares tappable', async ({ page }) => {
    await startCsecRound(page);
    await page.locator('#questionJump button').nth(3).click();
    await dismissSkillPopup(page);

    const firstSquare = page.locator('#gridHitGroup .grid-hit').first();
    await firstSquare.tap();
    await expect(firstSquare).toHaveClass(/selected/);
  });
});
