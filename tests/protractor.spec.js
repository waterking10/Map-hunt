const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const gameUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

async function openBearing(page, { positionTool = true } = {}) {
  await page.route('https://**', route => route.abort());
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(placeTool => {
    learningLevel = 'third';
    startNewExpedition(0);
    shownSkills = new Set(['fourFigure', 'sixFigure', 'distance', 'gradient', 'bearings']);
    index = questions.findIndex(question => question.type === 'bearing');
    show('game');
    render();
    // A student can place the tool anywhere; keep every quadrant in view in this fixture.
    if (placeTool) {
      document.querySelector('#protractor').style.left = '20px';
      document.querySelector('#protractor').style.top = '80px';
    }
  }, positionTool);
  await page.locator('#protractor').scrollIntoViewIfNeeded();
  await expect(page.locator('#protractor')).toBeVisible();
}

async function pointAt(page, bearing, radius = 150) {
  return page.locator('#protractor svg').evaluate((svg, { degrees, distance }) => {
    const radians = (degrees - 90) * Math.PI / 180;
    const point = new DOMPoint(180 + distance * Math.cos(radians), 180 + distance * Math.sin(radians));
    const screenPoint = point.matrixTransform(svg.getScreenCTM());
    return { x: screenPoint.x, y: screenPoint.y };
  }, { degrees: bearing, distance: radius });
}

async function expectBearing(page, angle) {
  await expect(page.locator('#angleSlider')).toHaveValue(String(angle));
  await expect(page.locator('#angleSlider')).toHaveAttribute('aria-valuetext', `${String(angle).padStart(3, '0')} degrees`);
  const actual = await page.locator('#bearingNeedle').evaluate(needle => {
    const dx = Number(needle.getAttribute('x2')) - Number(needle.getAttribute('x1'));
    const dy = Number(needle.getAttribute('y2')) - Number(needle.getAttribute('y1'));
    return { angle: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, length: Math.hypot(dx, dy) };
  });
  // Compare circularly so 000° is equivalent to 360° at floating-point precision.
  expect(Math.min(Math.abs(actual.angle - angle), 360 - Math.abs(actual.angle - angle))).toBeLessThan(0.01);
  expect(actual.length).toBeCloseTo(170, 5);
  for (const attribute of ['x2', 'y2']) {
    expect(await page.locator('#bearingNeedleHit').getAttribute(attribute)).toBe(await page.locator('#bearingNeedle').getAttribute(attribute));
  }
}

async function startMouseRotation(page, bearing, radius = 150) {
  const point = await pointAt(page, bearing, radius);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 390, height: 844 }
]) {
  test.describe(`protractor at ${viewport.name} width`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('dragging the ray measures clockwise through all quadrants without moving the tool', async ({ page }) => {
      await openBearing(page);
      const before = await page.locator('#protractor').boundingBox();
      await startMouseRotation(page, 0);
      for (const angle of [45, 90, 131, 180, 225, 270, 315, 359, 0, 1, 359]) {
        const point = await pointAt(page, angle);
        await page.mouse.move(point.x, point.y, { steps: 4 });
        await expectBearing(page, angle);
      }
      await page.mouse.up();
      expect(await page.locator('#protractor').boundingBox()).toEqual(before);
      const releasedPoint = await pointAt(page, 90);
      await page.mouse.move(releasedPoint.x, releasedPoint.y);
      await expectBearing(page, 359);
      expect(await page.locator('#protractor').boundingBox()).toEqual(before);
    });

    test('the endpoint handle rotates the ray and the body still moves independently', async ({ page }) => {
      await openBearing(page);
      await startMouseRotation(page, 0, 170);
      const east = await pointAt(page, 90, 170);
      await page.mouse.move(east.x, east.y, { steps: 8 });
      await page.mouse.up();
      await expectBearing(page, 90);

      const before = await page.locator('#protractor').boundingBox();
      const body = await pointAt(page, 180, 0);
      await page.mouse.move(body.x, body.y);
      await page.mouse.down();
      await page.mouse.move(body.x + 18, body.y + 24, { steps: 6 });
      await page.mouse.up();
      const after = await page.locator('#protractor').boundingBox();
      expect(after.x - before.x).toBeGreaterThan(10);
      expect(after.y - before.y).toBeGreaterThan(15);
      await expectBearing(page, 90);

      await startMouseRotation(page, 90);
      const south = await pointAt(page, 180);
      await page.mouse.move(south.x, south.y, { steps: 8 });
      await page.mouse.up();
      await expectBearing(page, 180);
      expect(await page.locator('#protractor').boundingBox()).toEqual(after);
      await expect(page.locator('#protractor')).not.toHaveClass(/dragging/);
    });

    test('the slider remains usable with the keyboard and stays synchronized with dragging', async ({ page }) => {
      await openBearing(page);
      await page.locator('#angleSlider').fill('222');
      await expectBearing(page, 222);
      await page.locator('#angleSlider').focus();
      await page.keyboard.press('ArrowRight');
      await expectBearing(page, 223);
      await page.keyboard.press('ArrowLeft');
      await expectBearing(page, 222);
      await page.locator('#protractor').scrollIntoViewIfNeeded();
      await startMouseRotation(page, 222);
      const north = await pointAt(page, 0);
      await page.mouse.move(north.x, north.y, { steps: 8 });
      await page.mouse.up();
      await expectBearing(page, 0);
    });

    test('a cancelled ray gesture releases rotation and allows a fresh drag', async ({ page }) => {
      await openBearing(page);
      await startMouseRotation(page, 0);
      const east = await pointAt(page, 90);
      await page.mouse.move(east.x, east.y, { steps: 8 });
      await expectBearing(page, 90);
      await page.locator('#protractor').evaluate(protractor => {
        protractor.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }));
      });
      const south = await pointAt(page, 180);
      await page.mouse.move(south.x, south.y);
      await expectBearing(page, 90);
      await page.mouse.up();
      await expect(page.locator('#protractor')).not.toHaveClass(/dragging|rotating/);
      await startMouseRotation(page, 90);
      await page.mouse.move(south.x, south.y, { steps: 8 });
      await page.mouse.up();
      await expectBearing(page, 180);
    });
  });
}

test.describe('touch protractor on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the default protractor placement keeps the ray and handle reachable', async ({ page }) => {
    await openBearing(page, { positionTool: false });
    const box = await page.locator('#protractor').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const angle of [0, 90, 180, 270]) {
      await page.locator('#angleSlider').fill(String(angle));
      await page.locator('#protractor').scrollIntoViewIfNeeded();
      const handle = await page.locator('#bearingHandle').boundingBox();
      expect(handle.x).toBeGreaterThanOrEqual(0);
      expect(handle.x + handle.width).toBeLessThanOrEqual(390);
    }
  });

  test('a touch drag rotates the ray without scrolling and touch cancellation stops it', async ({ page, context }) => {
    await openBearing(page);
    const client = await context.newCDPSession(page);
    const before = await page.locator('#protractor').boundingBox();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const north = await pointAt(page, 0);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...north, id: 0 }] });
    for (const angle of [45, 90, 135, 180, 225, 270, 359, 0]) {
      const point = await pointAt(page, angle);
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 0 }] });
      await expectBearing(page, angle);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    expect(await page.locator('#protractor').boundingBox()).toEqual(before);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    await expect(page.locator('#protractor')).not.toHaveClass(/dragging|rotating/);

    const start = await pointAt(page, 0, 170);
    const east = await pointAt(page, 90, 170);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...east, id: 1 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expectBearing(page, 90);
    expect(await page.locator('#protractor').boundingBox()).toEqual(before);
    await client.detach();
  });
});
