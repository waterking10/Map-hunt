const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');
const { MAP_NAMES, SHEETS, expectedAnswer } = require('./fixtures/map-hunt-cases');

const gameUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

async function dismissSkillPopup(page) {
  await page.waitForTimeout(100);
  const popup = page.locator('#skillPopup');
  while (await popup.isVisible()) {
    await page.locator('#nextSkillSlide').click();
  }
}

async function startPlaythrough(page, { level, mapId, sheetId }) {
  await page.route('https://**', (route) => route.abort());
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ selectedMap, selectedSheet }) => {
      localStorage.clear();
      const randomValues = [(selectedMap + 0.01) / 6, (selectedSheet + 0.01) / 4];
      let randomIndex = 0;
      Math.random = () => randomValues[randomIndex++] ?? 0.5;
    },
    { selectedMap: mapId, selectedSheet: sheetId }
  );

  await page.getByLabel('Student name').fill('Regression Student');
  await page.getByLabel('Class').fill('Test Class');
  if (level === 'csec') {
    await page.getByLabel(/CSEC/).check();
  }
  await page.getByRole('button', { name: 'Start Adventure' }).click();
  await page.getByRole('button', { name: 'Begin Expedition' }).click();
  await expect(page.locator('#adventureName')).toHaveText(`Adventure: ${MAP_NAMES[mapId]}`);
  await dismissSkillPopup(page);
}

async function chooseAnswer(page, answer) {
  const choices = page.locator('.choice');
  if ((await choices.count()) > 0) {
    await page.getByRole('button', { name: answer, exact: true }).click();
  } else {
    await page.locator('#answerInput').fill(answer);
  }
}

async function chooseIncorrectAnswer(page, correctAnswer) {
  const choices = page.locator('.choice');
  if ((await choices.count()) > 0) {
    const count = await choices.count();
    for (let index = 0; index < count; index += 1) {
      const choice = choices.nth(index);
      if ((await choice.textContent()) !== correctAnswer) {
        await choice.click();
        return;
      }
    }
    throw new Error('No incorrect multiple-choice answer was available');
  }

  const input = page.locator('#answerInput');
  const tagName = await input.evaluate((element) => element.tagName);
  await input.fill(tagName === 'TEXTAREA' ? 'The map is interesting.' : '999999');
}

async function completeEveryQuestion(page, scenario) {
  const expectedCount = scenario.level === 'third' ? 12 : 11;
  await expect(page.locator('#questionJump button')).toHaveCount(expectedCount);

  const testedPrompts = [];
  for (let questionIndex = 0; questionIndex < expectedCount; questionIndex += 1) {
    await dismissSkillPopup(page);
    const prompt = await page.locator('#question').textContent();
    const answer = expectedAnswer({
      prompt,
      mapId: scenario.mapId,
      sheetId: scenario.sheetId
    });
    testedPrompts.push(prompt);

    if (prompt.startsWith('Study the original') || prompt.includes('river valley') || prompt.startsWith('Using map evidence') || prompt.startsWith('Using evidence from the map')) {
      await expect(page.locator('#topoLabel')).toContainText(SHEETS[scenario.sheetId].name);
      await expect(page.locator('#topoMapWrap')).toHaveClass(/show/);
      await expect(page.locator('#topoImage')).toHaveJSProperty('complete', true);
      await expect
        .poll(() => page.locator('#topoImage').evaluate((image) => image.naturalWidth))
        .toBeGreaterThan(0);
    }

    const scoreBefore = questionIndex * 80;
    await expect(page.locator('#xp')).toHaveText(String(scoreBefore));
    await expect(page.locator('#gold')).toHaveText(String(scoreBefore));

    await chooseIncorrectAnswer(page, answer);
    await page.getByRole('button', { name: 'Submit Answer' }).click();
    await expect(page.locator('#feedback')).toHaveClass(/bad/);
    await expect(page.locator('#xp')).toHaveText(String(scoreBefore));
    await expect(page.locator('#gold')).toHaveText(String(scoreBefore));

    await chooseAnswer(page, answer);
    await page.getByRole('button', { name: 'Submit Answer' }).click();
    await expect(page.locator('#feedback')).toHaveClass(/good/);
    await expect(page.locator('#xp')).toHaveText(String(scoreBefore + 80));
    await expect(page.locator('#gold')).toHaveText(String(scoreBefore + 80));

    await page.locator('#nextQuestion').click();
  }

  await expect(page.locator('#results')).toHaveClass(/active/);
  await expect(page.locator('#finalScore')).toHaveText(`${expectedCount}/${expectedCount}`);
  await expect(page.locator('#accuracy')).toHaveText('100%');
  await expect(page.locator('#finalXp')).toHaveText(String(expectedCount * 80));
  await expect(page.locator('#finalGold')).toHaveText(String(expectedCount * 80));
  return testedPrompts;
}

for (const [mapId, mapName] of MAP_NAMES.entries()) {
  test(`Third Form completes every question on ${mapName}`, async ({ page }) => {
    test.setTimeout(120_000);
    const scenario = { level: 'third', mapId, sheetId: 0 };
    await startPlaythrough(page, scenario);
    const prompts = await completeEveryQuestion(page, scenario);
    console.log(`[coverage] Third Form | ${mapName} | ${prompts.length}/12 questions`);
  });
}

for (const [mapId, mapName] of MAP_NAMES.entries()) {
  const sheetId = mapId % SHEETS.length;
  test(`CSEC completes every question on ${mapName} with ${SHEETS[sheetId].name}`, async ({ page }) => {
    test.setTimeout(120_000);
    const scenario = { level: 'csec', mapId, sheetId };
    await startPlaythrough(page, scenario);
    const prompts = await completeEveryQuestion(page, scenario);
    console.log(
      `[coverage] CSEC | ${mapName} | ${SHEETS[sheetId].name} | ${prompts.length}/11 questions`
    );
  });
}

test('Three-island challenge records three different completed maps', async ({ page }) => {
  test.setTimeout(180_000);
  await startPlaythrough(page, { level: 'third', mapId: 0, sheetId: 0 });
  const completedMaps = new Set();

  for (let run = 0; run < 3; run += 1) {
    const adventureLabel = await page.locator('#adventureName').textContent();
    const mapName = adventureLabel.replace('Adventure: ', '');
    const mapId = MAP_NAMES.indexOf(mapName);
    expect(mapId).toBeGreaterThanOrEqual(0);
    expect(completedMaps.has(mapName)).toBe(false);
    completedMaps.add(mapName);

    await completeEveryQuestion(page, { level: 'third', mapId, sheetId: 0 });
    await expect(page.locator('#challengeSummary')).toContainText(
      `Three-Island Challenge — ${run + 1}/3 maps completed`
    );

    if (run < 2) {
      await page.getByRole('button', { name: 'Choose New Map' }).click();
      await page.getByRole('button', { name: 'Begin Expedition' }).click();
      await dismissSkillPopup(page);
    }
  }

  await expect(page.locator('#challengeSummary')).toContainText('Bonus marks: 3/3');
  await expect(page.locator('#replayBtn')).toBeHidden();
  console.log(`[coverage] Three-Island Challenge | ${completedMaps.size}/3 distinct maps`);
});
