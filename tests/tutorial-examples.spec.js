const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');
const { installTrainingExample } = require('../scripts/tutorial-training');
const { showTrainingMarkerInZoom } = require('../scripts/generate-gameplay-tutorials');

const gameUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

function gridReference(point, precise) {
  const across = (point.x - 90) / 80, up = (610 - point.y) / 67.5;
  const easting = 30 + Math.floor(across), northing = 22 + Math.floor(up);
  return precise ? `${easting}${Math.floor((across % 1) * 10)}${northing}${Math.floor((up % 1) * 10)}` : `${easting}${northing}`;
}

function sixFigureOverlap(a, b) {
  return a.length === 6 && b.length === 6 && a.slice(0, 2) === b.slice(0, 2)
    && a.slice(3, 5) === b.slice(3, 5) && Math.abs(Number(a[2]) - Number(b[2])) <= 1
    && Math.abs(Number(a[5]) - Number(b[5])) <= 1;
}

for (const type of ['number', 'six', 'distance', 'bearing', 'gradient']) {
  test(`${type} practice example is accurate, accepted and separate from every scored question`, async ({ page }) => {
    await page.route('https://**', route => route.abort());
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
    const example = await page.evaluate(installTrainingExample, type);
    const catalog = example.scoredCatalog;
    // Independently inspect coverage and collisions; do not trust the fixture's
    // precomputed collisions array.
    expect(catalog).toHaveLength(134);
    for (let mapId = 0; mapId < 6; mapId++) {
      expect(catalog.filter(q => q.mapId === mapId && q.level === 'third')).toHaveLength(12);
      expect(catalog.filter(q => q.mapId === mapId && q.level === 'csec')).toHaveLength(9);
    }
    expect([...new Set(catalog.filter(q => q.level === 'topographic').map(q => q.mapId))].sort()).toEqual([0, 1, 2, 3]);
    expect(catalog.some(q => q.prompt === example.prompt)).toBe(false);
    for (const point of example.trainingPoints) {
      for (const scored of catalog) {
        for (const marker of scored.points || []) expect(Math.hypot(point.x - marker.x, point.y - marker.y)).toBeGreaterThan(0.01);
      }
    }
    const value = Number(example.answer.replace(/^1:/, ''));
    for (const scored of catalog) {
      if (['number', 'topo-grid'].includes(scored.type)) expect([scored.answer, ...scored.answers].map(String)).not.toContain(example.answer);
      if (scored.type !== type) continue;
      if (type === 'six') expect(sixFigureOverlap(example.answer, String(scored.answer))).toBe(false);
      else if (type === 'distance') expect(Math.abs(value - Number(scored.answer))).toBeGreaterThan(0.100001);
      else if (type === 'bearing') {
        const difference = Math.abs(value - Number(scored.answer));
        expect(Math.min(difference, 360 - difference)).toBeGreaterThan(5);
      } else if (type === 'gradient') expect(Math.abs(value - Number(scored.answer))).toBeGreaterThan(100 / scored.verticalInterval + 0.000001);
      else expect(example.answer).not.toBe(String(scored.answer));
    }
    if (['number', 'six'].includes(type)) expect(example.answer).toBe(gridReference(example.point, type === 'six'));
    else {
      const { a, b } = example.pair;
      const centimetres = Math.hypot(a.x - b.x, a.y - b.y) / 80;
      if (type === 'distance') expect(value).toBeCloseTo(centimetres * 0.5, 2);
      if (type === 'gradient') expect(value).toBeCloseTo(centimetres * 500 / Math.abs(example.pair.elevationA - example.pair.elevationB), 6);
      if (type === 'bearing') expect(value).toBe(Math.round((Math.atan2(b.x - a.x, a.y - b.y) * 180 / Math.PI + 360) % 360));
    }
    if (type === 'six') {
      await page.locator(`.grid-hit[data-square="${example.four}"]`).click();
      await expect(page.locator('#zoomOverlay')).toHaveClass(/show/);
      await showTrainingMarkerInZoom(page);
      await expect(page.locator('#expandedTrainingMarker')).toBeVisible();
      await page.locator('#closeZoom').click();
    }
    await page.locator('#answerInput').fill(example.answer);
    await page.locator('#submitBtn').click();
    await expect(page.locator('#feedback')).toHaveClass(/good/);
    expect(await page.evaluate(() => challenge.runs.length)).toBe(0);
    await expect(page.locator('#level')).toHaveText('Practice example — not scored');
  });
}
