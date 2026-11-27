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

async function openGame(page) {
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => show('game'));
}

async function openLesson(page, lesson = 'fourFigure') {
  await page.evaluate(key => showSkillPopup(key), lesson);
  const video = page.locator('.gameplay-tutorial video');
  await expect(video).toBeVisible();
  return video;
}

async function expectPlaying(video) {
  // Actual media progress verifies autoplay; attributes alone do not.
  await expect.poll(() => video.evaluate(element => !element.paused && element.currentTime > 0.05)).toBe(true);
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1280, height: 900, isMobile: false, hasTouch: false }
]) {
  test.describe(`gameplay tutorials at ${viewport.name} width`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch
    });

    test.beforeEach(async ({ page }) => {
      await page.route('https://**', route => route.abort());
    });

    test('each lesson starts its matching video automatically and fits the notes', async ({ page }) => {
      test.setTimeout(60_000);
      await openGame(page);
      let previousVideo;

      for (const [lesson, file] of Object.entries(expectedVideos)) {
        const video = await openLesson(page, lesson);
        const section = page.locator('.gameplay-tutorial');
        await expect(section.getByRole('heading', { name: /Watch Gameplay Tutorial/i })).toBeVisible();
        await expect(section.locator('.gameplay-tutorial-alt')).toContainText('Text alternative:');
        expect(await section.evaluate(element => element.previousElementSibling?.tagName)).toBe('P');
        await expect(section.locator('.gameplay-tutorial-load')).toHaveCount(0);
        await expect(video).toHaveAttribute('src', new RegExp(`${file}(?:\\?.*)?$`));
        await expect(video).toHaveAttribute('autoplay', '');
        await expect(video).toHaveAttribute('muted', '');
        await expect(video).toHaveAttribute('playsinline', '');
        await expect(video).toHaveAttribute('controls', '');
        await expect(video).toHaveAttribute('preload', 'metadata');
        // Letterbox space keeps paused native controls below the baked instructions.
        await expect(video).toHaveCSS('aspect-ratio', '4 / 3');
        await expect(video).toHaveCSS('object-position', '50% 0%');
        await expect(video).toHaveJSProperty('muted', true);
        await expectPlaying(video);
        await expect(section.locator('.gameplay-tutorial-play')).toBeHidden();
        await expect(section.locator('.gameplay-tutorial-replay')).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const box = await video.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        if (previousVideo) await expect.poll(() => previousVideo.evaluate(element => element.paused)).toBe(true);
        previousVideo = await video.elementHandle();
      }
    });

    test('replay restarts and resumes the real video', async ({ page }) => {
      await openGame(page);
      const video = await openLesson(page);
      await expectPlaying(video);
      await video.evaluate(element => { element.pause(); element.currentTime = 8; });
      await expect.poll(() => video.evaluate(element => element.currentTime)).toBeGreaterThan(7);
      await page.locator('.gameplay-tutorial-replay').click();
      await expectPlaying(video);
      const restartedAt = await video.evaluate(element => element.currentTime);
      expect(restartedAt).toBeLessThan(4);
      await expect.poll(() => video.evaluate(element => element.currentTime)).toBeGreaterThan(restartedAt + 0.05);
    });

    test('slide changes, lesson changes and leaving notes stop background playback', async ({ page }) => {
      test.setTimeout(60_000);
      await openGame(page);
      let video = await openLesson(page, 'distance');
      await expectPlaying(video);
      const firstVideo = await video.elementHandle();
      await page.locator('#nextSkillSlide').click();
      await expect.poll(() => firstVideo.evaluate(element => element.paused)).toBe(true);
      await expect(page.locator('.gameplay-tutorial video')).toHaveCount(0);

      await page.locator('#previousSkillSlide').click();
      video = page.locator('.gameplay-tutorial video');
      await expectPlaying(video);
      const secondVideo = await video.elementHandle();
      video = await openLesson(page, 'bearings');
      await expect.poll(() => secondVideo.evaluate(element => element.paused)).toBe(true);
      await expectPlaying(video);
      const replacementVideo = await video.elementHandle();

      // Invoke the actual Return Home handler; the open modal covers its background button.
      await page.evaluate(() => document.querySelector('#homeFromGame').click());
      await expect(page.locator('#landing')).toHaveClass(/active/);
      await expect(page.locator('#skillPopup')).not.toHaveClass(/show/);
      await expect.poll(() => replacementVideo.evaluate(element => element.paused)).toBe(true);

      await page.evaluate(() => show('game'));
      video = await openLesson(page);
      await expectPlaying(video);
      const closingVideo = await video.elementHandle();
      for (let step = 0; step < 8 && await page.locator('#skillPopup').isVisible(); step += 1) {
        await page.locator('#nextSkillSlide').click();
      }
      await expect(page.locator('#skillPopup')).not.toHaveClass(/show/);
      await expect.poll(() => closingVideo.evaluate(element => element.paused)).toBe(true);
    });

    test('a browser autoplay rejection exposes a working Play tutorial fallback', async ({ page }) => {
      await page.addInitScript(() => {
        const nativePlay = HTMLMediaElement.prototype.play;
        window.__allowTutorialPlayback = false;
        window.__tutorialPlaybackWasBlocked = false;
        HTMLMediaElement.prototype.play = function (...args) {
          if (!window.__allowTutorialPlayback) {
            this.pause();
            window.__tutorialPlaybackWasBlocked = true;
            return Promise.reject(new DOMException('Autoplay is blocked for this test.', 'NotAllowedError'));
          }
          return nativePlay.apply(this, args);
        };
      });
      await openGame(page);
      const video = await openLesson(page);
      const play = page.locator('.gameplay-tutorial-play');
      await expect(play).toBeVisible();
      expect(await page.evaluate(() => window.__tutorialPlaybackWasBlocked)).toBe(true);
      await expect(video).toHaveJSProperty('paused', true);
      await page.evaluate(() => { window.__allowTutorialPlayback = true; });
      await play.click();
      await expectPlaying(video);
      await expect(play).toBeHidden();
    });
  });
}
